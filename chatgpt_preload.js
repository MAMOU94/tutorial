const { ipcRenderer } = require('electron');

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

const log = (msg) => ipcRenderer.send('log-debug', `[ChatGPT] ${msg}`);

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

const startObservingResponse = () => {
    log('Starting response observation loop...');
    
    let lastText = '';
    let stabilityCount = 0;
    let attempts = 0;
    
    const responseCheckInterval = setInterval(() => {
        attempts++;
        const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
        
        if (messages.length === 0) {
            if (attempts % 5 === 0) log(`Waiting for first assistant message... (Attempt ${attempts})`);
            return;
        }
        
        const lastMessage = messages[messages.length - 1];
        const currentText = lastMessage.innerText;
        
        // Check if "generating" indicator exists
        const isStreaming = lastMessage.classList.contains('result-streaming') || 
                            document.querySelector('.result-streaming'); 
        
        if (currentText === lastText && currentText.trim().length > 0 && !isStreaming) {
            stabilityCount++;
        } else {
            if (stabilityCount > 0 && currentText.trim().length === 0) {
                log('Stability reset: text became empty');
            } else if (stabilityCount > 0 && isStreaming) {
                log('Stability reset: streaming detected');
            } else if (stabilityCount > 0 && currentText !== lastText) {
                log(`Stability reset: text changed (Len: ${currentText.length})`);
            }
            stabilityCount = 0;
            
            // Emit partial response for real-time streaming
            if (currentText !== lastText && currentText.trim().length > 0) {
                ipcRenderer.send('chatgpt-response-partial', currentText);
            }
            lastText = currentText;
        }
        
        // Log status occasionally
        if (attempts % 4 === 0) {
             const snippet = currentText.replace(/\n/g, ' ').substring(0, 50);
             log(`Monitoring: Stable=${stabilityCount}, Streaming=${!!isStreaming}, TextLen=${currentText.length}, Snippet="${snippet}..."`);
        }

        // If stable for 2.5 seconds (5 checks)
        if (stabilityCount >= 5) {
            clearInterval(responseCheckInterval);
            log(`Response stabilized (Len: ${currentText.length}). Sending back to main.`);
            ipcRenderer.send('chatgpt-response-extracted', currentText);
        }
        
    }, 500);
};

const injectPrompt = async (prompt) => {
    // Determine if we are "stuck" - if isInjecting is true but it's been > 3s, reset.
    // Basic debounce/locking
    if (window.isInjecting) {
        log('Checking flag: Already injecting/processing. Skipping duplicate request.');
        return;
    }
    window.isInjecting = true;
    
    log('Starting injection sequence...');
    
    // reset flag after 2 seconds max
    setTimeout(() => { window.isInjecting = false; }, 2000);

    // Try multiple selectors for textarea
    const textarea = document.querySelector('#prompt-textarea') || 
                     document.querySelector('div[contenteditable="true"]');
    
    if (!textarea) {
        log('CRITICAL: Textarea not found via any selector');
        window.isInjecting = false;
        return;
    }
    log('Textarea found. Focusing and inserting text...');

    textarea.focus();
    // Clear existing text to prevent accumulation (the "blocked by old prompt" issue)
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    
    // Use execCommand for better compatibility with React synthetic events
    document.execCommand('insertText', false, prompt);
    
    // Dispatch events to ensure React state updates and button enables
    textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    
    log('Text inserted and events dispatched. Looking for Send button...');

    // Try multiple selectors for Send button
    const sendButtonSelectors = [
        'button[data-testid="send-button"]',
        'button[aria-label="Send prompt"]',
        'button[aria-label="Send"]'
    ];
    
    let sendButton = null;
    for (const selector of sendButtonSelectors) {
        const btn = document.querySelector(selector);
        if (btn) {
            log(`Found send button immediately via: ${selector}`);
            sendButton = btn;
            break;
        }
    }

    if (!sendButton) {
        log('Send button not found immediately. Waiting...');
        // Short wait
        await new Promise(r => setTimeout(r, 500));
        for (const selector of sendButtonSelectors) {
             const btn = document.querySelector(selector);
             if (btn) {
                 sendButton = btn;
                 break;
             }
        }
    }

    if (sendButton) {
        log('Send button acquired. Checking if disabled...');
        if (sendButton.disabled) {
            log('WARNING: Send button is disabled. Input events might have failed.');
        }
        
        setTimeout(() => {
            log('Clicking Send button...');
            sendButton.click();
            
            // Backup: Press Enter if click fails
            try {
                const enterEvent = new KeyboardEvent('keydown', {
                    bubbles: true, cancelable: true, keyCode: 13, key: 'Enter'
                });
                textarea.dispatchEvent(enterEvent);
            } catch (e) {
                log('Error dispatching Enter key: ' + e.message);
            }

            startObservingResponse();
        }, 500);
    } else {
        log('CRITICAL: Send button not found after wait.');
    }
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
                    input.value = ''; // Reset to force change event
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
        const textarea = deepQuerySelector('#prompt-textarea') || 
                         deepQuerySelector('div[contenteditable="true"]') ||
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
            textarea.dispatchEvent(event);
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

// Poll for readiness and pull prompt/file
setInterval(async () => {
    const textarea = document.querySelector('#prompt-textarea') || document.querySelector('div[contenteditable="true"]');
    if (textarea) {
        try {
            // Check for prompt
            const prompt = await ipcRenderer.invoke('check-for-prompt');
            if (prompt) {
                log('Pulled pending prompt from main');
                injectPrompt(prompt);
            }
            
            // Check for file attachment
            const filePath = await ipcRenderer.invoke('check-for-attach-file');
            if (filePath) {
                log(`Pulled pending attachment: ${filePath}`);
                simulateFileDrop(filePath);
            }
        } catch (e) {
            log('Error checking for actions: ' + e.message);
        }
    }
}, 1000);

// Startup log
log('ChatGPT Preload Script Loaded & Ready (Native File Support Enabled)');
