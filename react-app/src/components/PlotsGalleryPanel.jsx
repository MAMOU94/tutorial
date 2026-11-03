import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Download,
  Trash2,
  Copy,
  Check,
  X,
  Pencil,
} from 'lucide-react';

const PlotCard = memo(function PlotCard({
  plot,
  index,
  isSelected,
  onSelect,
  renderPlotMedia,
  getPlotMediaType,
  handleCopy,
  handleDownload,
  onDeletePlot,
  copiedId
}) {
  return (
    <div
      onClick={() => onSelect(plot, index)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(plot, index);
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
      aria-label={`Open ${plot.title || `plot ${index + 1}`} fullscreen`}
    >
      <div className="flex min-h-[190px] items-center justify-center bg-white p-2">
        {renderPlotMedia(plot, 'max-h-[260px] min-h-[190px] w-full object-contain', plot.title || `Plot ${index + 1}`)}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-zinc-800 bg-[#141414] px-3 py-2">
        <span className="truncate text-[11px] font-semibold text-zinc-200">
          {plot.title || `Plot ${index + 1}`}
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
              {copiedId === (plot.id || index) ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            </button>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleDownload(plot);
            }}
            className="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-100"
            title={plot.editable === true ? 'Download plot and editable package' : 'Download plot'}
            aria-label="Download plot"
          >
            <Download size={11} />
          </button>
          {onDeletePlot && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDeletePlot(plot.id || index);
              }}
              className="flex h-6 w-6 items-center justify-center rounded border border-rose-900/70 bg-rose-950/40 text-rose-300 hover:text-white"
              title="Delete plot"
              aria-label="Delete plot"
            >
              <Trash2 size={11} />
            </button>
          )}
          <span className="ml-1 font-mono text-[9px] text-zinc-500">#{index + 1}</span>
        </div>
      </div>
    </div>
  );
});

export default function PlotsGalleryPanel({
  plots = [],
  onClearPlots,
  onDeletePlot,
  initialPlotId = null,
  onEditPlot,
  onDownloadPlot,
  editorPlot = null,
  renderEditor
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
  const [editorPanelWidth, setEditorPanelWidth] = useState(470);
  const [isResizingEditor, setIsResizingEditor] = useState(false);
  // True once the expanded overlay has been shown at least once in this session
  // (avoids re-triggering the scale-in animation when clicking Edit on an already-open plot)
  const overlayEverShownRef = useRef(false);
  const lastEditorPlotIdentityRef = useRef('');
  const editorResultIdentity = `${editorPlot?.analysisResultId || editorPlot?.analysis_result_id || ''}:${editorPlot?.plotKey || editorPlot?.plot_key || ''}`;
  const editorPlotIdentity = editorPlot
    ? String(editorPlot?.id || (editorResultIdentity !== ':' ? editorResultIdentity : (editorPlot?.url || editorPlot?.base64 || ''))).trim()
    : '';

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
    if (!expandedPlot) return;
    const expandedId = String(expandedPlot?.id || expandedPlot?.url || expandedPlot?.base64 || '').trim();
    const updatedPlot = plots.find((plot) => (
      String(plot?.id || plot?.url || plot?.base64 || '').trim() === expandedId
    ));
    if (updatedPlot) {
      setExpandedPlot(updatedPlot);
    } else {
      setExpandedPlot(null);
    }
  }, [expandedPlot, plots]);

  useEffect(() => {
    if (!expandedPlot) return undefined;
    // Only animate the entrance scale if the overlay wasn't already visible
    if (overlayEverShownRef.current) {
      // Already open – skip the scale-in so the plot doesn't jump
      setIsExpandedReady(true);
      return undefined;
    }
    const frameId = window.requestAnimationFrame(() => {
      setIsExpandedReady(true);
      overlayEverShownRef.current = true;
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [expandedPlot]);

  const openExpandedPlot = useCallback((plot) => {
    setIsExpandedClosing(false);
    setIsExpandedReady(false);
    overlayEverShownRef.current = false; // allow entrance animation for fresh open
    setExpandedPlot(plot);
  }, []);

  useEffect(() => {
    if (!editorPlot) {
      lastEditorPlotIdentityRef.current = '';
      return;
    }
    const getIdentity = (plot) => {
      const id = String(plot?.id || '').trim();
      if (id) return id;
      const resultId = String(plot?.analysisResultId || plot?.analysis_result_id || '').trim();
      const plotKey = String(plot?.plotKey || plot?.plot_key || '').trim();
      if (resultId || plotKey) return `${resultId}:${plotKey}:${String(plot?.title || '').trim()}`;
      return String(plot?.url || plot?.base64 || '').trim();
    };
    const editorIdentity = getIdentity(editorPlot);
    if (!editorIdentity || lastEditorPlotIdentityRef.current === editorIdentity) return;
    const matchingPlot = plots.find((plot) => getIdentity(plot) === editorIdentity)
      || plots.find((plot) => String(plot?.url || plot?.base64 || '').trim() === String(editorPlot?.url || editorPlot?.base64 || '').trim());
    if (!matchingPlot) return;
    lastEditorPlotIdentityRef.current = editorIdentity;
    // Only open the expanded overlay if the plot isn't already being shown.
    // Calling openExpandedPlot while the overlay is already open resets
    // isExpandedReady → false which causes the flash/glitch.
    if (getIdentity(expandedPlot) !== getIdentity(matchingPlot)) {
      openExpandedPlot(matchingPlot);
    }
  }, [editorPlot, expandedPlot, plots, openExpandedPlot]);


  const handleEditPlot = useCallback((plot) => {
    setIsExpandedClosing(false);
    onEditPlot?.(plot);
  }, [onEditPlot]);

  const closeExpandedPlot = useCallback(() => {
    setIsExpandedClosing(true);
    onEditPlot?.(null);
  }, [onEditPlot]);

  const onEditorResizeMouseDown = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsResizingEditor(true);
    const startX = event.clientX;
    const startWidth = editorPanelWidth;
    const onMove = (moveEvent) => {
      const delta = startX - moveEvent.clientX;
      setEditorPanelWidth(Math.max(260, Math.min(720, startWidth + delta)));
    };
    const onUp = () => {
      setIsResizingEditor(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [editorPanelWidth]);

  const getPlotMediaType = useCallback((plot) => {
    const declaredMediaType = String(plot?.mediaType || '').toLowerCase();
    const source = String(plot?.mimeType || plot?.base64 || plot?.url || '').toLowerCase();
    const fileName = String(plot?.fileName || '').toLowerCase();
    if (declaredMediaType === 'video' || source.includes('video/mp4') || /\.mp4$/.test(fileName)) return 'video';
    if (declaredMediaType === 'html' || source.includes('text/html') || /\.html?$/.test(fileName)) return 'html';
    return 'image';
  }, []);

  const getPlotSection = useCallback((plot) => {
    const explicitSection = String(
      plot?.gallerySection || plot?.gallery_section || plot?.modeGroup || plot?.mode_group || ''
    ).toLowerCase();
    const source = String(plot?.source || '').toLowerCase();
    const mode = String(plot?.mode || '').toLowerCase();

    if (explicitSection.includes('bioinfo') || source.includes('bioinfo') || mode.includes('bioinfo')) {
      return 'bioinfo';
    }
    if (
      explicitSection.includes('biostat')
      || source === 'analysis'
      || source === 'multi-analysis'
      || plot?.editable === true
    ) {
      return 'biostat';
    }
    return 'advanced';
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
    if (typeof onDownloadPlot === 'function') {
      onDownloadPlot(plot);
      return;
    }
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
  }, [getPlotExtension, onDownloadPlot]);

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

  const plotSections = useMemo(() => {
    const sectionDefinitions = [
      {
        key: 'biostat',
        label: 'Biostat Mode Plots'
      },
      {
        key: 'bioinfo',
        label: 'Bioinfo Mode Plots'
      },
      {
        key: 'advanced',
        label: 'Advanced Mode Plots'
      }
    ];
    return sectionDefinitions.map((section) => ({
      ...section,
      plots: plots
        .map((plot, index) => ({ plot, index }))
        .filter(({ plot }) => getPlotSection(plot) === section.key)
    }));
  }, [getPlotSection, plots]);

  const handleSelectPlot = useCallback((plot, index) => {
    setSelectedIndex(index);
    openExpandedPlot(plot);
  }, [openExpandedPlot]);

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
          Click a plot to preview it fullscreen, or use the edit button when available
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
            title={activePlot?.editable === true ? 'Download plot and editable package' : 'Download PNG to disk'}
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
        <div className="space-y-6">
          {plotSections.map((section) => {
            return (
              <section key={section.key} aria-labelledby={`plot-gallery-${section.key}`}>
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-2">
                  <div className="min-w-0">
                    <h3 id={`plot-gallery-${section.key}`} className="truncate text-xs font-black uppercase tracking-[0.12em] text-zinc-100">
                      {section.label}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                    {section.plots.length}
                  </span>
                </div>
                {section.plots.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {section.plots.map(({ plot, index }) => (
                      <PlotCard
                        key={plot.id || index}
                        plot={plot}
                        index={index}
                        isSelected={index === selectedIndex}
                        onSelect={handleSelectPlot}
                        renderPlotMedia={renderPlotMedia}
                        getPlotMediaType={getPlotMediaType}
                        handleCopy={handleCopy}
                        handleDownload={handleDownload}
                        onDeletePlot={onDeletePlot}
                        copiedId={copiedId}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-4 text-center text-[10px] text-zinc-600">
                    No plots in this section yet.
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {expandedPlot && (
        <div
          className={`absolute inset-0 z-30 flex flex-col bg-black/95 p-3 md:p-5 transition-opacity duration-[350ms] ease-out ${
            isExpandedReady && !isExpandedClosing ? 'opacity-100' : 'opacity-0'
          }`}
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
              {expandedPlot?.editable === true && typeof onEditPlot === 'function' && (
                <button
                  type="button"
                  onClick={() => handleEditPlot(expandedPlot)}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-cyan-700/70 bg-cyan-950/40 px-2 text-[10px] font-bold uppercase tracking-wide text-cyan-300 hover:bg-cyan-900/60 hover:text-cyan-100"
                  title="Edit plot"
                >
                  <Pencil size={12} />
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDownload(expandedPlot)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                title={expandedPlot?.editable === true ? 'Download plot and editable package' : 'Download plot'}
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
          <div
            className={`plot-gallery-editor-layout grid min-h-0 flex-1 overflow-hidden py-3 ${
              isResizingEditor ? '' : 'transition-[grid-template-columns] duration-[520ms] ease-[cubic-bezier(0.4,0,0.2,1)]'
            }`}
            style={{
              willChange: 'grid-template-columns',
              gridTemplateColumns: editorPlot && typeof renderEditor === 'function'
                ? `minmax(0, 1fr) 4px minmax(260px, min(42%, ${editorPanelWidth}px))`
                : 'minmax(0, 1fr) 0px 0px'
            }}
          >
            {/* Stage: background crossfades as soon as editorPlot intent is set */}
            <div className={`plot-gallery-expanded-stage ${
              editorPlot ? 'plot-gallery-expanded-stage-with-editor' : ''
            } flex min-w-0 items-center justify-center overflow-auto p-4 md:p-6`}>
              {renderPlotMedia(
                expandedPlot,
                `max-h-full max-w-full rounded-lg bg-white object-contain transition-[max-width,max-height,transform] duration-[480ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isExpandedReady && !isExpandedClosing ? 'scale-100' : 'scale-[0.97]'
                }`,
                expandedPlot.title || 'Expanded plot'
              )}
            </div>
            {editorPlot && typeof renderEditor === 'function' && (
              <>
                {/* Divider – fades in with a slight delay after column opens */}
                <div
                  key={`divider-${editorPlotIdentity}`}
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize plot editor panel"
                  onMouseDown={onEditorResizeMouseDown}
                  className="plot-gallery-editor-divider-entering group relative z-10 w-1 shrink-0 cursor-col-resize border-l border-r border-white/[0.06] bg-black/40 hover:bg-cyan-500/70 active:bg-cyan-500 transition-colors duration-150"
                  title="Drag to resize editor panel"
                >
                  <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex flex-col items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="h-0.5 w-0.5 rounded-full bg-cyan-400" />
                    ))}
                  </div>
                </div>
                {/* Editor panel – slides in from the right using GPU-composited @keyframes */}
                <div
                  key={`editor-${editorPlotIdentity}`}
                  className="plot-gallery-editor-panel-entering relative h-full min-w-0 overflow-hidden border-l border-zinc-800/80 bg-[#0a0a0a]"
                  style={{ width: '100%' }}
                >
                  {renderEditor(
                    editorPlot,
                    () => onEditPlot?.(null),
                    { panelOnly: true }
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
