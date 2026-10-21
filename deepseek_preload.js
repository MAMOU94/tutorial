const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const debugLogFile = '/home/mamou/Desktop/v3/deepseek_debug.log';

const log = (...args) => {
    const msg = `[Preload] ${args.join(' ')}`;
    console.log(`[Extension Debug]: [DeepSeek] ${msg}`);
    try {
        fs.appendFileSync(debugLogFile, msg + '\n');
    } catch(e) {}
    try {
        ipcRenderer.send('log-message', { source: 'DeepSeek Preload', message: msg });
    } catch(e) {}
};

// Helper to find all elements piercing Shadow DOM
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

const deepQuerySelector = (selector, root = document) => {
    const found = root.querySelector(selector);
    if (found) return found;
    const walkers = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
    let node;
    while(node = walkers.nextNode()) {
        if (node.shadowRoot) {
            const result = deepQuerySelector(selector, node.shadowRoot);
            if (result) return result;
        }
    }
    return null;
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

const startObservingResponse = (baselineCount = 0) => {
    log(`Starting response observation loop (baseline count=${baselineCount})...`);
    
    let lastText = '';
    let stabilityCount = 0;
    let attempts = 0;
    
    const responseCheckInterval = setInterval(() => {
        attempts++;
        
        const getUniqueCandidates = () => {
            const sels = [
                '.ds-markdown',
                '.markdown-body',
                'div[class*="message"] div[class*="content"]',
                '.prose'
            ];
            const set = new Set();
            for (const s of sels) {
                const found = deepQuerySelectorAll(s);
                for (const el of found) set.add(el);
            }
            return Array.from(set);
        };

        const candidates = getUniqueCandidates();
        
        if (candidates.length === 0) {
            const divs = deepQuerySelectorAll('div');
            const fallbackCandidates = divs.filter(el => {
                const text = el.innerText || '';
                return text.length > 50 && !el.querySelector('textarea') && !el.isContentEditable;
            });
            for (const el of fallbackCandidates) candidates.push(el);
        }

        // Filter out candidates that are part of the baseline
        if (candidates.length <= baselineCount && attempts < 120) {
            if (attempts % 10 === 0) log(`Waiting for new model turn... observed unique containers=${candidates.length}, baseline=${baselineCount}`);
            return;
        }

        // If we've waited too long, just use the last one anyway (could be a regenerated response)
        const lastMessage = candidates[candidates.length - 1];
        if (!lastMessage) return;
        
        const currentText = lastMessage.innerText;
        
        const stopButton = document.querySelector('div[class*="stop"]');
        const isStreaming = !!stopButton;

        if (currentText === lastText && currentText.trim().length > 0 && !isStreaming) {
            stabilityCount++;
        } else {
            stabilityCount = 0;
            if (currentText !== lastText && currentText.trim().length > 0) {
                ipcRenderer.send('deepseek-response-partial', currentText);
            }
            lastText = currentText;
        }
        
        if (attempts % 10 === 0) {
             const snippet = currentText.length > 30 ? currentText.substring(0, 30) + '...' : currentText;
             log(`Monitoring: Stable=${stabilityCount}, Streaming=${isStreaming}, TextLen=${currentText.length}, Snippet="${snippet}"`);
        }

        if (stabilityCount >= 5) {
            clearInterval(responseCheckInterval);
            log(`Response stabilized (Len: ${currentText.length}). Sending back to main.`);
            ipcRenderer.send('deepseek-response-extracted', currentText);
        }
        
        if (attempts > 400) {
             clearInterval(responseCheckInterval);
             log('Response timeout.');
        }
        
    }, 500);
};

const injectPrompt = async (prompt) => {
    if (window.isInjecting) return;
    window.isInjecting = true;
    
    log('Starting injection sequence...');
    try {
    
    const getUniqueCandidates = () => {
        const sels = [
            '.ds-markdown',
            '.markdown-body',
            'div[class*="message"] div[class*="content"]',
            '.prose'
        ];
        const set = new Set();
        for (const s of sels) {
            const found = deepQuerySelectorAll(s);
            for (const el of found) set.add(el);
        }
        return Array.from(set);
    };

    const responseBaseline = getUniqueCandidates().length;
    log(`Captured unique baseline before send (count=${responseBaseline}).`);

    const editorSelectors = [
        'textarea',
        '#chat-input',
        '[contenteditable="true"]'
    ];

    let editor = null;
    for (const sel of editorSelectors) {
        editor = deepQuerySelector(sel);
        if (editor) break;
    }
    
    if (!editor) {
        log('Editor not found immediately. Waiting...');
        editor = await waitForElement('textarea') || await waitForElement('[contenteditable="true"]');
    }
    
    if (!editor) {
        log('CRITICAL: Editor not found');
        window.isInjecting = false;
        return;
    }
    log('Editor found. Focusing and inserting text...');

    editor.focus();
    
    if (editor.tagName === 'TEXTAREA') {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        if (nativeSetter) {
            nativeSetter.call(editor, prompt);
        } else {
            editor.value = prompt;
        }
    } else {
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, prompt);
    }
    
    editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    
    await new Promise(r => setTimeout(r, 500));

    const sendButtonSelectors = [
        'div[aria-label="Send message"]',
        'div[aria-label="Send"]',
        'button[aria-label="Send message"]',
        'button[aria-label="Send"]',
        'div[role="button"]:has(svg)',
        'button:has(svg)'
    ];
    
    let sendButton = null;
    for (const selector of sendButtonSelectors) {
        const btns = deepQuerySelectorAll(selector);
        for (const btn of btns) {
            const hasSendIcon = btn.innerHTML.includes('path') && (btn.innerHTML.includes('M1') || btn.innerHTML.includes('M5'));
            if (btn.offsetParent !== null || hasSendIcon) {
                sendButton = btn;
                break;
            }
        }
        if (sendButton) break;
    }

    if (sendButton) {
        log('Send button found. Clicking...');
        sendButton.click();
    } else {
        log('Send button not found. Using Enter key sequence...');
    }
    
    const keyOpts = { bubbles: true, cancelable: true, keyCode: 13, key: 'Enter', code: 'Enter', composed: true, view: window };
    editor.dispatchEvent(new KeyboardEvent('keydown', keyOpts));
    editor.dispatchEvent(new KeyboardEvent('keypress', keyOpts));
    editor.dispatchEvent(new KeyboardEvent('keyup', keyOpts));
    
    // Fallback: send to document as well
    document.dispatchEvent(new KeyboardEvent('keydown', keyOpts));
    
    setTimeout(() => {
        startObservingResponse(responseBaseline);
        window.isInjecting = false;
    }, 600);
} catch (err) {
    log(`Error in injectPrompt: ${err.message}`);
    window.isInjecting = false;
}
};

const simulateFileDrop = async (filePath) => {
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
        
        const fileContent = new Uint8Array(data);
        const file = new File([fileContent], fileName, { 
            type: mimeType,
            lastModified: Date.now()
        });
        
        log(`Created File object: ${fileName}, Size: ${file.size} bytes, Type: ${mimeType}`);

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
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
                       deepQuerySelector('#chat-input') || 
                       deepQuerySelector('[contenteditable="true"]') ||
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

ipcRenderer.on('inject-prompt', (event, prompt) => {
    log('Received push prompt');
    injectPrompt(prompt);
});

ipcRenderer.on('attach-file', (event, filePath) => {
    log(`Received push attachment: ${filePath}`);
    simulateFileDrop(filePath);
});

setInterval(async () => {
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
}, 1000);

log('DeepSeek Preload Script Loaded & Ready (Native File Support Enabled)');
