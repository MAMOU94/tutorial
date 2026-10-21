import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const Terminal = forwardRef(({ isVisible, onCodeDetected, initialDirectory, terminalCommand = '' }, ref) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const isCapturingRef = useRef(false);
  const isAlternateScreenRef = useRef(false);
  const lineBufferRef = useRef('');
  const captureModeRef = useRef('');
  const capturedCodeRef = useRef('');
  const patchFlushTimerRef = useRef(null);
  const onCodeDetectedRef = useRef(onCodeDetected);
  const hasStartedSessionRef = useRef(false);
  const launchedCommandRef = useRef('');
  const [isReady, setIsReady] = React.useState(false);

  const MAX_CODE_DETECTION_BUFFER = 12000;

  useEffect(() => {
    onCodeDetectedRef.current = onCodeDetected;
  }, [onCodeDetected]);

  const stripAnsi = (str) => {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  };

  const fitAndRefresh = () => {
    try {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
      if (xtermRef.current) {
        xtermRef.current.refresh(0, Math.max(0, xtermRef.current.rows - 1));
        if (!isAlternateScreenRef.current) {
          xtermRef.current.scrollToBottom();
        }
        xtermRef.current.focus();
      }
    } catch (e) {
      console.warn('Terminal fit failed:', e);
    }
  };

  // 1. Initialize xterm.js instance ONCE
  useEffect(() => {
    if (!isVisible || !terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      letterSpacing: 0.5,
      scrollback: 50000,
      fontFamily: '"Cascadia Code", "JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
      convertEol: false,
      disableStdin: false,
      allowTransparency: false,
      macOptionIsMeta: true,
      rightClickSelectsWord: true,
      allowProposedApi: true,
      theme: {
        background: '#0a0a0a',
        foreground: '#e6edf3',
        cursor: '#4ade80',
        cursorAccent: '#0a0a0a',
        selectionBackground: '#264f78',
        selectionForeground: '#ffffff',
        selectionInactiveBackground: '#1e3852',
        black: '#000000',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#d0d7de',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    // Track alternate buffer transitions (TUI mode for opencode, cline, ollama, htop, etc.)
    term.buffer.onBufferChange((buffer) => {
      const isAlt = buffer.type === 'alternate';
      isAlternateScreenRef.current = isAlt;
      if (isAlt) {
        // Reset any pending code capture
        isCapturingRef.current = false;
        lineBufferRef.current = '';
        captureModeRef.current = '';
        capturedCodeRef.current = '';
      } else {
        term.scrollToBottom();
      }
    });

    // Native terminal keyboard shortcuts (Ctrl+C copy if selected, Ctrl+V paste)
    term.attachCustomKeyEventHandler((event) => {
      // Ctrl+C with active selection -> copy selection
      if (event.type === 'keydown' && event.ctrlKey && !event.shiftKey && (event.key === 'c' || event.key === 'C') && term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection()).catch(() => {});
        return false;
      }
      // Ctrl+Shift+C -> copy selection
      if (event.type === 'keydown' && event.ctrlKey && event.shiftKey && (event.key === 'c' || event.key === 'C')) {
        if (term.hasSelection()) {
          navigator.clipboard.writeText(term.getSelection()).catch(() => {});
        }
        return false;
      }
      // Ctrl+V or Ctrl+Shift+V -> paste
      if (event.type === 'keydown' && event.ctrlKey && (event.key === 'v' || event.key === 'V')) {
        navigator.clipboard.readText().then((text) => {
          if (text && window.electronAPI) {
            window.electronAPI.sendTerminalData(text);
          }
        }).catch(() => {});
        return false;
      }
      return true;
    });

    // Right-click paste/copy handler
    const termElement = terminalRef.current;
    const handleContextMenu = (e) => {
      e.preventDefault();
      if (term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection()).catch(() => {});
        term.clearSelection();
      } else {
        navigator.clipboard.readText().then((text) => {
          if (text && window.electronAPI) {
            window.electronAPI.sendTerminalData(text);
          }
        }).catch(() => {});
      }
    };
    if (termElement) {
      termElement.addEventListener('contextmenu', handleContextMenu);
    }

    // Initial fit and signal readiness
    setTimeout(() => {
      try {
        fitAddon.fit();
        setIsReady(true);
        term.focus();
      } catch (e) {
        console.warn('Initial fit failed:', e);
      }
    }, 80);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    return () => {
      if (termElement) {
        termElement.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
      fitAddonRef.current = null;
      if (patchFlushTimerRef.current) {
        clearTimeout(patchFlushTimerRef.current);
        patchFlushTimerRef.current = null;
      }
      hasStartedSessionRef.current = false;
      setIsReady(false);
      launchedCommandRef.current = '';
      if (window.electronAPI?.stopTerminalSession) {
        window.electronAPI.stopTerminalSession();
      }
    };
  }, []);

  // 2. Manage Backend Session Connection (Start ONCE when ready)
  useEffect(() => {
    if (!isReady || !xtermRef.current || !window.electronAPI) return;
    const term = xtermRef.current;

    // Listen for data from backend
    const unregisterData = window.electronAPI.onTerminalData((data) => {
      // Let xterm's renderer process alternate-screen frames itself, like
      // VS Code's terminal does. Manual refreshes can interrupt synchronized
      // TUI updates from Cline/OpenCode.
      term.write(data);
      if (!isAlternateScreenRef.current) term.scrollToBottom();

      // --- Automatic Code Detection Logic (normal screen only) ---
      if (!onCodeDetectedRef.current || isAlternateScreenRef.current) return;

      const cleanData = stripAnsi(data);
      if (!isCapturingRef.current && !lineBufferRef.current && !/```(?:r\b)?|@@SEARCH/.test(cleanData)) return;
      lineBufferRef.current += cleanData;
      if (lineBufferRef.current.length > MAX_CODE_DETECTION_BUFFER) {
        lineBufferRef.current = lineBufferRef.current.slice(-MAX_CODE_DETECTION_BUFFER);
      }

      const lines = lineBufferRef.current.split(/\r?\n|\r/);
      lineBufferRef.current = lines.pop() || '';

      const resetCapture = () => {
        isCapturingRef.current = false;
        captureModeRef.current = '';
        capturedCodeRef.current = '';
        if (patchFlushTimerRef.current) {
          clearTimeout(patchFlushTimerRef.current);
          patchFlushTimerRef.current = null;
        }
      };

      const emitCapture = () => {
        const captured = capturedCodeRef.current.trim();
        resetCapture();
        if (captured && onCodeDetectedRef.current) {
          onCodeDetectedRef.current(captured);
        }
      };

      lines.forEach((rawLine) => {
        const line = String(rawLine || '');
        const trimmed = line.trim();

        if (!isCapturingRef.current) {
          if (/^```(?:r)?\s*$/i.test(trimmed)) {
            isCapturingRef.current = true;
            captureModeRef.current = 'fenced';
            capturedCodeRef.current = `${trimmed}\n`;
            return;
          }
          if (/^@@SEARCH\s*$/i.test(trimmed)) {
            isCapturingRef.current = true;
            captureModeRef.current = 'patch';
            capturedCodeRef.current = `${trimmed}\n`;
            return;
          }
          return;
        }

        if (captureModeRef.current === 'fenced') {
          const closingIndex = line.indexOf('```');
          if (closingIndex !== -1) {
            capturedCodeRef.current += line.slice(0, closingIndex) + '\n```';
            emitCapture();
            return;
          }
          capturedCodeRef.current += `${line}\n`;
          return;
        }

        if (patchFlushTimerRef.current && /^@@SEARCH\s*$/i.test(trimmed)) {
          clearTimeout(patchFlushTimerRef.current);
          patchFlushTimerRef.current = null;
        }
        if (patchFlushTimerRef.current && !/^@@SEARCH\s*$/i.test(trimmed)) {
          return;
        }

        capturedCodeRef.current += `${line}\n`;
        if (/^@@END\s*$/i.test(trimmed)) {
          patchFlushTimerRef.current = setTimeout(() => {
            if (captureModeRef.current === 'patch') emitCapture();
          }, 180);
        }
      });
    });

    // Listen for input from user
    const onDataListener = term.onData((data) => {
      // xterm paste events carry multiline text with LF separators. The
      // interactive R/Python line editors expect an Enter/CR for each line;
      // normalize only normal shell/REPL input and leave full-screen TUIs
      // such as OpenCode byte-for-byte unchanged.
      const terminalInput = !isAlternateScreenRef.current && /\r?\n/.test(data)
        ? String(data).replace(/\r\n/g, '\n').replace(/\n/g, '\r')
        : data;
      window.electronAPI.sendTerminalData(terminalInput);
    });
    // xterm sends terminal device-query replies (DA/DSR/kitty protocol) via
    // onBinary. Full-screen TUIs such as OpenCode wait for these responses.
    const onBinaryListener = term.onBinary((data) => {
      window.electronAPI.sendTerminalData(data);
    });

    // Handle resizing
    const onResizeListener = term.onResize(({ cols, rows }) => {
      window.electronAPI.resizeTerminalSession(cols, rows);
    });

    // Register every listener before spawning the shell. Fast full-screen TUIs
    // can draw immediately; VS Code follows the same ordering.
    if (!hasStartedSessionRef.current) {
      hasStartedSessionRef.current = true;
      term.clear();
      lineBufferRef.current = '';
      isCapturingRef.current = false;
      isAlternateScreenRef.current = false;
      captureModeRef.current = '';
      capturedCodeRef.current = '';

      const cols = Math.max(40, term.cols || 80);
      const rows = Math.max(10, term.rows || 24);
      window.electronAPI.startTerminalSession(cols, rows, initialDirectory);
    }

    return () => {
      unregisterData();
      onDataListener.dispose();
      onBinaryListener.dispose();
      onResizeListener.dispose();
      if (patchFlushTimerRef.current) {
        clearTimeout(patchFlushTimerRef.current);
        patchFlushTimerRef.current = null;
      }
    };
  }, [isReady]);

  useEffect(() => {
    if (!isVisible || !isReady || !xtermRef.current || !window.electronAPI) {
      if (!terminalCommand) launchedCommandRef.current = '';
      return undefined;
    }

    const term = xtermRef.current;
    const command = String(terminalCommand || '').trim();
    if (!command) {
      if (launchedCommandRef.current) {
        launchedCommandRef.current = '';
        window.electronAPI.sendTerminalData('\u0003');
      }
      return undefined;
    }
    if (launchedCommandRef.current === command) return undefined;

    const stopPreviousCommand = Boolean(launchedCommandRef.current);
    launchedCommandRef.current = command;
    if (stopPreviousCommand) window.electronAPI.sendTerminalData('\u0003');

    const timer = setTimeout(() => {
      try {
        if (terminalRef.current && terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
          if (fitAddonRef.current) fitAddonRef.current.fit();
          if (xtermRef.current) {
            const { cols, rows } = xtermRef.current;
            window.electronAPI.resizeTerminalSession(cols, rows);
          }
        }
      } catch (_) {}
      window.electronAPI.sendTerminalData(`${command}\r`);
      term.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, [isReady, isVisible, terminalCommand]);

  // Handle Visibility/Resize with ResizeObserver
  useEffect(() => {
    if (!terminalRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (isVisible && fitAddonRef.current) {
        fitAndRefresh();
      }
    });

    resizeObserver.observe(terminalRef.current);

    if (isVisible && fitAddonRef.current) {
      fitAndRefresh();
      setTimeout(fitAndRefresh, 50);
      setTimeout(fitAndRefresh, 200);
    }

    return () => resizeObserver.disconnect();
  }, [isVisible]);

  // Auto-focus terminal when it becomes visible
  useEffect(() => {
    if (isVisible && xtermRef.current) {
      setTimeout(() => {
        if (xtermRef.current) xtermRef.current.focus();
      }, 100);
    }
  }, [isVisible]);

  // Expose imperative methods to parent via ref
  useImperativeHandle(ref, () => ({
    clearTerminal: ({ restartCommand = true } = {}) => {
      if (xtermRef.current) {
        xtermRef.current.clear();
        xtermRef.current.reset();
        xtermRef.current.focus();
      }
      launchedCommandRef.current = '';
      // Restart the PTY session
      if (window.electronAPI) {
        const term = xtermRef.current;
        const cols = term ? Math.max(40, term.cols) : 80;
        const rows = term ? Math.max(10, term.rows) : 24;
        hasStartedSessionRef.current = true;
        window.electronAPI.startTerminalSession(cols, rows, initialDirectory);
        if (restartCommand && terminalCommand) {
          setTimeout(() => {
            launchedCommandRef.current = terminalCommand;
            window.electronAPI.sendTerminalData(`${terminalCommand}\r`);
            if (xtermRef.current) xtermRef.current.focus();
          }, 350);
        }
      }
    },
    focusTerminal: () => {
      if (xtermRef.current) xtermRef.current.focus();
    }
  }), [initialDirectory, terminalCommand]);

  return (
    <div className={`flex flex-col w-full h-full bg-[#0a0a0a] overflow-hidden transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <style>{`
        .xterm {
          height: 100%;
          padding: 6px 10px;
        }
        .xterm-viewport::-webkit-scrollbar {
          width: 5px;
        }
        .xterm-viewport::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        .xterm-viewport::-webkit-scrollbar-thumb {
          background: #2d2d2d;
          border-radius: 6px;
        }
        .xterm-viewport::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
        /* Remove the xterm focus outline — native terminals don't show one */
        .xterm:focus-visible { outline: none; }
        .xterm .xterm-screen { cursor: text; }
      `}</style>

      {/* Terminal Container — clean container without padding so FitAddon gets exact dimensions */}
      <div
        ref={terminalRef}
        className="flex-1 w-full h-full overflow-hidden"
        onClick={() => { if (xtermRef.current) xtermRef.current.focus(); }}
      />
    </div>
  );
});

export default Terminal;
