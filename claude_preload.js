const { ipcRenderer } = require('electron');

// Log helper
const log = (msg) => ipcRenderer.send('log-debug', `[Claude] ${msg}`);

// Helper to find element piercing Shadow DOM
const deepQuerySelector = (selector, root = document) => {
    let result = null;
    const found = root.querySelector(selector);
    if (found) return found;
    const walkers = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
    let node;
    while(node = walkers.nextNode()) {
        if (node.shadowRoot) {
            const foundInShadow = deepQuerySelector(selector, node.shadowRoot);
            if (foundInShadow) return foundInShadow;
        }
    }
    return null;
};

const deepQuerySelectorAll = (selector, root = document) => {
    let results = [];
    const found = root.querySelectorAll(selector);
    if (found.length > 0) results = [...results, ...Array.from(found)];
    const walkers = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
    let node;
    while(node = walkers.nextNode()) {
        if (node.shadowRoot) {
            const foundInShadow = deepQuerySelectorAll(selector, node.shadowRoot);
            results = [...results, ...foundInShadow];
        }
    }
    return results;
};

const isVisible = (el) => {
    if (!el) return false;
    if (el.offsetWidth || el.offsetHeight) return true;
    const rects = el.getClientRects();
    return rects && rects.length > 0;
};

const isUserContainer = (el) => {
    return !!(el.closest('[data-message-author-role="user"]') ||
              el.closest('[data-message-author-role="human"]') ||
              el.closest('[data-testid*="user"]') ||
              el.closest('[data-testid*="human"]'));
};

const collectAssistantMessages = () => {
    // Strategy 1: Known classes
    const assistantSelectors = [
        '[data-message-author-role="assistant"]',
        '[data-testid="assistant-message"]',
        '.font-claude-message',
        'div.markdown',
        '.claude-response'
    ];

    // Strategy 2: The scroll container found in logs
    // div.overflow-y-scroll.overflow-x-hidden.pt-6.flex-1
    const scrollContainerSelector = 'div.overflow-y-scroll';

    const candidates = [];
    const seen = new Set();

    // 1. Check specific selectors
    for (const sel of assistantSelectors) {
        const found = deepQuerySelectorAll(sel);
        for (const el of found) {
            if (!el || seen.has(el)) continue;
            seen.add(el);
            candidates.push(el);
        }
    }

    // 2. Check scroll container children (Chat rows)
    if (candidates.length === 0) {
        const scrollContainers = deepQuerySelectorAll(scrollContainerSelector);
        for (const container of scrollContainers) {
            // Get direct children (message rows)
            const children = Array.from(container.children);
            for (const child of children) {
                 if (child.tagName === 'DIV' && child.innerText.trim().length > 0) {
                     // Filter out user messages if possible
                     if (!isUserContainer(child)) {
                         candidates.push(child);
                     }
                 }
            }
        }
    }
    
    // 3. ALWAYS Look for CODE blocks directly since user wants code
    // (Run this regardless of previous findings to ensure we don't miss code)
    const codeBlocks = deepQuerySelectorAll('pre, code, .code-block');
    for (const blk of codeBlocks) {
          // Ensure it's not in the input editor
          if (!blk.isContentEditable && !blk.closest('[contenteditable]')) {
               // Avoid duplicates if we already found this element via other selectors
               if (!seen.has(blk)) {
                    candidates.push(blk);
                    seen.add(blk);
               }
          }
    }

    const containers = [];
    const containerSeen = new Set();

    for (const el of candidates) {
        if (!isVisible(el)) continue;
        if (el.closest('form')) continue;
        
        // Final user check
        if (isUserContainer(el)) continue;

        const container = el; 

        if (!containerSeen.has(container)) {
            containerSeen.add(container);
            containers.push(container);
        }
    }

    return containers;
};

const normalizeText = (value) => {
    return String(value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
};

const isPromptEcho = (text) => {
    if (!text) return false;
    const lowered = normalizeText(text);
    if (!lowered) return false;
    if (lowered.includes('you are an r code generator')) return true;
    if (lowered.includes('json request:')) return true;
    if (lowered.includes('r_code_request')) return true;
    if (lowered.includes('do not create, describe, or mention any r console')) return true;

    const prompt = normalizeText(window.lastInjectedPrompt || '');
    if (prompt) {
        if (lowered === prompt) return true;
        const snippet = prompt.slice(0, 180);
        if (snippet && lowered.includes(snippet)) return true;
    }
    return false;
};

// Fallback: Find the response by locating the prompt and getting the next sibling/container
const findResponseAdjacentToPrompt = () => {
    const prompt = window.lastInjectedPrompt || '';
    if (!prompt) return null;
    
    // Find all elements containing the prompt text
    // We use a tree walker to find text nodes, then get parent
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const candidates = [];
    const snippet = prompt.substring(0, 50).trim();
    
    while(node = walker.nextNode()) {
        if (node.textContent.includes(snippet)) {
            candidates.push(node.parentElement);
        }
    }
    
    // For each candidate, walk up to find the message container, then next sibling
    for (const el of candidates) {
        // Walk up until we hit a likely message row or container
        let current = el;
        for (let i = 0; i < 5; i++) {
            if (!current) break;
            const sibling = current.nextElementSibling;
            if (sibling) {
                // If sibling looks like a message
                if (sibling.innerText.trim().length > 0) {
                     return sibling;
                }
            }
            current = current.parentElement;
        }
    }
    return null;
};

const startObservingResponse = (baselineTexts = []) => {
    log('Starting response observation loop...');
    sessionStorage.setItem('claude_awaiting_response', 'true'); 

    let lastText = '';
    let stabilityCount = 0;
    let attempts = 0;
    const baseline = new Set(baselineTexts.map((text) => normalizeText(text)).filter(Boolean));

    const responseCheckInterval = setInterval(() => {
        attempts++;
        
        let messages = collectAssistantMessages();
        
        // Safety Fallback
        if (messages.length === 0) {
             const relative = findResponseAdjacentToPrompt();
             if (relative) messages = [relative];
        }
        
        if (messages.length === 0) return;

        const newMessages = [];
        for (const msg of messages) {
            const text = (msg.innerText || '').trim();
            if (!text) continue;
            
            const norm = normalizeText(text);
            
            if (baseline.has(norm)) {
                 if (attempts % 20 === 0) log(`[Filter] Rejecting baseline: ${text.substring(0, 20)}...`);
                 continue;
            }
            if (isPromptEcho(text)) {
                 if (attempts % 20 === 0) log(`[Filter] Rejecting prompt echo: ${text.substring(0, 20)}...`);
                 continue;
            }
            newMessages.push({ element: msg, text });
        }

        if (newMessages.length === 0) {
            if (attempts % 8 === 0) log('Waiting for assistant response content...');
            
            // --- STRATEGY 4: NUCLEAR TEXT DIFF ---
            // If we are stuck waiting (e.g. attempt > 20), try to find the response by diffing body text
            if (attempts > 20 && attempts % 10 === 0) {
                 const currentBodyText = document.body.innerText || '';
                 // Simple diff: Find text that wasn't in baseline and isn't the prompt
                 const lines = currentBodyText.split('\n');
                 for (const line of lines) {
                      const trimmed = line.trim();
                      if (trimmed.length < 20) continue;
                      if (baseline.has(normalizeText(trimmed))) continue;
                      if (isPromptEcho(trimmed)) continue;
                      
                      // Identify potential code block or response
                      // If it looks like R code or contains the response
                      if (trimmed.includes('<-') || trimmed.includes('data.frame') || trimmed.includes('```')) {
                           log(`[Nuclear] Found potential response candidate: ${trimmed.substring(0, 50)}...`);
                           newMessages.push({ element: document.body, text: trimmed }); // Mock element
                      }
                 }
            }
            
            if (newMessages.length === 0) {
                 // Force Dump if verify fails repeatedly
                 if (attempts === 30) dumpDOM(); 
                 return;
            }
        }

        const lastMsgObj = newMessages[newMessages.length - 1];
        let currentText = lastMsgObj.text;
        
        // --- VALIDATION LOGIC ---
        // 1. Ignore short status messages
        if (currentText.length < 5) {
             if (attempts % 5 === 0) log(`Ignoring short text: "${currentText}"`);
             return;
        }
        
        // 2. Ignore "Thinking..." or "Claude is typing"
        if (/thinking|typing|generating/i.test(currentText) && currentText.length < 30) {
             return;
        }

        // 3. Prefer extraction of CODE BLOCKS if present
        const codeBlock = lastMsgObj.element.querySelector('.code-block, pre, code');
        if (codeBlock) {
             // If we found a code block, use its content!
             // But valid R code might be short, so we trust it if it looks like code.
             const blockText = codeBlock.innerText || '';
             // specific edge case filtering for small stubs grabbed by querySelector
             const tb = blockText.trim();
             if (tb.length <= 15 && (tb.includes('ff <- c()') || tb.includes('Copy code') || tb.length < 5)) {
                 if (attempts % 5 === 0) log(`Ignoring small stub code block: "${blockText}"`);
                 return;
             }
             currentText = blockText;
             log(`Found code block! (Len: ${currentText.length})`);
        }

        const isStreaming = currentText === '' || !!deepQuerySelector('.cursor');

        if (currentText === lastText && currentText.length > 2 && !isStreaming) {
            stabilityCount++;
        } else {
            stabilityCount = 0;
            if (currentText !== lastText && currentText.trim().length > 0) {
                 ipcRenderer.send('claude-response-partial', currentText);
            }
            lastText = currentText;
        }
        
        if (stabilityCount >= 4) { // Lowered stability threshold to ensure prompt extraction
            clearInterval(responseCheckInterval);
            sessionStorage.removeItem('claude_awaiting_response'); 
            window.isInjecting = false;  // Clear lock safely after extraction
            log(`Response stabilized (Len: ${currentText.length}). Sending back to main.`);
            ipcRenderer.send('claude-response-extracted', currentText);
        }
        
        if (attempts > 240) {
             clearInterval(responseCheckInterval);
             sessionStorage.removeItem('claude_awaiting_response'); 
             window.isInjecting = false; // Clear lock on timeout
            log('Response timeout.');
        }
    }, 500);
};

const injectPrompt = async (prompt) => {
    if (window.isInjecting) return;
    if (window.lastInjectedPrompt === prompt) {
        log('Skipping duplicate prompt injection.');
        return;
    }
    
    window.isInjecting = true;
    window.lastInjectedPrompt = prompt;
    
    log('Starting injection sequence...');
    const baselineMessages = collectAssistantMessages().map((msg) => msg.innerText || '').filter(Boolean);

    // Focus editor
    const editorSelectors = [
        'div[contenteditable="true"]',
        'textarea[placeholder*="Claude"]',
        'textarea'
    ];

    let editor = null;
    for (const sel of editorSelectors) {
        editor = deepQuerySelector(sel);
        if (editor) break;
    }
    
    if (!editor) {
        log('CRITICAL: Editor not found');
        window.isInjecting = false;
        return;
    }
    log('Editor found. Focusing and inserting text...');

    editor.focus();
    
    // Robust insertion
    // Clear existing text to prevent accumulation
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    
    document.execCommand('insertText', false, prompt);
    editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    
    // Simulate typing a space and backspace to force React state update if insertText wasn't caught
    document.execCommand('insertText', false, ' ');
    editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    document.execCommand('delete');
    editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    await new Promise(r => setTimeout(r, 100));

    // Wait for UI
    await new Promise(r => setTimeout(r, 500));

    // Try sending via Enter key first
    log('Attempting to send via Enter key sequence...');
    const keyOpts = { bubbles: true, cancelable: true, keyCode: 13, key: 'Enter', code: 'Enter', composed: true };
    editor.dispatchEvent(new KeyboardEvent('keydown', keyOpts));
    await new Promise(r => setTimeout(r, 50));
    editor.dispatchEvent(new KeyboardEvent('keypress', keyOpts));
    editor.dispatchEvent(new KeyboardEvent('keyup', keyOpts));
    
    await new Promise(r => setTimeout(r, 1000));

    // Click Send Button (generic)
    const sendButtonSelectors = [
        'button[aria-label="Send Message"]',
        'button[aria-label="Send"]',
        'button:has(svg)'
    ];
    
    let sendButton = null;
    for (const selector of sendButtonSelectors) {
        const btns = deepQuerySelectorAll(selector);
        for (const btn of btns) {
             const label = (btn.getAttribute('aria-label') || '').toLowerCase();
             if (label.includes('attach') || label.includes('file')) continue;
             if (!btn.disabled && btn.offsetParent !== null) {
                 sendButton = btn;
                 break;
             }
        }
        if (sendButton) break;
    }

    if (sendButton) {
        log('Clicking Send button...');
        sendButton.click();
    }
    
    setTimeout(() => startObservingResponse(baselineMessages), 1000);
};

const simulateFileDrop = async (filePath) => {
    const fs = require('fs');
    const path = require('path');
    
    log(`Attempting to simulate upload for: ${filePath}`);
    
    try {
        const data = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const extension = path.extname(filePath).toLowerCase();
        
        const mimeMap = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.csv': 'text/csv',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain',
            '.r': 'text/plain'
        };
        const mimeType = mimeMap[extension] || 'application/octet-stream';
        
        // Convert Buffer to Uint8Array for browser File constructor
        const fileContent = new Uint8Array(data);
        const file = new File([fileContent], fileName, { 
            type: mimeType,
            lastModified: Date.now()
        });
        
        log(`Created File object: ${fileName}, Size: ${file.size} bytes, Type: ${mimeType}`);

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        // Ensure dataTransfer has the files property correctly populated
        // and add some flags used by complex drag-drop handlers
        Object.defineProperty(dataTransfer, 'effectAllowed', { value: 'copy' });
        Object.defineProperty(dataTransfer, 'dropEffect', { value: 'copy' });
        
        // 1. Try to find the native file input (Preferred)
        const fileInputs = deepQuerySelectorAll('input[type="file"]');
        let uploadSuccess = false;
        
        if (fileInputs.length > 0) {
            log(`Found ${fileInputs.length} potential file inputs. Attempting native upload simulation...`);
            for (const input of fileInputs) {
                try {
                    input.value = '';
                    input.files = dataTransfer.files;
                    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
                    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
                    input.focus();
                    input.blur();
                    uploadSuccess = true;
                    log(`Injected file into input: ${input.className || 'no-class'}`);
                    break;
                } catch (e) {
                    log(`Failed to set files on input: ${e.message}`);
                }
            }
        }

        if (uploadSuccess) {
            log('Native upload simulation successful.');
        }

        // 2. Drop Simulation (Primary or Booster)
        const editor = deepQuerySelector('div[contenteditable="true"]') || 
                       document.body;
        
        log(`Triggering drop simulation for ${fileName} (${mimeType})...`);
        
        const dragEvents = ['dragenter', 'dragover', 'drop'];
        for (const type of dragEvents) {
            const event = new DragEvent(type, {
                dataTransfer,
                bubbles: true,
                cancelable: true,
                composed: true
            });
            editor.dispatchEvent(event);
        }
        
        log('Drop simulation sequence completed.');
    } catch (err) {
        log(`Error in simulateFileDrop: ${err.message}`);
    }
};

ipcRenderer.on('attach-file', async (event, filePath) => {
    log(`Received push attachment: ${filePath}`);
    simulateFileDrop(filePath);
});

ipcRenderer.on('inject-prompt', async (event, prompt) => {
    log('Received push prompt');
    injectPrompt(prompt);
});

// Poll for pending prompt
setInterval(async () => {
    const editor = deepQuerySelector('div[contenteditable="true"]');
    if (editor) {
        try {
            const prompt = await ipcRenderer.invoke('check-for-prompt');
            if (prompt) {
                log('Pulled pending prompt');
                injectPrompt(prompt);
            }
            const filePath = await ipcRenderer.invoke('check-for-attach-file');
            if (filePath) {
                log(`Pulled pending attachment: ${filePath}`);
                simulateFileDrop(filePath);
            }
        } catch (e) {}
    }
}, 1000);

log('Claude Preload Script Loaded & Ready (Native File Support Enabled)');
