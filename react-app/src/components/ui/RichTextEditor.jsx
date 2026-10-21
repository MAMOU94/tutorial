import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { createPortal } from 'react-dom';

const FALLBACK_FONTS = ['Courier New', 'Arial', 'Georgia', 'Times New Roman', 'Verdana'];
const FALLBACK_FONT_SIZES = ['12', '14', '16', '18', '20', '24'];

const htmlLooksEmpty = (html) => {
  const plain = String(html || '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .trim();
  return plain.length === 0;
};

export default function RichTextEditor({
  value = '',
  onChange,
  isRTheme = false,
  fontFamily = 'Courier New',
  fontSize = '14',
  textColor = '#111111',
  onFontFamilyChange,
  onFontSizeChange,
  onTextColorChange,
  fonts,
  fontSizes,
  placeholder = 'Write your text...'
}) {
  const editorRef = useRef(null);
  const selectionRef = useRef(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fontOptions = Array.isArray(fonts) && fonts.length > 0 ? fonts : FALLBACK_FONTS;
  const fontSizeOptions = Array.isArray(fontSizes) && fontSizes.length > 0 ? fontSizes : FALLBACK_FONT_SIZES;
  const isEmpty = useMemo(() => htmlLooksEmpty(value), [value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = String(value || '');
    if (editor.innerHTML !== html) {
      editor.innerHTML = html;
    }
  }, [value]);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isFullscreen]);

  const getEditorSelection = () => {
    if (typeof window === 'undefined') return null;
    const editor = editorRef.current;
    const sel = window.getSelection?.();
    if (!editor || !sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return null;
    return range;
  };

  const refreshSelectionState = () => {
    const range = getEditorSelection();
    const isSelected = Boolean(range && !range.collapsed && range.toString().trim().length > 0);
    setHasSelection(isSelected);
    if (range) selectionRef.current = range.cloneRange();
  };

  useEffect(() => {
    const handleSelectionChange = () => refreshSelectionState();
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const saveSelection = () => {
    const range = getEditorSelection();
    if (!range) return;
    selectionRef.current = range.cloneRange();
    refreshSelectionState();
  };

  const restoreSelection = () => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection?.();
    if (!sel || !selectionRef.current) return;
    sel.removeAllRanges();
    sel.addRange(selectionRef.current);
  };

  const updateValue = () => {
    const html = editorRef.current?.innerHTML || '';
    onChange?.(html);
    refreshSelectionState();
  };

  const runCommand = (command, commandValue = null, options = {}) => {
    const selectionRequired = options.selectionRequired !== false;
    if (typeof document === 'undefined') return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    if (selectionRequired) {
      const range = getEditorSelection();
      const hasText = Boolean(range && !range.collapsed && range.toString().trim().length > 0);
      if (!hasText) return;
    }
    document.execCommand(command, false, commandValue);
    saveSelection();
    updateValue();
  };

  const toolbarWrapClass = `flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 backdrop-blur ${
    isRTheme
      ? 'border-cyan-900/40 bg-[#0b1220]/70 shadow-[0_10px_30px_rgba(6,20,32,0.6)]'
      : 'border-slate-200/70 bg-white/70 shadow-[0_10px_30px_rgba(15,23,42,0.08)] dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]'
  }`;
  const toolbarBtnClass = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-semibold uppercase tracking-[0.18em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed ${
    isRTheme
      ? 'border-cyan-800/50 bg-gradient-to-b from-cyan-500/20 via-cyan-600/10 to-transparent text-cyan-100 hover:border-cyan-400/60 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_8px_20px_rgba(2,132,199,0.25)] focus-visible:ring-cyan-300/40 focus-visible:ring-offset-[#0b1220]'
      : 'border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 text-slate-700 hover:border-slate-300 hover:shadow-[0_6px_18px_rgba(15,23,42,0.12)] focus-visible:ring-cyan-300/50 focus-visible:ring-offset-white dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:shadow-[0_6px_18px_rgba(0,0,0,0.35)] dark:focus-visible:ring-cyan-400/40 dark:focus-visible:ring-offset-slate-900'
  }`;
  const selectClass = `rounded-full border px-3 py-1.5 text-[11px] font-semibold outline-none transition-all shadow-sm ${
    isRTheme
      ? 'border-cyan-900/35 bg-[#0b1220] text-slate-100 focus:ring-2 focus:ring-cyan-400/25 focus:border-cyan-400/70'
      : 'border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-cyan-300/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
  }`;
  const toolbarPillClass = `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
    isRTheme
      ? 'border-cyan-900/40 bg-[#0b1220] text-cyan-100'
      : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
  }`;

  const editorPanelClass = isFullscreen
    ? `fixed inset-3 z-[100001] rounded-2xl border p-3 flex flex-col gap-2 ${
      isRTheme
        ? 'border-cyan-900/45 bg-[#0f172a]'
        : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'
    }`
    : 'space-y-2';

  const editorBody = (
    <div className={editorPanelClass}>
      <div className={toolbarWrapClass}>
        <select
          value={fontFamily}
          onChange={(e) => onFontFamilyChange?.(e.target.value)}
          className={selectClass}
          title="Font family"
        >
          {fontOptions.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
        <select
          value={fontSize}
          onChange={(e) => onFontSizeChange?.(e.target.value)}
          className={selectClass}
          title="Font size"
        >
          {fontSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>
        <button type="button" className={toolbarBtnClass} disabled={!hasSelection} onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand('bold', null, { selectionRequired: true })}>Bold</button>
        <button type="button" className={toolbarBtnClass} disabled={!hasSelection} onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand('italic', null, { selectionRequired: true })}>Italic</button>
        <button type="button" className={toolbarBtnClass} disabled={!hasSelection} onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand('underline', null, { selectionRequired: true })}>Underline</button>
        <button type="button" className={toolbarBtnClass} disabled={!hasSelection} onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand('justifyLeft', null, { selectionRequired: true })}>Left</button>
        <button type="button" className={toolbarBtnClass} disabled={!hasSelection} onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand('justifyCenter', null, { selectionRequired: true })}>Center</button>
        <button type="button" className={toolbarBtnClass} disabled={!hasSelection} onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand('justifyRight', null, { selectionRequired: true })}>Right</button>
        <button type="button" className={toolbarBtnClass} disabled={!hasSelection} onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand('insertUnorderedList', null, { selectionRequired: true })}>Bullets</button>
        <button type="button" className={toolbarBtnClass} disabled={!hasSelection} onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand('insertOrderedList', null, { selectionRequired: true })}>Numbers</button>
        <button type="button" className={toolbarBtnClass} disabled={!hasSelection} onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand('removeFormat', null, { selectionRequired: true })}>Clear</button>
        <button type="button" className={toolbarBtnClass} onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand('undo', null, { selectionRequired: false })}>Undo</button>
        <button type="button" className={toolbarBtnClass} onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand('redo', null, { selectionRequired: false })}>Redo</button>
        <label className={toolbarPillClass}>
          Color
          <input
            type="color"
            value={textColor}
            disabled={!hasSelection}
            onChange={(e) => {
              const next = e.target.value;
              onTextColorChange?.(next);
              runCommand('foreColor', next, { selectionRequired: true });
            }}
            className="h-5 w-7 cursor-pointer rounded border-none bg-transparent p-0"
            title="Text color"
          />
        </label>
        <button
          type="button"
          className={toolbarBtnClass}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setIsFullscreen((prev) => !prev)}
          title={isFullscreen ? 'Exit full screen (Esc)' : 'Open full screen'}
        >
          {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          {isFullscreen ? 'Exit' : 'Full'}
        </button>
      </div>

      <div className={`relative ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
        {isEmpty && (
          <div className={`pointer-events-none absolute left-3 top-3 text-sm ${
            isRTheme ? 'text-slate-500' : 'text-slate-400 dark:text-slate-500'
          }`}>
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={updateValue}
          onBlur={saveSelection}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          className={`w-full rounded-xl border px-3 py-3 outline-none transition-colors whitespace-pre-wrap break-words ${
            isFullscreen ? 'h-full min-h-0 overflow-auto' : 'min-h-[180px]'
          } ${
            isRTheme
              ? 'border-cyan-900/35 bg-[#d9d9d9] text-black focus-within:ring-2 focus-within:ring-cyan-400/20 focus-within:border-cyan-400/70 shadow-inner shadow-black/10'
              : 'border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 focus-within:ring-2 focus-within:ring-cyan-300/40'
          }`}
          style={{
            fontFamily,
            fontSize: `${fontSize}px`,
            lineHeight: 1.55
          }}
        />
      </div>
      <div className={`text-[10px] ${isRTheme ? 'text-slate-300/75' : 'text-slate-500 dark:text-slate-400'}`}>
        Formatting and color apply only to selected text.
      </div>
    </div>
  );

  if (isFullscreen && typeof document !== 'undefined') {
    return createPortal(
      <>
        <div className="fixed inset-0 z-[100000] bg-black/45 backdrop-blur-sm" />
        {editorBody}
      </>,
      document.body
    );
  }

  return editorBody;
}
