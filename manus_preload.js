const { ipcRenderer } = require('electron');

// Log helper
const log = (msg) => ipcRenderer.send('log-debug', `[Manus] ${msg}`);

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

const startObservingResponse = () => {
    log('Starting response observation loop...');
    
    let lastText = '';
    let stabilityCount = 0;
    let attempts = 0;
    
    const responseCheckInterval = setInterval(() => {
        attempts++;
        
        // Generic Selectors
        const selectors = [
            '.markdown-body',
            'div[class*="message"] div[class*="content"]',
            '.prose',
            'div[aria-label*="Manus"]', // Hypothetical
            'div[class*="bot-message"]'
        ];
        
        let candidates = [];
        for (const sel of selectors) {
            const found = document.querySelectorAll(sel);
            if (found.length > 0) candidates = [...candidates, ...Array.from(found)];
        }
        
        // Fallback: search for any div with significant text
        if (candidates.length === 0) {
            const divs = document.querySelectorAll('div');
            candidates = Array.from(divs).filter(el => {
                const text = el.innerText || '';
                return text.length > 50 && !el.querySelector('textarea') && !el.isContentEditable;
            });
        }

        if (candidates.length === 0) {
            if (attempts % 10 === 0) log('Waiting for response container...');
            return;
        }

        const lastMessage = candidates[candidates.length - 1];
        const currentText = lastMessage.innerText;
        
        // Stop button check to detect streaming
        const stopButton = document.querySelector('button[aria-label*="Stop"]') || 
                           document.querySelector('div[class*="stop"]');
                           
        const isStreaming = !!stopButton;

        if (currentText === lastText && currentText.trim().length > 0 && !isStreaming) {
            stabilityCount++;
        } else {
            stabilityCount = 0;
            lastText = currentText;
        }
        
        if (attempts % 10 === 0) {
             const snippet = currentText.length > 30 ? currentText.substring(0, 30) + '...' : currentText;
             log(`Monitoring: Stable=${stabilityCount}, Streaming=${isStreaming}, TextLen=${currentText.length}, Snippet="${snippet}"`);
        }

        // Stabilize over 5 checks (2.5s)
        if (stabilityCount >= 5) {
            clearInterval(responseCheckInterval);
            log(`Response stabilized (Len: ${currentText.length}). Sending back to main.`);
            ipcRenderer.send('manus-response-extracted', currentText);
        }
        
        if (attempts > 300) { // 150s timeout
             clearInterval(responseCheckInterval);
             log('Response timeout.');
        }
        
    }, 500);
};

const injectPrompt = async (prompt) => {
    if (window.isInjecting) return;
    window.isInjecting = true;
    
    log('Starting injection sequence...');
    setTimeout(() => { window.isInjecting = false; }, 5000);

    // Input selectors
    const editorSelectors = [
        'textarea',
        '[contenteditable="true"]',
        '#prompt-textarea'
    ];

    let editor = null;
    for (const sel of editorSelectors) {
        editor = document.querySelector(sel);
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
    
    // Attempt standard insertion
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    if (editor.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(editor, prompt);
    } else {
        editor.value = prompt;
        editor.innerText = prompt;
    }
    
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    
    await new Promise(r => setTimeout(r, 500));

    // Send button selectors
    const sendButtonSelectors = [
        'button[aria-label*="Send"]',
        'button[type="submit"]',
        'div[class*="send"]'
    ];
    
    let sendButton = null;
    for (const selector of sendButtonSelectors) {
        const btns = document.querySelectorAll(selector);
        for (const btn of btns) {
             // Basic visibility check
            if (btn.offsetParent !== null) {
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
        log('Send button not found. Using Enter key...');
        const keyOpts = { bubbles: true, cancelable: true, keyCode: 13, key: 'Enter', code: 'Enter' };
        editor.dispatchEvent(new KeyboardEvent('keydown', keyOpts));
        editor.dispatchEvent(new KeyboardEvent('keyup', keyOpts));
    }
    
    setTimeout(startObservingResponse, 1000);
};

ipcRenderer.on('inject-prompt', (event, prompt) => {
    log('Received push prompt');
    injectPrompt(prompt);
});

setInterval(async () => {
    try {
        const prompt = await ipcRenderer.invoke('check-for-prompt');
        if (prompt) {
            log('Pulled pending prompt');
            injectPrompt(prompt);
        }
    } catch (e) {}
}, 1000);

log('Manus Preload Script Loaded & Ready');
