import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Download,
  Trash2,
  Copy,
  Check,
  X,
} from 'lucide-react';

export default function PlotsGalleryPanel({
  plots = [],
  onClearPlots,
  onDeletePlot,
  initialPlotId = null
}) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const requestedId = String(initialPlotId || '').trim();
    const requestedIndex = requestedId
      ? plots.findIndex((plot) => String(plot?.id || plot?.url || plot?.base64 || '') === requestedId)
      : -1;
    return requestedIndex >= 0 ? requestedIndex : 0;
  });
  const [copiedId, setCopiedId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedPlot, setExpandedPlot] = useState(null);
  const [isExpandedReady, setIsExpandedReady] = useState(false);
  const [isExpandedClosing, setIsExpandedClosing] = useState(false);

  // Keep selected index within bounds
  useEffect(() => {
    if (plots.length === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= plots.length) {
      setSelectedIndex(plots.length - 1);
    }
  }, [plots.length, selectedIndex]);

  const activePlot = useMemo(() => {
    if (plots.length === 0) return null;
    return plots[selectedIndex] || plots[0] || null;
  }, [plots, selectedIndex]);

  useEffect(() => {
    const requestedId = String(initialPlotId || '').trim();
    if (!requestedId) return;
    const requestedIndex = plots.findIndex((plot) => String(plot?.id || plot?.url || plot?.base64 || '') === requestedId);
    if (requestedIndex >= 0) setSelectedIndex(requestedIndex);
  }, [initialPlotId, plots]);

  useEffect(() => {
    if (!expandedPlot) return undefined;
    const frameId = window.requestAnimationFrame(() => setIsExpandedReady(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [expandedPlot]);

  const openExpandedPlot = useCallback((plot) => {
    setIsExpandedClosing(false);
    setIsExpandedReady(false);
    setExpandedPlot(plot);
  }, []);

  const closeExpandedPlot = useCallback(() => {
    setIsExpandedClosing(true);
  }, []);

  const getPlotMediaType = useCallback((plot) => {
    const declaredMediaType = String(plot?.mediaType || '').toLowerCase();
    const source = String(plot?.mimeType || plot?.base64 || plot?.url || '').toLowerCase();
    const fileName = String(plot?.fileName || '').toLowerCase();
    if (declaredMediaType === 'video' || source.includes('video/mp4') || /\.mp4$/.test(fileName)) return 'video';
    if (declaredMediaType === 'html' || source.includes('text/html') || /\.html?$/.test(fileName)) return 'html';
    return 'image';
  }, []);

  const renderPlotMedia = useCallback((plot, className, altText) => {
    const source = plot?.base64 || plot?.url;
    const mediaType = getPlotMediaType(plot);
    if (mediaType === 'video') {
      return (
        <video
          src={source}
          controls
          muted
          playsInline
          preload="metadata"
          className={className}
          aria-label={altText}
          onClick={(event) => event.stopPropagation()}
        />
      );
    }
    if (mediaType === 'html') {
      return (
        <iframe
          src={source}
          title={altText}
          sandbox="allow-scripts allow-forms"
          loading="lazy"
          className={className}
          onClick={(event) => event.stopPropagation()}
        />
      );
    }
    return <img src={source} alt={altText} loading="lazy" decoding="async" className={className} />;
  }, [getPlotMediaType]);

  const getPlotExtension = useCallback((plot) => {
    const fileName = String(plot?.fileName || '').trim();
    const fileMatch = fileName.match(/\.(png|gif|webp|apng|mp4|html?)$/i);
    if (fileMatch) return fileMatch[1].toLowerCase();
    const dataMatch = String(plot?.base64 || plot?.url || '').match(/^data:([^/]+)\/([^;]+);/i);
    if (dataMatch?.[1]?.toLowerCase() === 'video' && dataMatch?.[2]?.toLowerCase() === 'mp4') return 'mp4';
    if (dataMatch?.[1]?.toLowerCase() === 'text' && dataMatch?.[2]?.toLowerCase() === 'html') return 'html';
    const mimeExtension = dataMatch?.[2]?.toLowerCase();
    return mimeExtension === 'gif' || mimeExtension === 'webp' || mimeExtension === 'apng'
      ? mimeExtension
      : 'png';
  }, []);

  const handleDownload = useCallback((plot) => {
    if (!plot) return;
    const extension = getPlotExtension(plot);
    if (window.electronAPI?.savePlotFile) {
      window.electronAPI.savePlotFile({
        base64: plot.base64 || plot.url,
        defaultName: `${(plot.title || 'plot').replace(/[^a-z0-9_-]/gi, '_')}.${extension}`
      });
      return;
    }
    const link = document.createElement('a');
    link.href = plot.base64 || plot.url;
    link.download = `${(plot.title || 'plot').replace(/[^a-z0-9_-]/gi, '_')}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [getPlotExtension]);

  const handleCopy = useCallback(async (plot) => {
    if ((!plot?.base64 && !plot?.url) || getPlotMediaType(plot) !== 'image') return;
    try {
      const dataUrl = plot.base64 || plot.url;
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || 'image/png']: blob })
      ]);
      setCopiedId(plot.id || selectedIndex);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (err) {
      console.warn('Copy to clipboard fallback:', err);
    }
  }, [getPlotMediaType, selectedIndex]);

  // Empty state
  if (plots.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
          No Plots Generated Yet
        </h3>
      </div>
    );
  }

  return (
    <div className="plot-gallery-root relative flex h-full min-h-0 flex-col overflow-hidden bg-[#111111] text-zinc-200 select-none">
      {/* ── Header Bar ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 bg-[#151515] px-3.5 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
            Plots Gallery
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/90 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
            {plots.length} {plots.length === 1 ? 'plot' : 'plots'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {showClearConfirm ? (
            <div className="flex items-center gap-1 animate-in fade-in duration-150">
              <span className="text-[10px] font-bold text-rose-300">Clear all?</span>
              <button
                type="button"
                onClick={() => {
                  onClearPlots?.();
                  setShowClearConfirm(false);
                }}
                className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white hover:bg-rose-500"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-[#1a1a1a] px-2 py-1 text-[10px] font-medium text-zinc-400 hover:border-rose-900/60 hover:bg-rose-950/40 hover:text-rose-200 transition-colors"
              title="Clear all generated plots"
            >
              <Trash2 size={11} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Gallery Controls Bar ── */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800/60 bg-[#181818] px-3.5 py-1.5">
        <span className="truncate text-[10px] font-medium text-zinc-500">
          Click any plot to open it fullscreen
        </span>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {/* Copy button */}
          {getPlotMediaType(activePlot) === 'image' && (
            <button
              type="button"
              onClick={() => handleCopy(activePlot)}
              className="flex h-6 w-6 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Copy image to clipboard"
            >
              {copiedId === (activePlot?.id || selectedIndex) ? (
                <Check size={11} className="text-emerald-400" />
              ) : (
                <Copy size={11} />
              )}
            </button>
          )}

          {/* Download button */}
          <button
            type="button"
            onClick={() => handleDownload(activePlot)}
            className="flex h-6 w-6 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Download PNG to disk"
          >
            <Download size={11} />
          </button>

          {/* Delete single plot */}
          {onDeletePlot && (
            <button
              type="button"
              onClick={() => onDeletePlot(activePlot?.id || selectedIndex)}
              className="flex h-6 w-6 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-rose-900 hover:text-rose-300 transition-colors"
              title="Delete this plot"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      <div className="plot-gallery-viewer min-h-0 flex-1 overflow-y-auto bg-[#0a0a0a] p-3 md:p-4 custom-scrollbar">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plots.map((plot, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={plot.id || idx}
                onClick={() => {
                  setSelectedIndex(idx);
                  openExpandedPlot(plot);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedIndex(idx);
                    openExpandedPlot(plot);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`group overflow-hidden rounded-xl border text-left shadow-lg transition-all hover:-translate-y-0.5 hover:border-cyan-400/70 hover:shadow-cyan-950/30 ${
                  isSelected
                    ? 'border-cyan-400 ring-2 ring-cyan-500/30'
                    : 'border-zinc-700/80'
                }`}
                title="Open plot fullscreen"
                aria-label={`Open ${plot.title || `plot ${idx + 1}`} fullscreen`}
              >
                <div className="flex min-h-[190px] items-center justify-center bg-white p-2">
                  {renderPlotMedia(
                    plot,
                    'max-h-[260px] min-h-[190px] w-full object-contain',
                    plot.title || `Plot ${idx + 1}`
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-zinc-800 bg-[#141414] px-3 py-2">
                  <span className="truncate text-[11px] font-semibold text-zinc-200">
                    {plot.title || `Plot ${idx + 1}`}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    {getPlotMediaType(plot) === 'image' && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCopy(plot);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-100"
                        title="Copy plot"
                        aria-label="Copy plot"
                      >
                        {copiedId === (plot.id || idx) ? (
                          <Check size={11} className="text-emerald-400" />
                        ) : (
                          <Copy size={11} />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDownload(plot);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-100"
                      title="Download plot"
                      aria-label="Download plot"
                    >
                      <Download size={11} />
                    </button>
                    {onDeletePlot && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeletePlot(plot.id || idx);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded border border-rose-900/70 bg-rose-950/40 text-rose-300 hover:text-white"
                        title="Delete plot"
                        aria-label="Delete plot"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                    <span className="ml-1 font-mono text-[9px] text-zinc-500">#{idx + 1}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {expandedPlot && (
        <div
          className={`absolute inset-0 z-30 flex flex-col bg-black/95 p-3 md:p-5 transition-opacity duration-200 ease-out ${isExpandedReady && !isExpandedClosing ? 'opacity-100' : 'opacity-0'}`}
          role="dialog"
          aria-modal="true"
          aria-label={expandedPlot.title || 'Plot viewer'}
          onTransitionEnd={(event) => {
            if (isExpandedClosing && event.target === event.currentTarget && event.propertyName === 'opacity') {
              setExpandedPlot(null);
              setIsExpandedClosing(false);
              setIsExpandedReady(false);
            }
          }}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <span className="truncate text-xs font-bold uppercase tracking-wider text-zinc-200">
              {expandedPlot.title || 'Plot'}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleDownload(expandedPlot)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                title="Download plot"
                aria-label="Download plot"
              >
                <Download size={14} />
              </button>
              {onDeletePlot && (
                <button
                  type="button"
                  onClick={() => {
                    closeExpandedPlot();
                    onDeletePlot(expandedPlot.id || selectedIndex);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-rose-900/70 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:text-white"
                  title="Delete plot"
                  aria-label="Delete plot"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={closeExpandedPlot}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                title="Close expanded plot"
                aria-label="Close expanded plot"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto py-3">
            {renderPlotMedia(
              expandedPlot,
              `max-h-full max-w-full rounded-lg bg-white object-contain transition-transform duration-200 ease-out ${isExpandedReady && !isExpandedClosing ? 'scale-100' : 'scale-95'}`,
              expandedPlot.title || 'Expanded plot'
            )}
          </div>
        </div>
      )}

    </div>
  );
}
