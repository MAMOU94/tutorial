const { ipcRenderer } = require('electron');

const log = (msg) => ipcRenderer.send('log-debug', `[Qwen] ${msg}`);

// Helper to wait for element
const waitForElement = (selector, timeout = 15000) => {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver((mutations) => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
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

// Helper to find all elements piercing Shadow DOM
const deepQuerySelectorAll = (selector, root = document) => {
    let results = [];
    // Check root first
    const found = root.querySelectorAll(selector);
    if (found.length > 0) results = [...results, ...Array.from(found)];

    // Check all children with shadow roots
    const walkers = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
    let node;
    while(node = walkers.nextNode()) {
        if (node.shadowRoot) {
            results = [...results, ...deepQuerySelectorAll(selector, node.shadowRoot)];
        }
    }
    return results;
};

const deepQuerySelector = (selector, root = document) => {
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

const startObservingResponse = () => {
    log('Starting response observation loop...');
    let lastText = '';
    let stabilityCount = 0;
    
    // Selectors for Qwen response
    const responseCheckInterval = setInterval(() => {
        // DBG: Dump classes of one potential message to see what we're dealing with
        if (Math.random() < 0.01) {
            const potential = document.querySelectorAll('div[class*="message"], div[class*="content"], div[class*="text"]');
             if (potential.length > 0) {
                 const sample = Array.from(potential).slice(-3).map(el => el.className).join(' | ');
                 log(`DOM SAMPLER: Found classes: ${sample}`);
             }
        }

        // Strategy 3: Look for *any* significant text block that grows
        // Qwen likely uses standard HTML, maybe deep nested
        
        let candidates = [];
        
        // Try 1: By Class (Standard)
        const classSelectors = [
             '.message-content', '.ant-typography', '.markdown-body', 
             '.bot-response', '.model-response', '.answer-result',
             'div[class*="result-"]', 'div[class*="message-"]'
        ];
        
        candidates = deepQuerySelectorAll(classSelectors.join(', '));
        
        // Try 2: Fallback to just paragraph collection if nothing specific found
        if (candidates.length === 0) {
             candidates = deepQuerySelectorAll('p, .markdown-body > *');
        }

        if (candidates.length === 0) {
             if (Math.random() < 0.05) log('Monitoring: No message containers found yet.');
             return;
        }

        // Get the LAST candidate that has substantial text
        // Filter out empty or very short instructions
        const validCandidates = candidates.filter(el => el.innerText && el.innerText.length > 20);
        
         if (validCandidates.length === 0) return;

        const lastMessage = validCandidates[validCandidates.length - 1];
        const currentText = lastMessage.innerText;
        
        if (currentText === lastText && currentText.trim().length > 0) {
            stabilityCount++;
        } else {
            stabilityCount = 0;
            // Emit partial response for real-time streaming
            if (currentText !== lastText && currentText.trim().length > 0) {
                ipcRenderer.send('qwen-response-partial', currentText);
            }
            lastText = currentText;
        }
        
        if (stabilityCount >= 5) { // 2.5 seconds stability
            clearInterval(responseCheckInterval);
            log(`Response stabilized (Len: ${currentText.length}). Sending back.`);
            ipcRenderer.send('qwen-response-extracted', currentText);
        }
    }, 500);
};

const injectPrompt = async (prompt) => {
    if (window.isInjecting) return;
    window.isInjecting = true;
    log('Starting injection sequence...');
    setTimeout(() => { window.isInjecting = false; }, 10000);

    // Wait for editor
    // Qwen likely uses a textarea or contenteditable div
    const editorSelectors = ['textarea', 'div[contenteditable="true"]', '#prompt-textarea'];
    let editor = null;
    
    for (const sel of editorSelectors) {
        log(`Checking selector: ${sel}`);
        editor = deepQuerySelector(sel);
        if (editor) {
             log(`Found editor via immediate check: ${sel}`);
             break;
        }
    }

    if (!editor) {
        log('Editor not found immediately. Waiting for textarea...');
        editor = await waitForElement('textarea');
        if (!editor) {
            log('Wait failed. Trying contenteditable...');
            editor = await waitForElement('div[contenteditable="true"]');
        }
    }
    
    if (editor) {
        log('Editor found. Focusing...');
        editor.focus();
        
        log('Inserting text...');
        // Clear existing text to prevent accumulation
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        
        document.execCommand('insertText', false, prompt);
        
        // Dispatch events
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
        
        await new Promise(r => setTimeout(r, 500));
        
        // Try clicking send button first
        log('Looking for Send button...');
        // Common send button selectors
        const sendSelectors = [
            'button[aria-label="Send"]',
            'button[aria-label="Submit"]', 
            '.ant-input-suffix button', 
            'button.ant-btn-primary'
        ];
        
        let sendBtn = null;
        for (const s of sendSelectors) {
            sendBtn = deepQuerySelector(s);
            if (sendBtn) break;
        }
        
        if (sendBtn) {
            log('Clicking Send button...');
            sendBtn.click();
        } else {
            log('Send button not found. Using Enter key...');
            const keyOpts = { bubbles: true, cancelable: true, keyCode: 13, key: 'Enter', code: 'Enter', composed: true };
            editor.dispatchEvent(new KeyboardEvent('keydown', keyOpts));
            editor.dispatchEvent(new KeyboardEvent('keypress', keyOpts));
            editor.dispatchEvent(new KeyboardEvent('keyup', keyOpts));
        }
        
        setTimeout(startObservingResponse, 1000);
    } else {
        log('CRITICAL: Could not find editor after waiting.');
    }
    
    // Safety reset
    setTimeout(() => { window.isInjecting = false; }, 2000);
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
                    input.value = ''; // Reset to force change
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
        const editor = deepQuerySelector('textarea') || 
                       deepQuerySelector('div[contenteditable="true"]') || 
                       deepQuerySelector('#prompt-textarea') ||
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

// Listen for push events
ipcRenderer.on('inject-prompt', (event, prompt) => {
    log('Received push prompt via IPC');
    injectPrompt(prompt);
});

ipcRenderer.on('attach-file', (event, filePath) => {
    log(`Received push attachment: ${filePath}`);
    simulateFileDrop(filePath);
});

// Poll for pending actions
setInterval(async () => {
    try {
        const prompt = await ipcRenderer.invoke('check-for-prompt');
        if (prompt) {
            log('Pulled pending prompt via poll');
            injectPrompt(prompt);
        }
        
        const filePath = await ipcRenderer.invoke('check-for-attach-file');
        if (filePath) {
            log(`Pulled pending attachment via poll: ${filePath}`);
            simulateFileDrop(filePath);
        }
    } catch (e) {}
}, 1000);

log('Qwen Preload Ready (Native File Support Enabled)');
