import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import rFileIcon from '../assets/r-file-icon.svg';
import rmdFileIcon from '../assets/rmd-file-icon.svg';
import pythonFileIcon from '../assets/python-file-icon.svg';
import ipynbFileIcon from '../assets/ipynb-file-icon.svg';

/**
 * EditorOpenedFilesBar
 * Dark themed opened files tab bar with a slightly deeper surface than the editor.
 * - Full width tabs container
 * - Auto-scrolls active tab into view
 * - Horizontal mouse wheel support
 * - Clean mini chevron arrows for left/right scroll when many files are open
 * - Thin scrollbar that appears during scroll and fades
 */
const EditorOpenedFilesBar = ({
  tabs = [],
  activeTabId = '',
  onSelectTab,
  onCloseTab,
  onNewTab
}) => {
  const scrollRef = useRef(null);
  const hideTimer = useRef(null);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 2;
    setCanScrollLeft(hasOverflow && el.scrollLeft > 4);
    setCanScrollRight(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, []);

  const handleScroll = () => {
    checkScroll();
    setShowScrollbar(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowScrollbar(false), 900);
  };

  const scrollByAmount = (offset) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Scroll active tab into view whenever it changes or when tabs list changes
  useEffect(() => {
    if (!scrollRef.current || !activeTabId) return;
    const activeEl = scrollRef.current.querySelector(`[data-tab-id="${CSS.escape(String(activeTabId))}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    checkScroll();
  }, [activeTabId, tabs.length, checkScroll]);

  // Support horizontal wheel scrolling when tabs overflow
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e) => {
      if (el.scrollWidth > el.clientWidth && e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        setShowScrollbar(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setShowScrollbar(false), 900);
        checkScroll();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [checkScroll]);

  // Re-check overflow on container resize
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => checkScroll());
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkScroll]);

  const getLanguageBadge = (lang) => {
    if (lang === 'python') {
      return (
        <img src={pythonFileIcon} alt="Python" className="h-4 w-4 shrink-0 aspect-square object-contain" title="Python Script" />
      );
    }
    return (
      <img src={rFileIcon} alt="R" className="h-4 w-4 shrink-0 aspect-square object-contain" title="R Script" />
    );
  };

  return (
    <>
      {/* Thin scrollbar style injected once */}
      <style>{`
        .tabs-scroll::-webkit-scrollbar { height: 3px; }
        .tabs-scroll::-webkit-scrollbar-track { background: transparent; }
        .tabs-scroll::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 2px;
          transition: background 0.2s;
        }
        .tabs-scroll.show-sb::-webkit-scrollbar-thumb { background: #4b5563; }
      `}</style>

      <div
        className="flex items-center border-b border-zinc-800 px-3 py-1 select-none z-10 w-full min-w-0"
        style={{ background: '#0b0b0b' }}
        role="tablist"
        aria-label="Opened script files"
      >
        {/* ── Left/Middle: Tabs List + New Tab (+) Button ── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`tabs-scroll flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 py-0.5 pr-2${showScrollbar ? ' show-sb' : ''}`}
          style={{ scrollbarWidth: 'thin', scrollbarColor: showScrollbar ? '#4b5563 transparent' : 'transparent transparent' }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isDirty = Boolean(tab.isDirty);

            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectTab && onSelectTab(tab.id)}
                className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[11px] font-mono transition-all cursor-pointer border shadow-sm shrink-0 ${
                  isActive
                    ? 'bg-[#242424] text-zinc-100 border-[#383838] font-semibold'
                    : 'bg-[#141414] hover:bg-[#1e1e1e] text-zinc-400 hover:text-zinc-200 border-[#262626] hover:border-[#383838]'
                }`}
                title={tab.path || `${tab.name} (Unsaved)`}
              >
                {/* Language Tag */}
                {tab.language === 'r' && (tab.documentMode === 'rmd' || /\.rmd$/i.test(String(tab.name || tab.path || '')))
                  ? <img src={rmdFileIcon} alt="R Markdown" className="h-4 w-4 shrink-0 aspect-square object-contain" title="R Markdown" />
                  : tab.language === 'python' && (tab.documentMode === 'ipynb' || /\.ipynb$/i.test(String(tab.name || tab.path || '')))
                    ? <img src={ipynbFileIcon} alt="Jupyter Notebook" className="h-4 w-4 shrink-0 aspect-square object-contain" title="Jupyter Notebook" />
                  : getLanguageBadge(tab.language)}

                {/* Tab Filename */}
                <span className="truncate max-w-[140px] text-[11px] tracking-wide">
                  {tab.name}
                </span>

                {/* Dirty Indicator / Close Button */}
                <div className="flex items-center ml-0.5 gap-1">
                  {isDirty && !isActive && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"
                      title="Unsaved changes"
                    />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCloseTab) onCloseTab(tab.id, e);
                    }}
                    className={`p-0.5 rounded text-zinc-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors ${
                      isActive ? 'opacity-80 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title={`Close ${tab.name}`}
                    aria-label={`Close ${tab.name}`}
                  >
                    <X size={10} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* New Tab (+) Button */}
          <button
            type="button"
            onClick={() => onNewTab && onNewTab()}
            className="inline-flex h-6 w-6 items-center justify-center rounded-xl transition-all bg-[#141414] hover:bg-[#1e1e1e] border border-[#262626] hover:border-[#383838] text-zinc-400 hover:text-zinc-200 shadow-sm shrink-0 cursor-pointer"
            title="New Script Tab"
            aria-label="New Script Tab"
          >
            <Plus size={11} strokeWidth={2.2} className="text-zinc-400" />
          </button>

          {/* Trailing spacer so the last item is fully visible before scroll edge */}
          <div className="shrink-0 w-3" aria-hidden="true" />
        </div>

        {/* ── Optional Scroll Arrows when overflow occurs ── */}
        {(canScrollLeft || canScrollRight) && (
          <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-zinc-800 ml-1">
            <button
              type="button"
              disabled={!canScrollLeft}
              onClick={() => scrollByAmount(-140)}
              className="inline-flex h-6 w-5 items-center justify-center rounded-lg transition-all text-zinc-400 hover:text-zinc-200 disabled:opacity-20 disabled:hover:text-zinc-400 hover:bg-[#1e1e1e] border border-transparent hover:border-[#262626] cursor-pointer disabled:cursor-not-allowed"
              title="Scroll tabs left"
              aria-label="Scroll tabs left"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              disabled={!canScrollRight}
              onClick={() => scrollByAmount(140)}
              className="inline-flex h-6 w-5 items-center justify-center rounded-lg transition-all text-zinc-400 hover:text-zinc-200 disabled:opacity-20 disabled:hover:text-zinc-400 hover:bg-[#1e1e1e] border border-transparent hover:border-[#262626] cursor-pointer disabled:cursor-not-allowed"
              title="Scroll tabs right"
              aria-label="Scroll tabs right"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default EditorOpenedFilesBar;
