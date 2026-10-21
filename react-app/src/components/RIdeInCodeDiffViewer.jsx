import React, { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';

/**
 * RIdeInCodeDiffViewer
 * Renders an inline diff directly inside the editor area.
 * Red areas highlight deleted lines (-), green areas highlight added lines (+).
 * Minimal top bar with only Apply and Discard buttons.
 */
const RIdeInCodeDiffViewer = ({
  pendingChange,
  onApprove,
  onReject,
  onRunChunk = null,
  isLoading = false,
  isAyuDarkTheme = false
}) => {
  const containerRef = useRef(null);
  const firstChangeRef = useRef(null);

  const unifiedDiff = Array.isArray(pendingChange?.unifiedDiff) ? pendingChange.unifiedDiff : [];
  const additions = Number.isInteger(pendingChange?.additions)
    ? pendingChange.additions
    : unifiedDiff.filter(line => line.type === 'add').length;
  const deletions = Number.isInteger(pendingChange?.deletions)
    ? pendingChange.deletions
    : unifiedDiff.filter(line => line.type === 'del').length;

  // Auto-scroll to the first changed line upon mount
  useEffect(() => {
    if (firstChangeRef.current) {
      const timer = setTimeout(() => {
        firstChangeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pendingChange]);

  // Keyboard shortcut handler: Ctrl+Enter to Apply, Escape to Discard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading && onApprove) onApprove();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (!isLoading && onReject) onReject();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onApprove, onReject, isLoading]);

  let hasMarkedFirstChange = false;
  const chunkStartPattern = /^\s*```\s*\{\s*r(?:\s|,|})/i;
  const hasVisibleChunkStart = unifiedDiff.some((line) => (
    line.type !== 'del' && chunkStartPattern.test(String(line.text || ''))
  ));
  const firstAddedIndex = unifiedDiff.findIndex((line) => line.type === 'add');

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full w-full select-text overflow-hidden relative"
      style={{ background: isAyuDarkTheme ? '#0b0f19' : '#0d1117' }}
    >
      {/* ── Minimal Sticky Action Bar ── */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-3.5 py-1.5 bg-[#141414]/95 backdrop-blur-md border-b border-[#262626] shadow-sm">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-emerald-400 font-bold">+{additions}</span>
          <span className="text-rose-400 font-bold">-{deletions}</span>
          {pendingChange?.model && (
            <span className="text-zinc-400 text-[10.5px] truncate max-w-[180px]">
              {pendingChange.model}
            </span>
          )}
        </div>

        {/* Action Buttons: Apply & Discard */}
        <div className="flex items-center gap-2 shrink-0">
          {onRunChunk && !hasVisibleChunkStart && firstAddedIndex >= 0 && (
            <button
              type="button"
              onClick={onRunChunk}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-100 bg-emerald-700/90 hover:bg-emerald-600 border border-emerald-400/50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              title="Run the active R Markdown chunk"
            >
              ▶ Run
            </button>
          )}
          <button
            type="button"
            onClick={onApprove}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10.5px] font-bold uppercase tracking-wider text-white bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400/40 shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            title="Apply changes directly into code (Ctrl+Enter)"
          >
            <Check size={12} strokeWidth={2.5} />
            <span>Apply</span>
          </button>

          <button
            type="button"
            onClick={onReject}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10.5px] font-bold uppercase tracking-wider text-white bg-rose-600/80 hover:bg-rose-500 border border-rose-400/40 shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            title="Discard changes (Esc)"
          >
            <X size={12} strokeWidth={2.5} />
            <span>Discard</span>
          </button>
        </div>
      </div>

      {/* ── In-Code Diff Display ── */}
      <div className="flex-1 overflow-auto font-mono text-[13px] leading-relaxed py-1 select-text">
        {unifiedDiff.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-xs">
            No diff lines available to display.
          </div>
        ) : (
          <table className="w-full border-collapse font-mono text-xs">
            <tbody>
              {unifiedDiff.map((line, idx) => {
                const isDel = line.type === 'del';
                const isAdd = line.type === 'add';

                let rowRef = null;
                if (!hasMarkedFirstChange && (isDel || isAdd)) {
                  rowRef = firstChangeRef;
                  hasMarkedFirstChange = true;
                }

                const rowBg = isDel
                  ? 'bg-rose-950/35 hover:bg-rose-950/50'
                  : isAdd
                    ? 'bg-emerald-950/35 hover:bg-emerald-950/50'
                    : 'hover:bg-white/[0.02]';

                const borderLeft = isDel
                  ? 'border-l-4 border-rose-500'
                  : isAdd
                    ? 'border-l-4 border-emerald-500'
                    : 'border-l-4 border-transparent';

                const textClass = isDel
                  ? 'text-rose-200 font-mono font-medium'
                  : isAdd
                    ? 'text-emerald-200 font-mono font-semibold'
                    : 'text-zinc-300 font-mono';

                const marker = isDel ? '-' : isAdd ? '+' : ' ';
                const markerClass = isDel
                  ? 'text-rose-400 font-black'
                  : isAdd
                    ? 'text-emerald-400 font-black'
                    : 'text-transparent';

                return (
                  <tr
                    key={`in-code-diff-${idx}`}
                    ref={rowRef}
                    className={`${rowBg} ${borderLeft} transition-colors group`}
                  >
                    {/* Old line number */}
                    <td className="w-10 px-2 py-0.5 text-right select-none text-[11px] font-mono text-zinc-600 group-hover:text-zinc-400 border-r border-[#21262d]/50">
                      {line.oldLine ?? ''}
                    </td>

                    {/* New line number */}
                    <td className="w-10 px-2 py-0.5 text-right select-none text-[11px] font-mono text-zinc-600 group-hover:text-zinc-400 border-r border-[#21262d]/50">
                      {line.newLine ?? ''}
                    </td>

                    {/* Sign marker: - for del, + for add */}
                    <td className={`w-6 px-1.5 py-0.5 text-center select-none text-xs ${markerClass}`}>
                      {marker}
                    </td>

                    {/* Code Content */}
                    <td className={`relative py-0.5 px-2 whitespace-pre-wrap break-all ${textClass}`}>
                      {line.text || ' '}
                      {onRunChunk && !isDel && (
                        (chunkStartPattern.test(String(line.text || ''))
                          || (!hasVisibleChunkStart && isAdd && idx === firstAddedIndex))
                      ) && (
                        <button
                          type="button"
                          onClick={onRunChunk}
                          disabled={isLoading}
                          className="float-right ml-3 inline-flex items-center rounded-md px-1.5 py-0 text-[10px] font-semibold leading-4 text-emerald-100 bg-emerald-700/90 hover:bg-emerald-600 border border-emerald-400/50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          title="Run the active R Markdown chunk"
                        >
                          ▶ Run
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RIdeInCodeDiffViewer;
