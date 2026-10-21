const { ipcRenderer } = require('electron');

// Log helper
const fs = require('fs');
const path = require('path');
const debugLogFile = '/home/mamou/Desktop/v3/gemini_debug.log';

const log = (...args) => {
    const msg = `[Extension Debug]: [Gemini] ${args.join(' ')}`;
    console.log(msg);
    try {
        fs.appendFileSync(debugLogFile, msg + '\n');
    } catch(e) {}
};

// Helper to wait for element
const waitForElement = (selector, timeout = 10000) => {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
        observer.disconnect();
        resolve(null);
    }, timeout);
  });
};

// Helper to find element piercing Shadow DOM
const deepQuerySelector = (selector, root = document) => {
    let result = null;
    
    // Check root first
    const found = root.querySelector(selector);
    if (found) return found;

    // Check all children with shadow roots
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

// Helper to find all elements piercing Shadow DOM
const deepQuerySelectorAll = (selector, root = document) => {
    let results = [];
    
    // Check root first
    const found = root.querySelectorAll(selector);
    if (found.length > 0) {
        results = [...results, ...Array.from(found)];
    }

    // Check all children with shadow roots
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

const RESPONSE_SELECTORS = [
    '.model-response-text',
    '[data-test-id="model-response-text"]',
    'model-response',
    '.message-content',
    '.response-content'
];

let activeResponseObserver = null;
let activeResponseObserverToken = 0;

const normalizeResponseText = (text) => String(text || '').replace(/\s+/g, ' ').trim();

const dedupeAndSortNodes = (nodes) => {
    const unique = [];
    const seen = new Set();
    for (const node of nodes || []) {
        if (!node || seen.has(node)) continue;
        seen.add(node);
        unique.push(node);
    }

    // Ensure deterministic DOM order (oldest -> newest).
    unique.sort((left, right) => {
        if (left === right) return 0;
        const pos = left.compareDocumentPosition(right);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
    });

    return unique;
};

const getResponseNodes = (preferredSelector = null) => {
    const selectors = preferredSelector
        ? [preferredSelector, ...RESPONSE_SELECTORS.filter((sel) => sel !== preferredSelector)]
        : RESPONSE_SELECTORS;

    for (const selector of selectors) {
        const nodes = dedupeAndSortNodes(deepQuerySelectorAll(selector));
        if (nodes.length > 0) {
            return { selector, nodes };
        }
    }

    return { selector: preferredSelector || RESPONSE_SELECTORS[0], nodes: [] };
};

const captureResponseBaseline = () => {
    const { selector, nodes } = getResponseNodes();
    const lastNode = nodes[nodes.length - 1] || null;
    return {
        selector,
        count: nodes.length,
        lastText: normalizeResponseText(lastNode ? lastNode.innerText : ''),
        lastNode
    };
};

const resolveTurnAwareResponseNode = (baseline = null, allowFallback = false) => {
    const { selector, nodes } = getResponseNodes(baseline && baseline.selector ? baseline.selector : null);
    if (baseline && !baseline.selector) baseline.selector = selector;

    if (nodes.length === 0) {
        return { node: null, nodes };
    }

    if (!baseline) {
        return { node: nodes[nodes.length - 1], nodes };
    }

    // Strict separation: only extract from nodes that appeared after this request.
    if (nodes.length > baseline.count) {
        return { node: nodes[nodes.length - 1], nodes };
    }

    // If DOM structure changed but count did not (rare), allow the new reference.
    const currentLastNode = nodes[nodes.length - 1];
    if (baseline.lastNode && currentLastNode && currentLastNode !== baseline.lastNode) {
        return { node: currentLastNode, nodes };
    }

    // Late fallback: some Gemini variants stream in the same node.
    if (allowFallback) {
        const lastText = normalizeResponseText(currentLastNode ? currentLastNode.innerText : '');
        if (lastText && lastText !== baseline.lastText) {
            return { node: currentLastNode, nodes };
        }
    }

    return { node: null, nodes };
};

const startObservingResponse = (baseline = null) => {
    if (activeResponseObserver) {
        clearInterval(activeResponseObserver);
        activeResponseObserver = null;
    }

    const observerToken = ++activeResponseObserverToken;
    const baselineCount = baseline && Number.isFinite(baseline.count) ? baseline.count : 0;
    log(`Starting response observation loop (baseline count=${baselineCount})...`);
    
    let lastText = '';
    let stabilityCount = 0;
    let attempts = 0;
    let stopButtonSeen = false;

    const responseCheckInterval = setInterval(() => {
        if (observerToken !== activeResponseObserverToken) {
            clearInterval(responseCheckInterval);
            return;
        }

        attempts++;

        const allowFallback = attempts > 120;
        const { node: responseNode, nodes } = resolveTurnAwareResponseNode(baseline, allowFallback);
        if (!responseNode) {
            if (attempts % 10 === 0) {
                log(`Waiting for new model turn... observed containers=${nodes.length}, fallback=${allowFallback}`);
            }
            return;
        }

        const currentText = responseNode.innerText || '';
        
        // robust stop button check
        const stopButton = deepQuerySelector('button[aria-label="Stop generating"]') || 
                           deepQuerySelector('button[aria-label="Stop"]');
                           
        const isStreaming = !!stopButton || (currentText.trim() === '' && attempts < 20);

        // Immediate finish if stop button disappears and text is somewhat stable
        if (stopButtonSeen && !stopButton && currentText.trim().length > 0) {
            log('Stop button disappeared! Finishing response.');
            clearInterval(responseCheckInterval);
            if (activeResponseObserver === responseCheckInterval) activeResponseObserver = null;
            ipcRenderer.send('gemini-response-extracted', currentText);
            return;
        }
        if (stopButton) stopButtonSeen = true;

        if (currentText === lastText && currentText.trim().length > 0 && !isStreaming) {
            stabilityCount++;
        } else {
            stabilityCount = 0;
            if (currentText !== lastText) {
                lastText = currentText;
                ipcRenderer.send('gemini-response-partial', currentText);
            }
        }
        
        if (attempts % 10 === 0) {
             const packet = currentText.length > 20 ? currentText.substring(0, 20) + '...' : currentText;
             log(`Monitoring: Stable=${stabilityCount}, Streaming=${isStreaming}, TextLen=${currentText.length}, Snippet="${packet}"`);
        }

        // Reduced stability count to 2 for faster response detection
        if (stabilityCount >= 2) {
            clearInterval(responseCheckInterval);
            if (activeResponseObserver === responseCheckInterval) activeResponseObserver = null;
            log(`Response stabilized (Len: ${currentText.length}). Sending back to main.`);
            ipcRenderer.send('gemini-response-extracted', currentText);
        }
        
        if (attempts > 240) {
             clearInterval(responseCheckInterval);
             if (activeResponseObserver === responseCheckInterval) activeResponseObserver = null;
             log('Response timeout.');
        }
        
    }, 100);
    activeResponseObserver = responseCheckInterval;
};

const injectPrompt = async (prompt) => {
    if (window.isInjecting) return;
    window.isInjecting = true;
    // window.lastInjectedPrompt = prompt; // Removed to allow unlimited repeat requests
    const responseBaseline = captureResponseBaseline();
    
    log('Starting injection sequence...');
    log(`Captured baseline before send (selector=${responseBaseline.selector}, count=${responseBaseline.count}).`);
    // Reduce timeout to allow follow-up "..." injections faster
    setTimeout(() => { window.isInjecting = false; }, 2000);

    // Focus editor - extended selectors with Shadow DOM support
    const editorSelectors = [
        'div[contenteditable="true"]',
        'rich-textarea div[contenteditable="true"]', // classic structure
        'rich-textarea div[contenteditable="true"]',
        'textarea[aria-label="Enter a prompt here"]',
        'textarea'
    ];

    let editor = null;
    for (const sel of editorSelectors) {
        editor = deepQuerySelector(sel);
        if (editor) break;
    }
    
    if (!editor) {
        log('CRITICAL: Editor not found (even with deep query)');
        window.isInjecting = false;
        return;
    }
    log('Editor found. Focusing and inserting text...');

    editor.focus();
    
    // Robust insertion with "Jitter" to force framework detection
    document.execCommand('insertText', false, prompt);
    editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    
    await new Promise(r => setTimeout(r, 100));
    
    // Jitter: Add a space and remove it
    document.execCommand('insertText', false, ' ');
    editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await new Promise(r => setTimeout(r, 50));
    document.execCommand('delete', false);
    editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    
    // Wait for UI to update (Gemini can be slow to enable the button)
    await new Promise(r => setTimeout(r, 600));

    // Try sending via Enter key first (full sequence)
    log('Attempting to send via Enter key sequence...');
    const keyOpts = {
        bubbles: true, cancelable: true, keyCode: 13, key: 'Enter', code: 'Enter', composed: true
    };
    editor.dispatchEvent(new KeyboardEvent('keydown', keyOpts));
    await new Promise(r => setTimeout(r, 50));
    editor.dispatchEvent(new KeyboardEvent('keypress', keyOpts));
    editor.dispatchEvent(new KeyboardEvent('keyup', keyOpts));
    
    await new Promise(r => setTimeout(r, 400));

    // CHECK: Did Enter key work? 
    // If the "Stop" button is present, we are already generating.
    const stopButtonCheck = deepQuerySelector('button[aria-label*="Stop"]' ) || 
                            deepQuerySelector('button[aria-label*="Interrompre"]') ||
                            deepQuerySelector('[data-test-id="stop-button"]');

    if (stopButtonCheck) {
        log('Generation started via Enter key (Stop button found). Skipping Send button click.');
        setTimeout(() => startObservingResponse(responseBaseline), 500);
        return;
    }

    // Also try clicking Send button as backup/confirmation
    const sendButtonSelectors = [
        'button[aria-label="Send message"]',
        'button[aria-label="Send prompt"]',
        'button.send-button',
        'button[data-test-id="send-button"]',
        'button[data-test-id="generate-button"]',
        'button:has(svg)' // Broad fallback
    ];
    
    let sendButton = null;
    for (const selector of sendButtonSelectors) {
        // Find all matches
        const btns = deepQuerySelectorAll(selector);
        for (const btn of btns) {
            // Check visibility and disabled state
            const ariaDisabled = btn.getAttribute('aria-disabled') === 'true';
            const isHidden = btn.offsetParent === null && window.getComputedStyle(btn).display === 'none';
            
            // Log candidates for debugging
            if (Math.random() < 0.01) log(`Candidate btn: ${selector} Disabled:${btn.disabled} Aria:${ariaDisabled}`);

            if (!btn.disabled && !ariaDisabled && !isHidden) {
                 if (selector.includes('svg')) {
                     const label = (btn.getAttribute('aria-label') || '').toLowerCase();
                     const title = (btn.getAttribute('title') || '').toLowerCase();
                     const svgPath = btn.querySelector('svg path')?.getAttribute('d') || '';
                     const combinedText = label + ' ' + title;
                     // Exclude Mic/Check/Image/Plus AND STOP BUTTONS AND REDO/EDIT BUTTONS
                     if (combinedText.includes('mic') || combinedText.includes('image') || combinedText.includes('add') || 
                         combinedText.includes('stop') || combinedText.includes('interrompre') || combinedText.includes('cancel') ||
                         combinedText.includes('redo') || combinedText.includes('retry') || combinedText.includes('edit') ||
                         combinedText.includes('copy') || combinedText.includes('good') || combinedText.includes('bad') || 
                         combinedText.includes('share') || combinedText.includes('menu') || combinedText.includes('listen')) {
                         continue;
                     }
                 }
                 sendButton = btn;
                 break; 
            }
        }
        if (sendButton) break;
    }

    if (sendButton) {
        log(`Found Send button (${sendButton.getAttribute('aria-label') || 'unknown'}). Clicking...`);
        const opts = { bubbles: true, cancelable: true, view: window };
        sendButton.dispatchEvent(new MouseEvent('mouseover', opts));
        sendButton.dispatchEvent(new MouseEvent('mousedown', opts));
        sendButton.dispatchEvent(new MouseEvent('mouseup', opts));
        sendButton.click();
    } else {
        log('Send button not found or is disabled. (Enter key was tried)');
    }
    
    setTimeout(() => startObservingResponse(responseBaseline), 400);
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
                    // Reset input value first (some frameworks ignore same files)
                    input.value = '';
                    
                    // Set files
                    input.files = dataTransfer.files;
                    
                    // Trigger events with small delays to allow UI to react
                    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
                    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
                    
                    // Sometimes a blur/focus cycle is needed
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
            // Even if successful, let's also trigger a drop event on the editor as a "booster" 
            // since some parts of Gemini's state might only react to drops.
        }

        // 2. Drop Simulation (Primary or Booster)
        const editor = deepQuerySelector('div[contenteditable="true"]') || 
                       deepQuerySelector('rich-textarea div[contenteditable="true"]') ||
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

ipcRenderer.on('inject-prompt', async (event, prompt) => {
    log('Received push prompt');
    injectPrompt(prompt);
});

ipcRenderer.on('attach-file', async (event, filePath) => {
    log(`Received push attachment: ${filePath}`);
    simulateFileDrop(filePath);
});

// Poll for pending actions
setInterval(async () => {
    const editorSelectors = [
        'div[contenteditable="true"]',
        'rich-textarea div[contenteditable="true"]',
        'textarea[aria-label="Enter a prompt here"]',
        'textarea'
    ];

    let editor = null;
    for (const sel of editorSelectors) {
        editor = deepQuerySelector(sel);
        if (editor) break;
    }

    if (editor) {
        try {
            // Check for prompt
            const prompt = await ipcRenderer.invoke('check-for-prompt');
            if (prompt) {
                log('Pulled pending prompt');
                injectPrompt(prompt);
            }
            
            // Check for file attachment
            const filePath = await ipcRenderer.invoke('check-for-attach-file');
            if (filePath) {
                log(`Pulled pending attachment: ${filePath}`);
                simulateFileDrop(filePath);
            }
        } catch (e) {
            // ignore
        }
    }
}, 1000);

// Startup log
log('Gemini Preload Script Loaded & Ready (Native File Support Enabled)');
