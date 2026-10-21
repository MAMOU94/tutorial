import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  ShieldCheck,
  LayoutGrid,
  CheckSquare,
  Power,
  ChevronDown,
  Filter,
  PencilLine,
  Trash2,
  Database,
  Plus,
  Minus,
  Save,
  FileText,
  ArrowUpDown,
  Columns,
  Copy,
  ClipboardPaste,
  Scissors,
  Brush,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Bot,
  Calculator,
  GripVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline
} from 'lucide-react';
import DataExplorerAIAgent from './DataExplorerAIAgent.jsx';
import DataExplorerCalculations from './DataExplorerCalculations.jsx';

const DEFAULT_FLOATING_TOOL_PRESET = { width: 320, minWidth: 320, defaultX: 24, defaultY: 140, minHeight: 220 };

const FLOATING_TOOL_PRESETS = {
  rows: { width: 1280, minWidth: 520, defaultX: 24, defaultY: 138, minHeight: 320 },
  select: { width: 720, minWidth: 560, defaultX: 28, defaultY: 240, minHeight: 260 },
  clean: { width: 760, minWidth: 360, defaultX: 372, defaultY: 240, minHeight: 220 },
  columns: { width: 840, minWidth: 480, defaultX: 28, defaultY: 240, minHeight: 360 },
  ai: { width: 728, minWidth: 624, defaultX: 0, defaultY: 150, minHeight: 500, defaultHeight: 640 },
  summary: { width: 720, minWidth: 440, defaultX: 72, defaultY: 180, minHeight: 420, defaultHeight: 560 }
};
const FLOATING_TOOL_TRANSITION_MS = 300;
const STUDIO_PANEL_TRANSITION_MS = 300;
const AYU_SELECT_TRANSITION_MS = 220;
const CLEAN_MISSING_ROW_PREVIEW_LIMIT = 320;
const CLEAN_MISSING_MODE_OPTIONS = [
  { label: 'Remove rows with missing values', value: 'remove_rows' },
  { label: 'Fill with mean of previous 5', value: 'fill_prev5_mean' },
  { label: 'Fill with previous value', value: 'fill_previous' },
  { label: 'Machine learning prediction', value: 'ml_prediction' }
];
const CLEAN_MISSING_MODE_ACTION_LABELS = {
  remove_rows: 'Remove Rows With Missing Values',
  fill_prev5_mean: 'Fill Missing (Mean of Previous 5)',
  fill_previous: 'Fill Missing (Previous Value)',
  ml_prediction: 'Machine Learning Prediction'
};
const UNDO_RESTORE_OPTIONS = [
  { value: 'last', label: 'Timer', description: 'Restore the last change' },
  { value: '1m', label: 'About 1 minute ago' },
  { value: '5m', label: 'About 5 minutes ago' },
  { value: '15m', label: 'About 15 minutes ago' },
  { value: '30m', label: 'About 30 minutes ago' },
  { value: 'oldest', label: 'Oldest available' }
];

const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);
const getAnimatedPresenceDuration = (durationMs) => {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return 0;
  }
  return durationMs;
};

const useAnimatedPresence = (isOpen, durationMs) => {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    let frameId = null;
    let nestedFrameId = null;
    let timeoutId = null;
    const resolvedDuration = getAnimatedPresenceDuration(durationMs);

    if (isOpen) {
      setIsMounted(true);
      if (typeof requestAnimationFrame === 'function') {
        frameId = requestAnimationFrame(() => {
          nestedFrameId = requestAnimationFrame(() => {
            setIsVisible(true);
          });
        });
      } else {
        setIsVisible(true);
      }
    } else if (isMounted) {
      setIsVisible(false);
      timeoutId = setTimeout(() => {
        setIsMounted(false);
      }, resolvedDuration);
    } else {
      setIsVisible(false);
    }

    return () => {
      if (frameId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameId);
      }
      if (nestedFrameId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(nestedFrameId);
      }
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [durationMs, isMounted, isOpen]);

  return { isMounted, isVisible };
};

const CELL_COLOR_SWATCHES = [
  '#ffffff', '#f8fafc', '#fef3c7', '#fde68a', '#fecaca', '#fed7aa',
  '#d9f99d', '#bbf7d0', '#a7f3d0', '#bfdbfe', '#c7d2fe', '#ddd6fe',
  '#fbcfe8', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#334155'
];
const CELL_FONT_FAMILY_OPTIONS = [
  // Modern / Sans-serif
  { label: 'Arial', value: 'Arial, "Liberation Sans", Helvetica, sans-serif' },
  { label: 'Calibri', value: 'Calibri, Carlito, Candara, "Ubuntu Sans", "Segoe UI", Arial, sans-serif' },
  { label: 'Helvetica', value: '"Helvetica Neue", Helvetica, "Liberation Sans", Arial, sans-serif' },
  { label: 'Inter', value: 'Inter, "Ubuntu Sans", system-ui, -apple-system, sans-serif' },
  { label: 'Manrope', value: 'Manrope, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", "Ubuntu Sans", Arial, sans-serif' },
  { label: 'Roboto', value: 'Roboto, "Ubuntu Sans", "Segoe UI", Arial, sans-serif' },
  { label: 'Segoe UI', value: '"Segoe UI", "Ubuntu Sans", Tahoma, Geneva, Verdana, sans-serif' },
  { label: 'System UI', value: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Verdana, "DejaVu Sans", sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", "Lucida Grande", "DejaVu Sans", sans-serif' },
  { label: 'Verdana', value: 'Verdana, "DejaVu Sans", Geneva, sans-serif' },

  // Elegant Serifs
  { label: 'Cambria', value: 'Cambria, Caladea, "Liberation Serif", Georgia, serif' },
  { label: 'Garamond', value: 'Garamond, "EB Garamond", "Liberation Serif", serif' },
  { label: 'Georgia', value: 'Georgia, Cambria, "Liberation Serif", "DejaVu Serif", serif' },
  { label: 'Palatino', value: '"Palatino Linotype", "Book Antiqua", Palatino, "Liberation Serif", serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Tinos, "Liberation Serif", Times, serif' },

  // Monospace & Code
  { label: 'Consolas', value: 'Consolas, Cousine, "Ubuntu Mono", "DejaVu Sans Mono", monospace' },
  { label: 'Courier New', value: '"Courier New", "Courier Prime", "Liberation Mono", Courier, monospace' },
  { label: 'Fira Code', value: '"Fira Code", "Ubuntu Mono", "DejaVu Sans Mono", monospace' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", "Ubuntu Mono", "DejaVu Sans Mono", monospace' },
  { label: 'Menlo', value: 'Menlo, Monaco, "Ubuntu Mono", "Liberation Mono", monospace' },
  { label: 'Monaco', value: 'Monaco, "Ubuntu Mono", Consolas, monospace' },

  // Display & Specialty
  { label: 'Comic Sans MS', value: '"Comic Sans MS", "Comic Neue", cursive, sans-serif' },
  { label: 'Impact', value: 'Impact, Anton, "Arial Narrow Bold", sans-serif' }
];
const CELL_FONT_SIZE_OPTIONS = [
  { label: '8 px', value: '8px' },
  { label: '9 px', value: '9px' },
  { label: '10 px', value: '10px' },
  { label: '11 px', value: '11px' },
  { label: '12 px', value: '12px' },
  { label: '13 px', value: '13px' },
  { label: '14 px', value: '14px' },
  { label: '15 px', value: '15px' },
  { label: '16 px', value: '16px' },
  { label: '18 px', value: '18px' },
  { label: '20 px', value: '20px' },
  { label: '22 px', value: '22px' },
  { label: '24 px', value: '24px' },
  { label: '26 px', value: '26px' },
  { label: '28 px', value: '28px' },
  { label: '32 px', value: '32px' },
  { label: '36 px', value: '36px' },
  { label: '40 px', value: '40px' },
  { label: '48 px', value: '48px' }
];
const CELL_TEXT_COLOR_SWATCHES = [
  '#000000', '#ffffff', '#6b7280', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];
const CELL_TEXT_ALIGN_OPTIONS = [
  { label: 'Left', value: 'left', Icon: AlignLeft },
  { label: 'Center', value: 'center', Icon: AlignCenter },
  { label: 'Right', value: 'right', Icon: AlignRight }
];
const DATA_EXPLORER_SHEET_COLUMN_COLORS = {};
const DATA_EXPLORER_SHEET_CELL_COLORS = {};
const DATA_EXPLORER_SHEET_CELL_FONT_STYLES = {};
const DATA_EXPLORER_SHEET_CELL_TEXT_STYLES = {};
const DATA_EXPLORER_SHEET_COLUMN_CELL_COLORS = {};
const DATA_EXPLORER_SHEET_COLUMN_FONT_STYLES = {};
const DATA_EXPLORER_SHEET_COLUMN_TEXT_STYLES = {};
const DATA_EXPLORER_SHEET_CELL_COLOR_RANGES = {};
const DATA_EXPLORER_SHEET_CELL_FONT_RANGES = {};
const DATA_EXPLORER_SHEET_CELL_TEXT_RANGES = {};
const DATA_EXPLORER_SHEET_GROUP_SELECTION = {};
const DATA_EXPLORER_SHEET_CUSTOM_CELL_SWATCHES = {};
const LARGE_SELECTION_KEY_LIMIT = 4096;

const findGridRangeStyle = (ranges, rowPosition, columnIndex) => {
  if (!Array.isArray(ranges) || ranges.length === 0) return null;
  let style = null;
  ranges.forEach((range) => {
    if (!range || !range.style) return;
    if (rowPosition < range.rowStart || rowPosition > range.rowEnd) return;
    if (columnIndex < range.colStart || columnIndex > range.colEnd) return;
    style = { ...(style || {}), ...range.style };
  });
  return style;
};

const isValidGridStyleKey = (cellKey, columns, rowCount) => {
  const key = String(cellKey || '');
  if (key.startsWith('header::')) return columns.includes(key.slice('header::'.length));
  if (key.startsWith('row-header::')) {
    const rowIndex = Number(key.slice('row-header::'.length));
    return Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < rowCount;
  }
  const [rowPart, ...colParts] = key.split('::');
  const rowIndex = Number(rowPart);
  return Number.isInteger(rowIndex)
    && rowIndex >= 0
    && rowIndex < rowCount
    && columns.includes(colParts.join('::'));
};

const normalizeSheetNamesList = (value) => {
  const flattenValues = (input, depth = 0) => {
    if (depth > 3 || input === null || input === undefined) return [];
    if (Array.isArray(input)) return input.flatMap((entry) => flattenValues(entry, depth + 1));
    if (typeof input === "object") return Object.values(input).flatMap((entry) => flattenValues(entry, depth + 1));
    return [input];
  };

  const seen = new Set();
  const normalized = [];
  flattenValues(value).forEach((sheetName) => {
    const safeName = String(sheetName || "").trim();
    if (!safeName) return;
    const key = safeName.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(safeName);
  });
  return normalized;
};

const AyuSelect = ({
  value,
  onChange,
  options,
  className = '',
  disabled,
  compact,
  isRTheme,
  panelPlacement = 'bottom',
  panelTitle = '',
  panelIcon: PanelIcon = null
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const useSecondaryPanel = panelPlacement === 'right';
  const { isMounted: isPanelMounted, isVisible: isPanelVisible } = useAnimatedPresence(
    open && !disabled,
    AYU_SELECT_TRANSITION_MS
  );

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const selectedOpt = options.find((o) => String(o.value) === String(value));

  const baseTriggerClass = isRTheme
    ? 'ayu-select-trigger-r bg-slate-800 text-slate-200 border border-slate-700/60'
    : 'ayu-select-trigger shadow-sm';

  return (
    <div ref={rootRef} className={`relative block w-full ${className} ${isPanelMounted ? 'z-50' : 'z-10'}`}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-left transition-all ${baseTriggerClass} ${open ? 'is-open' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="truncate block pr-2 text-sm font-medium">{selectedOpt ? selectedOpt.label : 'Select...'}</span>
        <ChevronDown size={14} className={`ayu-select-chevron shrink-0 ${open ? 'is-open text-amber-500' : 'text-slate-400'}`} />
      </button>
      {isPanelMounted && (
        <div
          className={`ayu-select-panel ${useSecondaryPanel
            ? 'ayu-select-panel-secondary absolute top-0 left-[calc(100%+10px)] min-w-[260px] max-h-[320px] overflow-y-auto custom-scrollbar'
            : 'absolute left-0 right-0 mt-1 max-h-[260px] overflow-y-auto custom-scrollbar'
            } ${isPanelVisible ? 'is-open' : ''}`}
          role="listbox"
        >
          {useSecondaryPanel && panelTitle ? (
            <div className="ayu-select-panel-secondary-head">
              <span className="ayu-select-panel-secondary-title">
                {PanelIcon ? <PanelIcon size={13} /> : null}
                <span>{panelTitle}</span>
              </span>
            </div>
          ) : null}
          {options.map((opt) => {
            const isActive = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`ayu-select-item w-full text-left truncate flex items-center justify-between ${isActive ? 'is-active' : ''}`}
              >
                <span>{opt.label}</span>
                {isActive && <CheckSquare size={14} className="opacity-70" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const createFloatingToolState = () => (
  Object.entries(FLOATING_TOOL_PRESETS).reduce((acc, [key, preset], index) => {
    acc[key] = {
      open: false,
      width: preset.width,
      height: preset.defaultHeight || null,
      x: preset.defaultX,
      y: preset.defaultY,
      z: 60 + index
    };
    return acc;
  }, {})
);

const getPrimaryFontFamily = (value) => String(value || '')
  .split(',')[0]
  .trim()
  .replace(/^['"]|['"]$/g, '')
  .toLowerCase();

const isFontFamilyOptionSelected = (currentValue, optionValue) => {
  if (!optionValue) return !currentValue;
  return getPrimaryFontFamily(currentValue) === getPrimaryFontFamily(optionValue);
};

function TxtPanelContent({
  currentFontFamily,
  currentFontSize,
  currentTextColor,
  currentTextAlign,
  currentTextTransform,
  currentFontWeight,
  currentFontStyle,
  currentTextDecoration,
  applyCellFontStyle,
  applyCellTextStyle,
}) {
  const [activeTab, setActiveTab] = React.useState('font');
  const [openDropdown, setOpenDropdown] = React.useState(null); // 'family' | 'size' | null
  const panelRef = React.useRef(null);

  React.useEffect(() => {
    if (!openDropdown) return;
    const handlePointerDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [openDropdown]);

  const tabs = [
    { id: 'font', label: 'Font' },
    { id: 'color', label: 'Color' },
    { id: 'align', label: 'Align' },
    { id: 'case', label: 'Case' },
  ];

  const familyLabel = CELL_FONT_FAMILY_OPTIONS.find(
    (o) => isFontFamilyOptionSelected(currentFontFamily, o.value)
  )?.label || (currentFontFamily || 'Default');

  const sizeLabel = CELL_FONT_SIZE_OPTIONS.find(
    (o) => o.value === currentFontSize
  )?.label || (currentFontSize || 'Default (13 px)');
  const toggle = (key) => setOpenDropdown((prev) => (prev === key ? null : key));

  return (
    <div ref={panelRef} className="flex overflow-visible text-panel-root" style={{ minHeight: 220 }}>
      {/* Left sidebar */}
      <div className="flex w-[90px] shrink-0 flex-col gap-1 border-r border-zinc-800/90 bg-[#121212] p-2">
        <span className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Format</span>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setOpenDropdown(null); }}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold tracking-[0.02em] transition-all ${isActive
                ? 'border-zinc-600 bg-zinc-800 text-zinc-100 shadow-sm'
                : 'border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                }`}
            >
              <span>{tab.label}</span>
              {isActive && <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 shadow-[0_0_6px_rgba(212,212,216,0.6)]" />}
            </button>
          );
        })}
      </div>

      {/* Right content */}
      <div className="flex-1 space-y-3 p-3 overflow-visible">
        {activeTab === 'font' && (
          <>
            {/* Font Family dropdown: z-30 when open to overlap Font Size below */}
            <div className={`relative ${openDropdown === 'family' ? 'z-30' : 'z-20'}`}>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Font Family</span>
              <button
                type="button"
                onClick={() => toggle('family')}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-all ${openDropdown === 'family'
                  ? 'border-zinc-500 bg-zinc-800 text-zinc-100 shadow-md'
                  : 'border-zinc-700/60 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60'
                  }`}
              >
                <span style={{ fontFamily: currentFontFamily || undefined }}>{familyLabel}</span>
                <ChevronDown size={12} className={`ml-1 shrink-0 transition-transform duration-150 ${openDropdown === 'family' ? 'rotate-180' : ''}`} />
              </button>
              {openDropdown === 'family' && (
                <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-[17.5rem] overflow-y-auto space-y-0.5 rounded-lg border border-zinc-700/90 bg-[#141416] p-1 shadow-2xl custom-scrollbar">
                  {[{ label: 'Default', value: '' }, ...CELL_FONT_FAMILY_OPTIONS].map((option) => {
                    const isSelected = isFontFamilyOptionSelected(currentFontFamily, option.value);
                    return (
                      <button
                        key={`txt-ff-${option.value || 'default'}`}
                        type="button"
                        onClick={() => {
                          applyCellFontStyle('fontFamily', option.value);
                          setOpenDropdown(null);
                        }}
                        className={`flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-left text-xs font-semibold transition-all ${isSelected
                          ? 'border-zinc-600 bg-zinc-800 text-zinc-100 shadow-sm'
                          : 'border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                          }`}
                      >
                        <span style={{ fontFamily: option.value || undefined }}>{option.label}</span>
                        {isSelected && <span className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 shadow-[0_0_6px_rgba(212,212,216,0.6)]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Font Size dropdown: z-30 when open, popup floats out past panel bottom */}
            <div className={`relative ${openDropdown === 'size' ? 'z-30' : 'z-10'}`}>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">Font Size</span>
              <button
                type="button"
                onClick={() => toggle('size')}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-all ${openDropdown === 'size'
                  ? 'border-zinc-500 bg-zinc-800 text-zinc-100 shadow-md'
                  : 'border-zinc-700/60 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60'
                  }`}
              >
                <span>{sizeLabel}</span>
                <ChevronDown size={12} className={`ml-1 shrink-0 transition-transform duration-150 ${openDropdown === 'size' ? 'rotate-180' : ''}`} />
              </button>
              {openDropdown === 'size' && (
                <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-[17.5rem] overflow-y-auto space-y-0.5 rounded-lg border border-zinc-700/90 bg-[#141416] p-1 shadow-2xl custom-scrollbar">
                  {[{ label: 'Default (13 px)', value: '' }, ...CELL_FONT_SIZE_OPTIONS].map((option) => {
                    const isSelected = option.value
                      ? (currentFontSize === option.value)
                      : (!currentFontSize || currentFontSize === '13px');
                    return (
                      <button
                        key={`txt-fs-${option.value || 'default'}`}
                        type="button"
                        onClick={() => {
                          applyCellFontStyle('fontSize', option.value);
                          setOpenDropdown(null);
                        }}
                        className={`flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-left text-xs font-semibold transition-all ${isSelected
                          ? 'border-zinc-600 bg-zinc-800 text-zinc-100 shadow-sm'
                          : 'border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                          }`}
                      >
                        <span>{option.label}</span>
                        {isSelected && <span className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 shadow-[0_0_6px_rgba(212,212,216,0.6)]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'color' && (
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-300">Text Color</span>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                type="button"
                className={`flex h-7 items-center justify-center rounded-md border text-[9px] font-semibold transition-colors ${!currentTextColor
                  ? 'border-zinc-500 bg-zinc-700 text-zinc-100 ring-1 ring-zinc-400'
                  : 'border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                  }`}
                onClick={() => applyCellTextStyle('color', '')}
                title="Default text color"
              >
                Auto
              </button>
              {CELL_TEXT_COLOR_SWATCHES.map((color) => {
                const isSelected = currentTextColor?.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={`txt-text-color-${color}`}
                    type="button"
                    className={`h-7 rounded-md border transition-all hover:scale-105 ${isSelected
                      ? 'border-white ring-2 ring-white/50 scale-105'
                      : 'border-zinc-700/60 hover:border-zinc-400'
                      }`}
                    style={{ backgroundColor: color }}
                    onClick={() => applyCellTextStyle('color', color)}
                    title={`Text color ${color}`}
                    aria-label={`Set text color ${color}`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'align' && (
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-300">Text Position</span>
            <div className="space-y-1">
              {CELL_TEXT_ALIGN_OPTIONS.map(({ label, value, Icon }) => {
                const isSelected = (currentTextAlign || 'left') === value;
                return (
                  <button
                    key={`txt-text-align-${value}`}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${isSelected
                      ? 'border-zinc-600 bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                      }`}
                    onClick={() => applyCellTextStyle('textAlign', value)}
                    title={`Align ${label.toLowerCase()}`}
                    aria-label={`Align text ${label.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={13} />
                      <span>{label}</span>
                    </div>
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 shadow-[0_0_6px_rgba(212,212,216,0.6)]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'case' && (
          <div className="space-y-3">
            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-300">Style</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Bold', property: 'fontWeight', activeVal: 'bold', isActive: currentFontWeight === 'bold', Icon: Bold, styleClass: 'font-bold' },
                  { label: 'Italic', property: 'fontStyle', activeVal: 'italic', isActive: currentFontStyle === 'italic', Icon: Italic, styleClass: 'italic' },
                  { label: 'Underline', property: 'textDecoration', activeVal: 'underline', isActive: currentTextDecoration === 'underline', Icon: Underline, styleClass: 'underline' },
                ].map(({ label, property, activeVal, isActive, Icon, styleClass }) => (
                  <button
                    key={`txt-style-${property}`}
                    type="button"
                    onClick={() => applyCellTextStyle(property, isActive ? '' : activeVal)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all ${isActive
                      ? 'border-zinc-500 bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'border-zinc-700/60 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/40 hover:text-zinc-200'
                      }`}
                    title={label}
                  >
                    <Icon size={13} className={isActive ? 'text-zinc-100' : 'text-zinc-400'} />
                    <span className={styleClass}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-300">Letter Case</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { symbol: 'Aa', label: 'Normal', value: '' },
                  { symbol: 'AA', label: 'UPPERCASE', value: 'uppercase' },
                  { symbol: 'aa', label: 'lowercase', value: 'lowercase' },
                  { symbol: 'Abc', label: 'Capitalize', value: 'capitalize' }
                ].map((option) => {
                  const isSelected = (currentTextTransform || '') === option.value;
                  return (
                    <button
                      key={`txt-case-${option.value || 'normal'}`}
                      type="button"
                      className={`flex flex-col items-center justify-center rounded-lg border py-2 text-xs font-bold transition-all ${isSelected
                        ? 'border-zinc-500 bg-zinc-800 text-zinc-100 shadow-sm'
                        : 'border-zinc-700/60 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/40 hover:text-zinc-200'
                        }`}
                      onClick={() => applyCellTextStyle('textTransform', option.value)}
                      title={option.label}
                      aria-label={option.label}
                    >
                      <span className="text-[13px] font-bold tracking-tight">
                        {option.symbol}
                      </span>
                      {isSelected && <span className="mt-1 h-1 w-1 rounded-full bg-zinc-300 shadow-[0_0_4px_rgba(212,212,216,0.6)]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HeaderTxtControls({
  currentFontFamily,
  currentFontSize,
  currentTextColor,
  currentTextAlign,
  currentTextTransform,
  currentFontWeight,
  currentFontStyle,
  currentTextDecoration,
  applyCellFontStyle,
  applyCellTextStyle,
  ensureSelection,
  disabled
}) {
  const [openPanel, setOpenPanel] = useState(null);
  const [panelPosition, setPanelPosition] = useState(null);
  const [customTextColors, setCustomTextColors] = useState([]);
  const [customTextColorCode, setCustomTextColorCode] = useState('#ffffff');
  const rootRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!openPanel) return undefined;
    const handleOutsidePointerDown = (event) => {
      if (rootRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) return;
      setOpenPanel(null);
    };
    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, [openPanel]);

  const togglePanel = (panel, event) => {
    if (disabled) return;
    ensureSelection?.();
    if (openPanel === panel) {
      setOpenPanel(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setPanelPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 360)),
      top: rect.bottom + 8
    });
    setOpenPanel(panel);
  };

  const closePanel = () => setOpenPanel(null);
  const selectedFamily = (option) => isFontFamilyOptionSelected(currentFontFamily, option.value);
  const selectedSize = (option) => option.value
    ? currentFontSize === option.value
    : (!currentFontSize || currentFontSize === '13px');
  const selectedCase = (value) => (currentTextTransform || '') === value;
  const selectedMarker = <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-zinc-300 shadow-[0_0_6px_rgba(212,212,216,0.6)]" />;
  const normalizeTextColorCode = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(raw)) {
      return `#${raw.slice(1).split('').map((part) => `${part}${part}`).join('')}`;
    }
    return /^#[0-9a-f]{6}$/i.test(raw) ? raw : '';
  };
  const addCustomTextColor = () => {
    const normalized = normalizeTextColorCode(customTextColorCode);
    if (!normalized) return;
    setCustomTextColors((previous) => previous.includes(normalized)
      ? previous
      : [...previous, normalized]);
    setCustomTextColorCode(normalized);
    applyCellTextStyle('color', normalized);
  };

  const panelContent = {
    font: (
      <>
        <span className="toolbar-menu-label">Font Family</span>
        <div className="toolbar-menu-section">
          {[{ label: 'Default', value: '' }, ...CELL_FONT_FAMILY_OPTIONS].map((option) => (
            <button
              key={`header-font-${option.value || 'default'}`}
              type="button"
              className={`toolbar-menu-item ${selectedFamily(option) ? 'toolbar-menu-item-active' : ''}`}
              onClick={() => { applyCellFontStyle('fontFamily', option.value); closePanel(); }}
            >
              <span style={{ fontFamily: option.value || undefined }}>{option.label}</span>
              {selectedFamily(option) && selectedMarker}
            </button>
          ))}
        </div>
      </>
    ),
    size: (
      <>
        <span className="toolbar-menu-label">Font Size</span>
        <div className="space-y-1">
          {[{ label: 'Default (13 px)', value: '' }, ...CELL_FONT_SIZE_OPTIONS].map((option) => (
            <button
              key={`header-size-${option.value || 'default'}`}
              type="button"
              className={`toolbar-menu-item ${selectedSize(option) ? 'toolbar-menu-item-active' : ''}`}
              onClick={() => { applyCellFontStyle('fontSize', option.value); closePanel(); }}
            >
              <span>{option.label}</span>
              {selectedSize(option) && selectedMarker}
            </button>
          ))}
        </div>
      </>
    ),
    color: (
      <>
        <span className="toolbar-menu-label">Text Color</span>
        <div className="space-y-1">
          <button
            type="button"
            className={`toolbar-menu-item ${!currentTextColor ? 'toolbar-menu-item-active' : ''}`}
            onClick={() => applyCellTextStyle('color', '')}
          >
            <span>Auto</span>
            {!currentTextColor && selectedMarker}
          </button>
          {CELL_TEXT_COLOR_SWATCHES.map((color) => (
            <button
              key={`header-color-${color}`}
              type="button"
              className={`toolbar-menu-item ${currentTextColor?.toLowerCase() === color.toLowerCase() ? 'toolbar-menu-item-active' : ''}`}
              onClick={() => applyCellTextStyle('color', color)}
              title={`Text color ${color}`}
              aria-label={`Set text color ${color}`}
            >
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-zinc-600" style={{ backgroundColor: color }} />
                <span>{color}</span>
              </span>
              {currentTextColor?.toLowerCase() === color.toLowerCase() && selectedMarker}
            </button>
          ))}
          {customTextColors.map((color) => (
            <button
              key={`header-custom-color-${color}`}
              type="button"
              className={`toolbar-menu-item ${currentTextColor?.toLowerCase() === color ? 'toolbar-menu-item-active' : ''}`}
              onClick={() => applyCellTextStyle('color', color)}
              title={`Custom text color ${color}`}
              aria-label={`Set custom text color ${color}`}
            >
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-zinc-600" style={{ backgroundColor: color }} />
                <span>{color}</span>
              </span>
              {currentTextColor?.toLowerCase() === color && selectedMarker}
            </button>
          ))}
        </div>
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <span className="toolbar-menu-label">Add Color Code</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={normalizeTextColorCode(customTextColorCode) || '#ffffff'}
              onChange={(event) => setCustomTextColorCode(event.target.value)}
              className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-zinc-700 bg-zinc-900 p-0.5"
              aria-label="Choose custom text color"
            />
            <input
              type="text"
              value={customTextColorCode}
              onChange={(event) => setCustomTextColorCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addCustomTextColor();
              }}
              placeholder="#RRGGBB"
              className="min-w-0 flex-1 rounded-md border border-zinc-700/80 bg-zinc-900 px-2.5 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              aria-label="Custom text color code"
            />
            <button
              type="button"
              onClick={addCustomTextColor}
              disabled={!normalizeTextColorCode(customTextColorCode)}
              className="toolbar-menu-item !w-auto shrink-0 px-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </>
    ),
    align: (
      <>
        <span className="toolbar-menu-label">Text Position</span>
        {CELL_TEXT_ALIGN_OPTIONS.map(({ label, value, Icon }) => (
          <button
            key={`header-align-${value}`}
            type="button"
            className={`toolbar-menu-item ${((currentTextAlign || 'left') === value) ? 'toolbar-menu-item-active' : ''}`}
            onClick={() => { applyCellTextStyle('textAlign', value); closePanel(); }}
          >
            <Icon size={14} />
            <span>{label}</span>
            {(currentTextAlign || 'left') === value && selectedMarker}
          </button>
        ))}
      </>
    ),
    case: (
      <>
        <span className="toolbar-menu-label">Text Style</span>
        <div className="space-y-1">
          {[
            { label: 'Bold', property: 'fontWeight', activeValue: 'bold', active: currentFontWeight === 'bold', Icon: Bold },
            { label: 'Italic', property: 'fontStyle', activeValue: 'italic', active: currentFontStyle === 'italic', Icon: Italic },
            { label: 'Underline', property: 'textDecoration', activeValue: 'underline', active: currentTextDecoration === 'underline', Icon: Underline }
          ].map(({ label, property, activeValue, active, Icon }) => (
            <button
              key={`header-style-${property}`}
              type="button"
              className={`toolbar-menu-item ${active ? 'toolbar-menu-item-active' : ''}`}
              onClick={() => applyCellTextStyle(property, active ? '' : activeValue)}
              title={label}
            >
              <Icon size={13} />
              <span>{label}</span>
              {active && selectedMarker}
            </button>
          ))}
        </div>
        <span className="toolbar-menu-label mt-3">Letter Case</span>
        {[
          { symbol: 'Aa', label: 'Normal', value: '' },
          { symbol: 'AA', label: 'UPPERCASE', value: 'uppercase' },
          { symbol: 'aa', label: 'lowercase', value: 'lowercase' },
          { symbol: 'Abc', label: 'Capitalize', value: 'capitalize' }
        ].map((option) => (
          <button
            key={`header-case-${option.value || 'normal'}`}
            type="button"
            className={`toolbar-menu-item ${selectedCase(option.value) ? 'toolbar-menu-item-active' : ''}`}
            onClick={() => { applyCellTextStyle('textTransform', option.value); closePanel(); }}
          >
            <span className="w-10 font-bold">{option.symbol}</span>
            <span>{option.label}</span>
            {selectedCase(option.value) && selectedMarker}
          </button>
        ))}
      </>
    )
  };

  const buttons = [
    { key: 'font', label: 'Font family', symbol: 'A' },
    { key: 'size', label: 'Font size', symbol: 'A↕' },
    { key: 'align', label: 'Text alignment', icon: AlignLeft },
    { key: 'case', label: 'Letter case', symbol: 'Aa' },
    { key: 'color', label: 'Text color', icon: Brush },
  ];

  return (
    <div ref={rootRef} className="text-format-header-controls flex flex-nowrap items-center gap-2">
      {buttons.map(({ key, label, icon: Icon, symbol }) => (
        <button
          key={key}
          type="button"
          onClick={(event) => togglePanel(key, event)}
          aria-expanded={openPanel === key}
          aria-label={label}
          disabled={disabled}
          className={`toolbar-menu-trigger toolbar-floating-trigger disabled:opacity-50 disabled:cursor-not-allowed ${openPanel === key ? 'is-open' : ''}`}
        >
          {Icon ? <Icon size={16} /> : <span className="text-format-symbol">{symbol}</span>}
          <ChevronDown size={12} className="toolbar-floating-trigger-caret" />
        </button>
      ))}
      {openPanel && panelPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          className={`toolbar-menu-panel de-ai-provider-panel text-format-header-panel ${openPanel === 'size' ? 'text-format-size-panel' : ''}`}
          style={{
            position: 'fixed',
            left: panelPosition.left,
            top: panelPosition.top,
            width: openPanel === 'font' ? 320 : openPanel === 'color' ? 290 : openPanel === 'size' ? 240 : 220,
            maxHeight: openPanel === 'size' || openPanel === 'color' ? 360 : 'calc(100vh - 80px)',
            overflowY: 'auto',
            zIndex: 100000
          }}
        >
          {panelContent[openPanel]}
        </div>,
        document.body
      )}
    </div>
  );
}

function FloatingToolWindow({

  toolKey,
  panelRef,
  state,
  title,
  subtitle,
  icon: Icon,
  width,
  isRTheme,
  className = '',
  onClose,
  onFocus,
  onDragStart,
  onResizeStart,
  children
}) {
  const { isMounted, isVisible } = useAnimatedPresence(Boolean(state?.open), FLOATING_TOOL_TRANSITION_MS);
  if (!state || !isMounted) return null;
  const preset = FLOATING_TOOL_PRESETS[toolKey] || DEFAULT_FLOATING_TOOL_PRESET;

  return (
    <section
      ref={panelRef}
      role="dialog"
      aria-label={title}
      aria-hidden={!state.open}
      className={`floating-tool-window ${className} ${isRTheme ? 'is-r-theme' : ''} ${isVisible ? 'is-open' : 'is-closing'}`}
      style={{
        width: `${state.width || width}px`,
        height: Number.isFinite(state.height) ? `${state.height}px` : undefined,
        minWidth: `${preset.minWidth}px`,
        minHeight: `${preset.minHeight}px`,
        transform: `translate3d(${state.x + (isVisible ? 0 : -24)}px, ${state.y}px, 0) scale(${isVisible ? 1 : 0.985})`,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        zIndex: state.z
      }}
      onPointerDown={() => onFocus(toolKey)}
    >
      <header
        className="floating-tool-window-header"
        onPointerDown={(event) => onDragStart(toolKey, event)}
      >
        <div className="floating-tool-window-heading">
          <span className="floating-tool-window-icon">
            <Icon size={14} />
          </span>
          <div className="floating-tool-window-copy">
            <strong>{title}</strong>
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
        </div>
        <div className="floating-tool-window-actions">
          <span className="floating-tool-window-grip" aria-hidden="true" />
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onClose(toolKey);
            }}
            className="floating-tool-window-close"
            aria-label={`Close ${title}`}
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </header>
      <div className="floating-tool-window-body">
        {children}
      </div>
      <button
        type="button"
        className="floating-tool-window-resize"
        aria-label={`Resize ${title}`}
        onPointerDown={(event) => {
          event.stopPropagation();
          onResizeStart(toolKey, event);
        }}
      />
    </section>
  );
}

function StudioPanelCollapse({ open, className = '', children }) {
  const { isMounted, isVisible } = useAnimatedPresence(Boolean(open), STUDIO_PANEL_TRANSITION_MS);
  if (!isMounted) return null;

  return (
    <div
      className={`studio-panel-collapse ${isVisible ? 'is-open' : 'is-closing'}`}
      aria-hidden={!isVisible}
      style={{
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
    >
      <div className={`studio-panel-body ${className}`}>
        {children}
      </div>
    </div>
  );
}

function StudioToolWrapper({ open, children }) {
  const { isVisible } = useAnimatedPresence(Boolean(open), STUDIO_PANEL_TRANSITION_MS);
  if (!open) return null;
  return (
    <div
      className="col-start-1 row-start-1 w-full"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: `translateX(${isVisible ? '0' : '100%'})`,
        transition: `opacity ${STUDIO_PANEL_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${STUDIO_PANEL_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
    >
      {children}
    </div>
  );
}




const MemoizedDataGridRow = React.memo(({
  originalIndex,
  visibleRowPosition,
  row,
  selectedColumns,
  isSelected,
  isRTheme,
  editingColumnName,
  jumpToColumnName,
  rangeSelectionBounds,
  columnColorStyles,
  cellColorStyles,
  cellFontStyles,
  cellTextStyles,
  formattingDefaults,
  columnCellColorStyles,
  columnFontStyles,
  columnTextStyles,
  cellColorRanges,
  cellFontRanges,
  cellTextRanges,
  toggleRow,
  beginCellEdit,
  onCellPointerDown,
  onCellPointerEnter,
  onCellPointerUp,
  onCellContextMenu,
  onRowHeaderContextMenu,
  onRowHeaderSelect,
  onColumnResizeStart,
  onInsertRow,
  commitCellEdit,
  navigateCellEdit,
  cancelCellEdit,
  editingValueRef
}) => {
  return (
    <tr
      key={`row_${originalIndex}`}
      data-row-selected={isSelected ? 'true' : 'false'}
      className={`data-grid-row group transition-colors h-[38px] ${isSelected
        ? (isRTheme ? 'bg-cyan-900/20' : 'bg-blue-50 dark:bg-blue-900/20')
        : (isRTheme ? 'hover:bg-cyan-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-900/40')
        }`}
    >
      <td className="data-grid-selection-cell px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleRow(originalIndex)}
          className={`rounded cursor-pointer opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity ${isRTheme ? 'border-cyan-700 text-cyan-400 focus:ring-cyan-500' : 'border-slate-300 text-blue-600 focus:ring-blue-500'
            }`}
        />
      </td>
      <td
        className={`data-grid-row-index-cell relative px-3 py-2 text-[13px] font-mono text-center select-none cursor-pointer ${isRTheme ? 'text-black/75 hover:bg-cyan-900/30' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
        style={{
          ...cellColorStyles?.[`row-header::${originalIndex}`],
          ...cellFontStyles?.[`row-header::${originalIndex}`],
          ...cellTextStyles?.[`row-header::${originalIndex}`],
          '--data-grid-cell-text': cellTextStyles?.[`row-header::${originalIndex}`]?.color
            || cellColorStyles?.[`row-header::${originalIndex}`]?.color
            || '#000000'
        }}
        onClick={(event) => onRowHeaderSelect?.(originalIndex, event)}
        onContextMenu={(event) => onRowHeaderContextMenu?.(originalIndex, event)}
        title="Click to select row"
      >
        {originalIndex + 1}
        {onInsertRow && (
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onInsertRow(originalIndex);
            }}
            className="row-insert-btn"
            title="Insert empty row below"
            aria-label={`Insert empty row below row ${originalIndex + 1}`}
          >
            <Plus size={10} strokeWidth={2.8} />
          </button>
        )}
      </td>
      {selectedColumns.map((c, columnIndex) => {
        const isEditing = editingColumnName === c;
        const isHighlighted = jumpToColumnName === c;
        const isRangeSelected = Boolean(
          rangeSelectionBounds
          && visibleRowPosition >= rangeSelectionBounds.rowStart
          && visibleRowPosition <= rangeSelectionBounds.rowEnd
          && columnIndex >= rangeSelectionBounds.colStart
          && columnIndex <= rangeSelectionBounds.colEnd
        );
        const isRangeTop = isRangeSelected && visibleRowPosition === rangeSelectionBounds.rowStart;
        const isRangeBottom = isRangeSelected && visibleRowPosition === rangeSelectionBounds.rowEnd;
        const isRangeLeft = isRangeSelected && columnIndex === rangeSelectionBounds.colStart;
        const isRangeRight = isRangeSelected && columnIndex === rangeSelectionBounds.colEnd;
        const currentValue = row?.[c];
        const valueText = String(currentValue ?? '');
        const colorMeta = columnColorStyles?.[c];
        const cellColorMeta = cellColorStyles?.[`${originalIndex}::${c}`];
        const cellFontMeta = cellFontStyles?.[`${originalIndex}::${c}`];
        const cellTextMeta = cellTextStyles?.[`${originalIndex}::${c}`];
        const columnCellColorMeta = columnCellColorStyles?.[c];
        const columnFontMeta = columnFontStyles?.[c];
        const columnTextMeta = columnTextStyles?.[c];
        const rangeColorMeta = findGridRangeStyle(cellColorRanges, visibleRowPosition, columnIndex);
        const rangeFontMeta = findGridRangeStyle(cellFontRanges, visibleRowPosition, columnIndex);
        const rangeTextMeta = findGridRangeStyle(cellTextRanges, visibleRowPosition, columnIndex);
        const resolvedFontMeta = {
          ...(columnFontMeta || {}),
          ...(rangeFontMeta || {}),
          ...(cellFontMeta || {})
        };
        const resolvedTextMeta = {
          ...(columnTextMeta || {}),
          ...(rangeTextMeta || {}),
          ...(cellTextMeta || {})
        };
        let cellStyle = colorMeta?.cellTint ? { backgroundColor: colorMeta.cellTint } : undefined;
        if (columnCellColorMeta) {
          cellStyle = {
            ...(cellStyle || {}),
            ...columnCellColorMeta
          };
        }
        if (columnFontMeta) {
          cellStyle = {
            ...(cellStyle || {}),
            ...columnFontMeta
          };
        }
        if (columnTextMeta) {
          cellStyle = {
            ...(cellStyle || {}),
            ...columnTextMeta,
            '--data-grid-cell-text': columnTextMeta.color || cellStyle?.['--data-grid-cell-text']
          };
        }
        if (rangeColorMeta) {
          cellStyle = { ...(cellStyle || {}), ...rangeColorMeta };
        }
        if (rangeFontMeta) {
          cellStyle = { ...(cellStyle || {}), ...rangeFontMeta };
        }
        if (rangeTextMeta) {
          cellStyle = {
            ...(cellStyle || {}),
            ...rangeTextMeta,
            '--data-grid-cell-text': rangeTextMeta.color || cellStyle?.['--data-grid-cell-text']
          };
        }
        if (cellColorMeta) {
          cellStyle = {
            ...(cellStyle || {}),
            ...cellColorMeta
          };
        }
        if (cellFontMeta) {
          cellStyle = {
            ...(cellStyle || {}),
            ...cellFontMeta
          };
        }
        if (cellTextMeta) {
          cellStyle = {
            ...(cellStyle || {}),
            ...cellTextMeta,
            '--data-grid-cell-text': cellTextMeta.color || cellStyle?.['--data-grid-cell-text']
          };
        }
        return (
          <td
            key={`${originalIndex}-${c}`}
            data-row-index={originalIndex}
            data-column-name={c}
            data-cell-highlighted={isHighlighted ? 'true' : 'false'}
            data-cell-custom-color={cellColorMeta || columnCellColorMeta || rangeColorMeta ? 'true' : 'false'}
            data-cell-custom-text={cellTextMeta || columnTextMeta || rangeTextMeta ? 'true' : 'false'}
            data-range-selected={isRangeSelected ? 'true' : 'false'}
            className={`data-grid-data-cell text-[13px] select-none ${isEditing ? 'p-1.5 align-middle' : 'px-4 py-2 truncate'} ${isRTheme ? 'text-black' : 'text-slate-700 dark:text-slate-300'} ${isHighlighted ? 'data-grid-data-cell-highlighted' : ''} ${isRangeSelected
              ? `data-grid-range-selected${isRangeTop ? ' data-grid-range-top' : ''}${isRangeBottom ? ' data-grid-range-bottom' : ''}${isRangeLeft ? ' data-grid-range-left' : ''}${isRangeRight ? ' data-grid-range-right' : ''}`
              : ''
              }`}
            style={cellStyle}
            title={isEditing ? undefined : valueText}
            onMouseDown={isEditing ? undefined : (event) => onCellPointerDown?.(originalIndex, c, event)}
            onMouseEnter={isEditing ? undefined : () => onCellPointerEnter?.(originalIndex, c)}
            onMouseUp={isEditing ? undefined : () => onCellPointerUp?.()}
            onClick={isEditing ? undefined : () => beginCellEdit(originalIndex, c, currentValue)}
            onContextMenu={(event) => {
              if (isEditing) return;
              onCellContextMenu?.(originalIndex, c, event);
            }}
          >
            {isEditing ? (
              <input
                autoFocus
                defaultValue={editingValueRef.current}
                onChange={(e) => { editingValueRef.current = e.target.value; }}
                onBlur={() => commitCellEdit(originalIndex, c, currentValue)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitCellEdit(originalIndex, c, currentValue);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelCellEdit();
                  } else if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    const input = e.currentTarget;
                    const selectionStart = typeof input.selectionStart === 'number' ? input.selectionStart : null;
                    const selectionEnd = typeof input.selectionEnd === 'number' ? input.selectionEnd : null;
                    const hasCollapsedSelection = selectionStart !== null && selectionEnd !== null && selectionStart === selectionEnd;
                    const canMoveLeft = hasCollapsedSelection ? selectionStart === 0 : true;
                    const canMoveRight = hasCollapsedSelection ? selectionEnd === input.value.length : true;

                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      void navigateCellEdit?.(originalIndex, c, currentValue, 'up');
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      void navigateCellEdit?.(originalIndex, c, currentValue, 'down');
                    } else if (e.key === 'ArrowLeft' && canMoveLeft) {
                      e.preventDefault();
                      void navigateCellEdit?.(originalIndex, c, currentValue, 'left');
                    } else if (e.key === 'ArrowRight' && canMoveRight) {
                      e.preventDefault();
                      void navigateCellEdit?.(originalIndex, c, currentValue, 'right');
                    }
                  }
                }}
                className="w-full min-w-[120px] text-[13px] font-sans px-2.5 py-1.5 rounded-md border-2 border-blue-500 bg-white text-black placeholder:text-slate-400 outline-none shadow-[0_0_0_3px_rgba(59,130,246,0.18)] transition-shadow"
                style={{
                  fontFamily: resolvedFontMeta.fontFamily || formattingDefaults?.fontFamily || undefined,
                  fontSize: resolvedFontMeta.fontSize || formattingDefaults?.fontSize || undefined,
                  color: resolvedTextMeta.color || formattingDefaults?.color || undefined,
                  fontWeight: resolvedTextMeta.fontWeight || formattingDefaults?.fontWeight || undefined,
                  fontStyle: resolvedTextMeta.fontStyle || formattingDefaults?.fontStyle || undefined,
                  textDecoration: resolvedTextMeta.textDecoration || formattingDefaults?.textDecoration || undefined,
                  textTransform: resolvedTextMeta.textTransform || formattingDefaults?.textTransform || undefined
                }}
              />
            ) : (
              valueText
            )}
            {!isEditing && (
              <div
                className="cell-resize-handle"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onColumnResizeStart?.(c, event);
                }}
                title="Drag to resize column"
              />
            )}
          </td>
        );
      })}
    </tr>
  );
}, (prev, next) => {
  return prev.originalIndex === next.originalIndex &&
    prev.visibleRowPosition === next.visibleRowPosition &&
    prev.row === next.row &&
    prev.selectedColumns === next.selectedColumns &&
    prev.isSelected === next.isSelected &&
    prev.isRTheme === next.isRTheme &&
    prev.editingColumnName === next.editingColumnName &&
    prev.jumpToColumnName === next.jumpToColumnName &&
    prev.rangeSelectionBounds === next.rangeSelectionBounds &&
    prev.columnColorStyles === next.columnColorStyles &&
    prev.cellColorStyles === next.cellColorStyles &&
    prev.cellFontStyles === next.cellFontStyles &&
    prev.cellTextStyles === next.cellTextStyles &&
    prev.columnCellColorStyles === next.columnCellColorStyles &&
    prev.columnFontStyles === next.columnFontStyles &&
    prev.columnTextStyles === next.columnTextStyles &&
    prev.cellColorRanges === next.cellColorRanges &&
    prev.cellFontRanges === next.cellFontRanges &&
    prev.cellTextRanges === next.cellTextRanges &&
    prev.formattingDefaults === next.formattingDefaults &&
    prev.onCellPointerDown === next.onCellPointerDown &&
    prev.onCellPointerEnter === next.onCellPointerEnter &&
    prev.onCellPointerUp === next.onCellPointerUp &&
    prev.onCellContextMenu === next.onCellContextMenu &&
    prev.onRowHeaderContextMenu === next.onRowHeaderContextMenu &&
    prev.onRowHeaderSelect === next.onRowHeaderSelect &&
    prev.onInsertRow === next.onInsertRow &&
    prev.onColumnResizeStart === next.onColumnResizeStart &&
    prev.openCellColorPicker === next.openCellColorPicker;
});

const MemoizedVirtualTable = React.memo(({
  fullData,
  totalVisibleRows,
  resolveVisibleRowIndex,
  findVisiblePositionForRow,
  isRTheme,
  isAyuTheme,
  visibleRowsCheckboxRef,
  allVisibleRowsSelected,
  toggleVisibleRowsSelection,
  selectedColumns,
  editingHeader,
  editingHeaderValue,
  setEditingHeaderValue,
  commitHeaderEdit,
  beginHeaderEdit,
  cancelHeaderEdit,
  onInsertColumn,
  isResizingColumn = false,
  resizeStateRef,
  getColumnWidth,
  columnWidthColRefs,
  setIsResizingColumn,
  isRowChecked,
  toggleRow,
  editingCell,
  editingValueRef,
  beginCellEdit,
  commitCellEdit,
  navigateCellEdit,
  cancelCellEdit,
  rangeSelectionBounds,
  onCellPointerDown,
  onCellPointerEnter,
  onCellPointerUp,
  onCellContextMenu,
  onColumnHeaderContextMenu,
  onColumnHeaderSelect,
  onRowHeaderContextMenu,
  onRowHeaderSelect,
  onInsertRow,
  columnColorStyles,
  cellColorStyles,
  cellFontStyles,
  cellTextStyles,
  formattingDefaults,
  columnCellColorStyles,
  columnFontStyles,
  columnTextStyles,
  cellColorRanges,
  cellFontRanges,
  cellTextRanges,
  jumpToCellTarget
}) => {
  const tableViewportRef = React.useRef(null);
  const latestFullDataRef = React.useRef(fullData);
  const latestBeginCellEditRef = React.useRef(beginCellEdit);
  const [tableScrollTop, setTableScrollTop] = React.useState(0);
  const [tableViewportHeight, setTableViewportHeight] = React.useState(520);
  const ROW_HEIGHT_PX = 38;
  const ROW_OVERSCAN = 16;
  const scrollRafRef = React.useRef(null);

  const handleColumnResizeStart = React.useCallback((columnName, event) => {
    event.preventDefault();
    event.stopPropagation();
    resizeStateRef.current = {
      column: columnName,
      startX: event.clientX,
      startWidth: getColumnWidth(columnName)
    };
    setIsResizingColumn(true);
  }, [getColumnWidth, resizeStateRef, setIsResizingColumn]);
  const latestScrollTopRef = React.useRef(0);

  React.useEffect(() => {
    latestFullDataRef.current = fullData;
  }, [fullData]);

  React.useEffect(() => {
    latestBeginCellEditRef.current = beginCellEdit;
  }, [beginCellEdit]);

  React.useEffect(() => {
    const viewport = tableViewportRef.current;
    if (!viewport) return undefined;
    const syncHeight = () => {
      const nextHeight = viewport.clientHeight;
      if (Number.isFinite(nextHeight) && nextHeight > 0) {
        setTableViewportHeight(nextHeight);
      }
    };
    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => () => {
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    const viewport = tableViewportRef.current;
    if (!viewport) return;
    const maxScroll = Math.max(0, totalVisibleRows * ROW_HEIGHT_PX - tableViewportHeight);
    if (viewport.scrollTop > maxScroll) {
      viewport.scrollTop = maxScroll;
      setTableScrollTop(maxScroll);
    }
  }, [totalVisibleRows, tableViewportHeight]);

  const pendingJumpScrollTop = React.useMemo(() => {
    if (!jumpToCellTarget) return null;
    const visiblePosition = typeof findVisiblePositionForRow === 'function'
      ? findVisiblePositionForRow(jumpToCellTarget.rowIndex)
      : -1;
    if (!Number.isInteger(visiblePosition) || visiblePosition < 0) return null;
    return Math.max(
      0,
      visiblePosition * ROW_HEIGHT_PX - Math.max(0, Math.floor(tableViewportHeight / 2) - ROW_HEIGHT_PX)
    );
  }, [findVisiblePositionForRow, jumpToCellTarget, tableViewportHeight]);

  React.useLayoutEffect(() => {
    const viewport = tableViewportRef.current;
    if (!viewport || !jumpToCellTarget || !Number.isFinite(pendingJumpScrollTop)) return undefined;

    viewport.scrollTop = pendingJumpScrollTop;
    setTableScrollTop((prev) => (prev === pendingJumpScrollTop ? prev : pendingJumpScrollTop));

    const safeColumnName = typeof window !== 'undefined' && window.CSS?.escape
      ? window.CSS.escape(String(jumpToCellTarget.columnName))
      : String(jumpToCellTarget.columnName).replace(/"/g, '\\"');
    const selector = `[data-row-index="${jumpToCellTarget.rowIndex}"][data-column-name="${safeColumnName}"]`;
    let frameId = null;

    const activateTargetCell = () => {
      const cell = viewport.querySelector(selector);
      if (!cell) return false;
      if (typeof cell.scrollIntoView === 'function') {
        cell.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'auto' });
      }
      latestBeginCellEditRef.current?.(
        jumpToCellTarget.rowIndex,
        jumpToCellTarget.columnName,
        latestFullDataRef.current?.[jumpToCellTarget.rowIndex]?.[jumpToCellTarget.columnName]
      );
      return true;
    };

    if (!activateTargetCell()) {
      frameId = requestAnimationFrame(() => {
        activateTargetCell();
      });
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [jumpToCellTarget, pendingJumpScrollTop, selectedColumns]);

  const effectiveScrollTop = Number.isFinite(pendingJumpScrollTop) ? pendingJumpScrollTop : tableScrollTop;
  const visibleWindowStart = Math.max(0, Math.floor(effectiveScrollTop / ROW_HEIGHT_PX) - ROW_OVERSCAN);
  const visibleWindowCount = Math.max(32, Math.ceil(tableViewportHeight / ROW_HEIGHT_PX) + ROW_OVERSCAN * 2);
  const visibleWindowEnd = Math.min(totalVisibleRows, visibleWindowStart + visibleWindowCount);
  const virtualRows = React.useMemo(() => {
    const out = [];
    for (let pos = visibleWindowStart; pos < visibleWindowEnd; pos += 1) {
      const index = resolveVisibleRowIndex(pos);
      if (index >= 0) {
        out.push({ rowIndex: index, visiblePosition: pos });
      }
    }
    return out;
  }, [visibleWindowStart, visibleWindowEnd, resolveVisibleRowIndex]);
  const virtualTopSpacer = visibleWindowStart * ROW_HEIGHT_PX;
  const virtualBottomSpacer = Math.max(0, (totalVisibleRows - visibleWindowEnd) * ROW_HEIGHT_PX);
  const largestRowLabel = Math.max(1, fullData.length, totalVisibleRows);
  const rowIndexWidth = Math.max(48, String(largestRowLabel).length * 8 + 24);
  const tableMinWidth = 40 + rowIndexWidth + selectedColumns.reduce(
    (total, columnName) => total + getColumnWidth(columnName),
    0
  );
  const hasVisibleColumns = selectedColumns.length > 0;
  const gridViewportWidth = hasVisibleColumns ? `min(100%, ${tableMinWidth}px)` : '100%';

  return (
    <div
      ref={tableViewportRef}
      onScroll={(event) => {
        latestScrollTopRef.current = event.currentTarget.scrollTop;
        if (scrollRafRef.current) return;
        scrollRafRef.current = requestAnimationFrame(() => {
          scrollRafRef.current = null;
          setTableScrollTop(latestScrollTopRef.current);
        });
      }}
      className={`data-grid-viewport h-full min-w-0 max-w-full overflow-x-scroll overflow-y-auto ${totalVisibleRows === 0 ? (isAyuTheme ? 'data-grid-empty-viewport-ayu' : 'bg-white') : (isRTheme ? 'bg-[#d9d9d9]' : 'bg-slate-50/20')}`}
      style={{ width: gridViewportWidth }}
    >
      <table
        className={`data-grid-table text-left text-sm whitespace-nowrap border-collapse data-grid-white table-fixed ${isResizingColumn ? 'is-column-resizing' : ''}`}
        style={{ width: `${tableMinWidth}px`, minWidth: `${tableMinWidth}px` }}
      >
        <colgroup>
          {hasVisibleColumns && <col style={{ width: '40px' }} />}
          {hasVisibleColumns && <col style={{ width: `${rowIndexWidth}px` }} />}
          {selectedColumns.map((columnName) => (
            <col
              key={`data-grid-col-${columnName}`}
              ref={(node) => {
                if (node) {
                  columnWidthColRefs.current[columnName] = node;
                } else {
                  delete columnWidthColRefs.current[columnName];
                }
              }}
              style={{ width: `${getColumnWidth(columnName)}px` }}
            />
          ))}
        </colgroup>
        {hasVisibleColumns && <thead className={`data-grid-header sticky top-0 z-10 shadow-sm ${isRTheme ? 'bg-[#0b1220] text-cyan-100/80' : 'bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400'
          }`}>
          <tr>
            <th className={`data-grid-utility-header-cell px-3 py-2 border-b w-10 text-center ${isRTheme ? 'border-cyan-900/40' : 'border-slate-200 dark:border-slate-800'}`}>
              <input
                ref={visibleRowsCheckboxRef}
                type="checkbox"
                checked={allVisibleRowsSelected}
                onChange={(e) => toggleVisibleRowsSelection(e.target.checked)}
                className={`rounded cursor-pointer ${isRTheme ? 'border-cyan-700 text-cyan-400 focus:ring-cyan-500' : 'border-slate-300 text-blue-600 focus:ring-blue-500'}`}
              />
            </th>
            <th className={`data-grid-utility-header-cell relative px-3 py-2 border-b text-sm font-medium w-12 text-center ${isRTheme ? 'border-cyan-900/40' : 'border-slate-200 dark:border-slate-800'}`}>
              #
              {onInsertColumn && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onInsertColumn(null);
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className={`column-insert-btn ${isResizingColumn ? 'hidden' : ''}`}
                  title="Insert empty column at start"
                  aria-label="Insert empty column at start"
                >
                  <Plus size={10} strokeWidth={2.8} />
                </button>
              )}
            </th>
            {selectedColumns.map((c, columnIndex) => {
              const isHeaderEditing = editingHeader === c;
              const colorMeta = columnColorStyles?.[c];
              const headerKey = `header::${c}`;
              const headerStyle = {
                ...(colorMeta ? {
                  backgroundColor: colorMeta.headerTint || undefined,
                  borderBottomColor: colorMeta.headerBorder || undefined,
                  '--data-grid-header-text': colorMeta.headerText,
                  color: colorMeta.headerText
                } : {}),
                ...(cellColorStyles?.[headerKey] || {}),
                ...(cellFontStyles?.[headerKey] || {}),
                ...(cellTextStyles?.[headerKey] || {}),
                '--data-grid-header-text': cellTextStyles?.[headerKey]?.color
                  || cellColorStyles?.[headerKey]?.color
                  || colorMeta?.headerText
              };
              const isColumnSelected = Boolean(
                rangeSelectionBounds
                && rangeSelectionBounds.rowStart === 0
                && rangeSelectionBounds.rowEnd === Math.max(0, totalVisibleRows - 1)
                && columnIndex >= rangeSelectionBounds.colStart
                && columnIndex <= rangeSelectionBounds.colEnd
              );
              return (
                <th
                  key={c}
                  data-colored-header={colorMeta ? 'true' : 'false'}
                  data-column-selected={isColumnSelected ? 'true' : 'false'}
                  className={`data-grid-column-header-cell relative px-4 py-2 border-b text-sm font-bold ${isRTheme ? 'border-cyan-900/40 text-cyan-100' : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'} ${isColumnSelected ? 'data-grid-column-header-selected' : ''}`}
                  style={headerStyle}
                  onContextMenu={(event) => onColumnHeaderContextMenu?.(c, event)}
                  onDoubleClick={() => beginHeaderEdit(c)}
                >
                  <div className="data-grid-column-header-inner">
                    {isHeaderEditing ? (
                      <input
                        autoFocus
                        value={editingHeaderValue}
                        onChange={(e) => setEditingHeaderValue(e.target.value)}
                        onBlur={() => commitHeaderEdit()}
                        placeholder="Column name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitHeaderEdit();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelHeaderEdit();
                          }
                        }}
                        className={`data-grid-column-header-input w-full text-sm px-2 py-1 font-medium rounded border ${isRTheme
                          ? 'bg-white border-slate-400 text-black'
                          : 'bg-white border-slate-300 text-slate-700'
                          }`}
                        style={{
                          fontFamily: headerStyle.fontFamily,
                          fontSize: headerStyle.fontSize,
                          textAlign: headerStyle.textAlign
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => onColumnHeaderSelect?.(c, event)}
                        onDoubleClick={() => beginHeaderEdit(c)}
                        className={`data-grid-column-header-button w-full text-left ${colorMeta ? 'data-grid-column-header-button-colored' : (isRTheme ? 'hover:text-cyan-200' : 'hover:text-slate-900')} transition-colors`}
                        style={{
                          fontFamily: headerStyle.fontFamily,
                          fontSize: headerStyle.fontSize,
                          color: headerStyle.color,
                          textAlign: headerStyle.textAlign
                        }}
                        title={c === '' ? 'Double-click to name this unnamed column' : 'Click to rename column'}
                        aria-label={c === '' ? 'Unnamed column. Double-click to name it' : `Column ${c}. Click to select or double-click to rename`}
                      >
                        {c}
                      </button>
                    )}
                  </div>
                  <div
                    className="column-resize-handle"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      event.currentTarget.setPointerCapture?.(event.pointerId);
                      resizeStateRef.current = {
                        column: c,
                        startX: event.clientX,
                        startWidth: getColumnWidth(c)
                      };
                      setIsResizingColumn(true);
                    }}
                  >
                    {onInsertColumn && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onInsertColumn(c);
                        }}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className={`column-insert-btn ${isResizingColumn ? 'hidden' : ''}`}
                        title="Insert empty column"
                        aria-label="Insert empty column"
                      >
                        <Plus size={10} strokeWidth={2.8} />
                      </button>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>}
        <tbody className={`data-grid-body ${isRTheme ? 'divide-y divide-white/70' : 'divide-y divide-slate-800'}`}>
          {!hasVisibleColumns ? null : totalVisibleRows === 0 ? (
            <tr>
              <td colSpan={selectedColumns.length + 2} className={`data-grid-empty ${isAyuTheme ? 'data-grid-empty-ayu' : 'bg-white'}`} aria-hidden="true" />
            </tr>
          ) : (
            <>
              {virtualTopSpacer > 0 && (
                <tr>
                  <td colSpan={selectedColumns.length + 2} style={{ height: `${virtualTopSpacer}px` }} />
                </tr>
              )}
              {virtualRows.map(({ rowIndex: originalIndex, visiblePosition }) => {
                const row = fullData?.[originalIndex] || {};
                const isSelected = isRowChecked(originalIndex);
                return (
                  <MemoizedDataGridRow
                    key={`row_${originalIndex}`}
                    originalIndex={originalIndex}
                    visibleRowPosition={visiblePosition}
                    row={row}
                    selectedColumns={selectedColumns}
                    isSelected={isSelected}
                    isRTheme={isRTheme}
                    editingColumnName={editingCell?.rowIndex === originalIndex ? editingCell.columnName : null}
                    jumpToColumnName={jumpToCellTarget?.rowIndex === originalIndex ? jumpToCellTarget.columnName : null}
                    rangeSelectionBounds={rangeSelectionBounds}
                    columnColorStyles={columnColorStyles}
                    cellColorStyles={cellColorStyles}
                    cellFontStyles={cellFontStyles}
                    cellTextStyles={cellTextStyles}
                    formattingDefaults={formattingDefaults}
                    columnCellColorStyles={columnCellColorStyles}
                    columnFontStyles={columnFontStyles}
                    columnTextStyles={columnTextStyles}
                    cellColorRanges={cellColorRanges}
                    cellFontRanges={cellFontRanges}
                    cellTextRanges={cellTextRanges}
                    toggleRow={toggleRow}
                    beginCellEdit={beginCellEdit}
                    onCellPointerDown={onCellPointerDown}
                    onCellPointerEnter={onCellPointerEnter}
                    onCellPointerUp={onCellPointerUp}
                    onCellContextMenu={onCellContextMenu}
                    onRowHeaderContextMenu={onRowHeaderContextMenu}
                    onRowHeaderSelect={onRowHeaderSelect}
                    onInsertRow={onInsertRow}
                    onColumnResizeStart={handleColumnResizeStart}
                    commitCellEdit={commitCellEdit}
                    navigateCellEdit={navigateCellEdit}
                    cancelCellEdit={cancelCellEdit}
                    editingValueRef={editingValueRef}
                  />
                );
              })}
              {virtualBottomSpacer > 0 && (
                <tr>
                  <td colSpan={selectedColumns.length + 2} style={{ height: `${virtualBottomSpacer}px` }} />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default function DataExplorer({
  // Data props
  fullData,
  filteredRowIndices,
  columns,
  searchTerm,
  setSearchTerm,

  // Selection Props
  selectedRowsMode = 'all',
  selectedRows,
  selectedRowCount = 0,
  visibleSelectedCount = 0,
  isRowSelected,
  selectedColumns,
  selectAllRows,
  deselectAllRows,
  selectFirstNRows,
  selectLastNRows,
  toggleRow,
  toggleVisibleRowsSelection,
  selectAllColumns,
  deselectAllColumns,
  toggleColumn,
  quickSelectN,
  setQuickSelectN,
  cleanMissingValues,
  handleReplaceValue,

  // Inferential Props (for layout)
  groupVar,
  setGroupVar,
  responseVar,
  inferentialAllGroupLevels = [],
  inferentialSelectedGroupSet,
  toggleInferentialGroupLevel,
  setSelectedRowsForGroups,

  // Manipulation Props
  mergeColumnA, setMergeColumnA,
  mergeColumnB, setMergeColumnB,
  mergeColumnName, setMergeColumnName,
  mergeMode, setMergeMode,
  handleMergeColumns,
  handleSaveDatasetCsv,
  isSavingDatasetCsv = false,
  handleSaveDatasetXlsx,
  isSavingDatasetXlsx = false,
  handleSaveDatasetPdf,
  isSavingDatasetPdf = false,
  canUndoDataset = false,
  handleUndoDataset,
  sheetNames = [],
  activeSheetName = '',
  handleSheetChange,
  handleAddSheet,
  handleRenameSheet,
  handleDeleteSheet,
  sourceFileName = '',
  isVirtualSource = false,
  addColumnName, setAddColumnName,
  addColumnValue, setAddColumnValue,
  handleAddColumn,
  addRowValue, setAddRowValue,
  handleAddRow,
  handleInsertRowAfter,
  handleDeleteRows,
  handleCalculateSelectionTotal,
  handleReorderColumns,
  handleCreateDataset,
  handleCreateDataframe,
  createDataframeRows = '30', setCreateDataframeRows,
  createDataframeCols = '4', setCreateDataframeCols,
  createDataframePrefix = 'var', setCreateDataframePrefix,
  filterColumn, setFilterColumn,
  filterOperator, setFilterOperator,
  filterValue, setFilterValue,
  filterValue2, setFilterValue2,
  handleFilterRows,

  renameColumnNameFrom, setRenameColumnNameFrom,
  renameColumnNameTo, setRenameColumnNameTo,
  deleteColumnTarget, setDeleteColumnTarget,
  handleRenameColumnName,
  handleDeleteColumn,
  handleDeleteSelectedVariables,
  handleKeepSelectedColumns,

  reshapeIdColumn, setReshapeIdColumn,
  reshapePrefix, setReshapePrefix,
  reshapeFactorName, setReshapeFactorName,
  reshapeValueName, setReshapeValueName,
  handleReshapeWideToLong,
  separateSourceColumn, setSeparateSourceColumn,
  separateOutputCount, setSeparateOutputCount,
  separateOutputNames, setSeparateOutputNames,
  separateSeparator, setSeparateSeparator,
  separateRemoveOriginal, setSeparateRemoveOriginal,
  handleSeparateColumn,
  groupByColumn, setGroupByColumn,
  groupByColumns, setGroupByColumns,
  groupBySummaryColumn, setGroupBySummaryColumn,
  groupBySummaryFn, setGroupBySummaryFn,
  groupByResultName, setGroupByResultName,
  groupBySortDirection, setGroupBySortDirection,
  groupByOutputMode = 'summary_rows', setGroupByOutputMode,
  handleGroupBySummarise,
  studioGroupByEnabled = false,
  setStudioGroupByEnabled,
  sortColumn, setSortColumn,
  sortDirection, setSortDirection,
  sortMode, setSortMode,
  handleSortRows,
  distinctUseSelected, setDistinctUseSelected,
  distinctKeepAll, setDistinctKeepAll,
  handleDistinctRows,
  handleInlineCellEdit,
  handleInlineCellRangeEdit,
  handleRenameGroupLevels,
  handleFileChange,
  isApplyingDplyrTidyr,
  isDatasetSwitching = false,
  embedded = false,
  hideFullscreenToggle = false,
  initialTab = 'view',
  forcedTab = '',
  hideTabs = false,
  onOpenStudioWindow,
  isStudioWindow = false,

  // AI Agent props
  aiAgentDefaultOllamaUrl = 'http://localhost:11434/api/generate',
  aiAgentDefaultApiKey = '',

  // Misc
  visibleRowsCheckboxRef,
  allVisibleRowsSelected,
  viewerNotice,
  theme = 'ayu-dark',
  isRTheme = false,
  onEditorSelectionContextChange,
  syncResetToken = 0,
  onClose
}) {
  const isAyuTheme = theme === 'ayu-dark';
  const initialSheetSourceKey = `${String(sourceFileName || '__dataset__').trim() || '__dataset__'}::${String(activeSheetName || '__default__').trim() || '__default__'}`;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [undoRestoreTarget, setUndoRestoreTarget] = useState('last');
  const [undoTimerOpen, setUndoTimerOpen] = useState(false);
  const [undoTimerPosition, setUndoTimerPosition] = useState(null);
  const undoTimerMenuRef = useRef(null);
  const undoTimerPanelRef = useRef(null);
  const effectiveTab = forcedTab || activeTab;

  useEffect(() => {
    if (!undoTimerOpen) return undefined;
    const closeMenu = (event) => {
      if (!undoTimerMenuRef.current?.contains(event.target) && !undoTimerPanelRef.current?.contains(event.target)) {
        setUndoTimerOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setUndoTimerOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [undoTimerOpen]);
  const emittedSelectionContextRef = useRef(false);
  const [studioPanels, setStudioPanels] = useState({
    merge: false,
    reshape: false,
    separate: false,
    filter: false,
    select: false,
    renameLevels: false,
    arrange: false,
    summarize: false,
    distinct: false
  });
  const selectGroupByEnabled = Boolean(studioGroupByEnabled);
  const setSelectGroupByEnabled = useCallback((nextValue) => {
    if (typeof setStudioGroupByEnabled !== 'function') return;
    if (typeof nextValue === 'function') {
      setStudioGroupByEnabled((prev) => Boolean(nextValue(Boolean(prev))));
      return;
    }
    setStudioGroupByEnabled(Boolean(nextValue));
  }, [setStudioGroupByEnabled]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const editingCellRef = useRef(null);
  const editingValueRef = useRef('');
  const editingOriginalValueRef = useRef('');
  const [editingHeader, setEditingHeader] = useState(null);
  const [editingHeaderValue, setEditingHeaderValue] = useState('');
  const [jumpToCellTarget, setJumpToCellTarget] = useState(null);
  const [cellRangeSelection, setCellRangeSelection] = useState(null);
  const isCellRangeSelectingRef = useRef(false);
  const jumpToCellTimerRef = useRef(null);
  const [columnColors, setColumnColors] = useState(() => {
    const saved = DATA_EXPLORER_SHEET_COLUMN_COLORS[initialSheetSourceKey];
    return saved && typeof saved === 'object' ? saved : {};
  });
  const [columnWidths, setColumnWidths] = useState({});
  const [floatingTools, setFloatingTools] = useState(() => createFloatingToolState());
  const [summaryRequest, setSummaryRequest] = useState({ mode: 'summary' });
  const deferredFullData = useDeferredValue(fullData);
  const sheetColumnColorsRef = useRef(DATA_EXPLORER_SHEET_COLUMN_COLORS);
  const sheetCellColorsRef = useRef(DATA_EXPLORER_SHEET_CELL_COLORS);
  const sheetCellFontStylesRef = useRef(DATA_EXPLORER_SHEET_CELL_FONT_STYLES);
  const sheetCellTextStylesRef = useRef(DATA_EXPLORER_SHEET_CELL_TEXT_STYLES);
  const sheetColumnCellColorsRef = useRef(DATA_EXPLORER_SHEET_COLUMN_CELL_COLORS);
  const sheetColumnFontStylesRef = useRef(DATA_EXPLORER_SHEET_COLUMN_FONT_STYLES);
  const sheetColumnTextStylesRef = useRef(DATA_EXPLORER_SHEET_COLUMN_TEXT_STYLES);
  const sheetCellColorRangesRef = useRef(DATA_EXPLORER_SHEET_CELL_COLOR_RANGES);
  const sheetCellFontRangesRef = useRef(DATA_EXPLORER_SHEET_CELL_FONT_RANGES);
  const sheetCellTextRangesRef = useRef(DATA_EXPLORER_SHEET_CELL_TEXT_RANGES);
  const lastSheetNameRef = useRef(initialSheetSourceKey);
  const resizeStateRef = useRef(null);
  const resizeFrameRef = useRef(null);
  const pendingResizeRef = useRef(null);
  const columnWidthColRefs = useRef({});
  const shellRef = useRef(null);
  const floatingToolRefs = useRef({});
  const floatingToolTriggerRefs = useRef({});
  const floatingDragStateRef = useRef(null);
  const floatingDragCleanupRef = useRef(null);
  const floatingDragFrameRef = useRef(null);
  const pendingFloatingDragRef = useRef(null);
  const floatingResizeStateRef = useRef(null);
  const floatingResizeCleanupRef = useRef(null);
  const floatingResizeFrameRef = useRef(null);
  const pendingFloatingResizeRef = useRef(null);
  const pendingCellCommitRef = useRef('');
  const cellColorPickerInputRef = useRef(null);
  const cellColorPaletteRef = useRef(null);
  const [isResizingColumn, setIsResizingColumn] = useState(false);
  const [cellColors, setCellColors] = useState(() => {
    const saved = DATA_EXPLORER_SHEET_CELL_COLORS[initialSheetSourceKey];
    return saved && typeof saved === 'object' ? saved : {};
  });
  const [cellFontStyles, setCellFontStyles] = useState(() => {
    const saved = DATA_EXPLORER_SHEET_CELL_FONT_STYLES[initialSheetSourceKey];
    return saved && typeof saved === 'object' ? saved : {};
  });
  const [cellTextStyles, setCellTextStyles] = useState(() => {
    const saved = DATA_EXPLORER_SHEET_CELL_TEXT_STYLES[initialSheetSourceKey];
    return saved && typeof saved === 'object' ? saved : {};
  });
  const [cellFormattingDefaults, setCellFormattingDefaults] = useState({
    fontFamily: '',
    fontSize: '',
    color: '',
    textAlign: '',
    textTransform: '',
    fontWeight: '',
    fontStyle: '',
    textDecoration: ''
  });
  const [columnCellColors, setColumnCellColors] = useState(() => {
    const saved = DATA_EXPLORER_SHEET_COLUMN_CELL_COLORS[initialSheetSourceKey];
    return saved && typeof saved === 'object' ? saved : {};
  });
  const [columnFontStyles, setColumnFontStyles] = useState(() => {
    const saved = DATA_EXPLORER_SHEET_COLUMN_FONT_STYLES[initialSheetSourceKey];
    return saved && typeof saved === 'object' ? saved : {};
  });
  const [columnTextStyles, setColumnTextStyles] = useState(() => {
    const saved = DATA_EXPLORER_SHEET_COLUMN_TEXT_STYLES[initialSheetSourceKey];
    return saved && typeof saved === 'object' ? saved : {};
  });
  const [cellColorRanges, setCellColorRanges] = useState(() => {
    const saved = DATA_EXPLORER_SHEET_CELL_COLOR_RANGES[initialSheetSourceKey];
    return Array.isArray(saved) ? saved : [];
  });
  const [cellFontRanges, setCellFontRanges] = useState(() => {
    const saved = DATA_EXPLORER_SHEET_CELL_FONT_RANGES[initialSheetSourceKey];
    return Array.isArray(saved) ? saved : [];
  });
  const [cellTextRanges, setCellTextRanges] = useState(() => {
    const saved = DATA_EXPLORER_SHEET_CELL_TEXT_RANGES[initialSheetSourceKey];
    return Array.isArray(saved) ? saved : [];
  });
  const [customCellColorSwatches, setCustomCellColorSwatches] = useState(() => {
    const saved = DATA_EXPLORER_SHEET_CUSTOM_CELL_SWATCHES[initialSheetSourceKey];
    return Array.isArray(saved) ? saved.map((value) => String(value)) : [];
  });
  const [activeCellColorTarget, setActiveCellColorTarget] = useState(null);
  const [cellColorPalette, setCellColorPalette] = useState(null);
  const [cellContextMenu, setCellContextMenu] = useState(null);
  const [cellContextView, setCellContextView] = useState('main');
  const [contextMenuTab, setContextMenuTab] = useState('font');
  const [contextDropdown, setContextDropdown] = useState(null);
  const [contextDropdownPlacement, setContextDropdownPlacement] = useState('below');
  const cellContextMenuRef = useRef(null);
  const cellContextSubpanelRef = useRef(null);
  const cellContextTargetRef = useRef(null);
  const [draggedColumnName, setDraggedColumnName] = useState('');
  const [dragOverColumnName, setDragOverColumnName] = useState('');
  const columnDragPreviewRef = useRef(null);
  const clearColumnDragPreview = useCallback(() => {
    const preview = columnDragPreviewRef.current;
    if (preview?.parentNode) preview.parentNode.removeChild(preview);
    columnDragPreviewRef.current = null;
  }, []);
  const [groupColumnToAdd, setGroupColumnToAdd] = useState('');
  const [selectedGroupColumns, setSelectedGroupColumns] = useState([]);
  const [groupColumnSelectedLevels, setGroupColumnSelectedLevels] = useState({});
  const [groupLevelRenameValue, setGroupLevelRenameValue] = useState('');
  const [groupLevelRenameLimit, setGroupLevelRenameLimit] = useState(1);
  const [isRenamingGroupLevels, setIsRenamingGroupLevels] = useState(false);
  const [selectionStepperMode, setSelectionStepperMode] = useState('');
  const validFocusedGroupColumns = useMemo(
    () => selectedGroupColumns.filter((columnName) => columns.includes(columnName)),
    [columns, selectedGroupColumns]
  );
  const isGroupColumnFocusActive = validFocusedGroupColumns.length > 1;
  const DEFAULT_COLUMN_WIDTH = 160;
  const MIN_COLUMN_WIDTH = 80;
  const MAX_COLUMN_WIDTH = 640;

  useEffect(() => () => {
    if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current);
    if (floatingDragFrameRef.current) cancelAnimationFrame(floatingDragFrameRef.current);
    if (floatingResizeFrameRef.current) cancelAnimationFrame(floatingResizeFrameRef.current);
    isCellRangeSelectingRef.current = false;
    if (typeof floatingDragCleanupRef.current === 'function') {
      floatingDragCleanupRef.current();
      floatingDragCleanupRef.current = null;
    }
    if (typeof floatingResizeCleanupRef.current === 'function') {
      floatingResizeCleanupRef.current();
      floatingResizeCleanupRef.current = null;
    }
    if (jumpToCellTimerRef.current) clearTimeout(jumpToCellTimerRef.current);
  }, []);

  useEffect(() => () => clearColumnDragPreview(), [clearColumnDragPreview]);

  useEffect(() => {
    if (!syncResetToken) return;
    setSelectedGroupColumns([]);
    setGroupColumnSelectedLevels({});
    setGroupColumnToAdd('');
    setCellRangeSelection(null);
  }, [syncResetToken]);

  const parseHexColor = useCallback((hex) => {
    if (!hex || typeof hex !== 'string') return null;
    let cleaned = hex.trim().replace('#', '');
    if (cleaned.length === 3) {
      cleaned = cleaned.split('').map((c) => `${c}${c}`).join('');
    }
    if (cleaned.length !== 6) return null;
    const r = Number.parseInt(cleaned.slice(0, 2), 16);
    const g = Number.parseInt(cleaned.slice(2, 4), 16);
    const b = Number.parseInt(cleaned.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }, []);

  const rgbaFromHex = useCallback((hex, alpha) => {
    const rgb = parseHexColor(hex);
    if (!rgb) return null;
    const safeAlpha = Math.max(0, Math.min(1, Number(alpha)));
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
  }, [parseHexColor]);

  const getReadableTextColor = useCallback((hex) => {
    const rgb = parseHexColor(hex);
    if (!rgb) return undefined;
    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return luminance > 0.62 ? '#0f172a' : '#f8fafc';
  }, [parseHexColor]);

  const columnColorStyles = useMemo(() => {
    if (!columnColors || Object.keys(columnColors).length === 0) return {};
    const out = {};
    Object.entries(columnColors).forEach(([col, color]) => {
      const headerText = getReadableTextColor(color);
      const useDarkHeaderText = headerText === '#0f172a';
      out[col] = {
        headerTint: rgbaFromHex(color, isAyuTheme ? (useDarkHeaderText ? 0.38 : 0.84) : (isRTheme ? 0.28 : 0.2)),
        headerBorder: rgbaFromHex(color, isAyuTheme ? (useDarkHeaderText ? 0.55 : 0.92) : (isRTheme ? 0.48 : 0.32)),
        cellTint: rgbaFromHex(color, isAyuTheme ? 0.15 : (isRTheme ? 0.14 : 0.08)),
        headerText: isAyuTheme && !useDarkHeaderText ? '#ffffff' : headerText
      };
    });
    return out;
  }, [columnColors, rgbaFromHex, getReadableTextColor, isAyuTheme, isRTheme]);
  const cellColorStyles = useMemo(() => {
    if (!cellColors || Object.keys(cellColors).length === 0) return {};
    const out = {};
    Object.entries(cellColors).forEach(([cellKey, color]) => {
      if (!color) return;
      out[cellKey] = {
        backgroundColor: color,
        color: getReadableTextColor(color),
        '--data-grid-cell-text': getReadableTextColor(color) || '#0f172a'
      };
    });
    return out;
  }, [cellColors, getReadableTextColor]);
  const columnCellColorStyles = useMemo(() => {
    if (!columnCellColors || Object.keys(columnCellColors).length === 0) return {};
    const out = {};
    Object.entries(columnCellColors).forEach(([columnName, color]) => {
      if (!color) return;
      out[columnName] = {
        backgroundColor: color,
        color: getReadableTextColor(color),
        '--data-grid-cell-text': getReadableTextColor(color) || '#0f172a'
      };
    });
    return out;
  }, [columnCellColors, getReadableTextColor]);
  const getTargetColumnNames = useCallback((target) => (
    target?.wholeColumn && Array.isArray(target.columnNames)
      ? Array.from(new Set(target.columnNames.map((value) => String(value ?? '').trim())))
      : []
  ), []);
  const getTargetRange = useCallback((target) => (
    target?.selectionRange && target.selectionBounds
      ? target.selectionBounds
      : null
  ), []);
  const updateCellRangeStyle = useCallback((setter, target, property, value, extraStyle = {}) => {
    const bounds = getTargetRange(target);
    if (!bounds) return false;
    setter((previous) => {
      const next = Array.isArray(previous) ? [...previous] : [];
      const rangeIndex = next.findIndex((range) => (
        range
        && range.rowStart === bounds.rowStart
        && range.rowEnd === bounds.rowEnd
        && range.colStart === bounds.colStart
        && range.colEnd === bounds.colEnd
      ));
      const existing = rangeIndex >= 0 ? next[rangeIndex] : null;
      const style = { ...(existing?.style || {}), ...extraStyle };
      if (value) style[property] = value;
      else delete style[property];
      const nextRange = {
        rowStart: bounds.rowStart,
        rowEnd: bounds.rowEnd,
        colStart: bounds.colStart,
        colEnd: bounds.colEnd,
        style
      };
      if (Object.keys(style).length === 0) {
        if (rangeIndex >= 0) next.splice(rangeIndex, 1);
      } else if (rangeIndex >= 0) {
        next[rangeIndex] = nextRange;
      } else {
        next.push(nextRange);
      }
      return next;
    });
    return true;
  }, [getTargetRange]);

  const applyCellColor = useCallback((nextColor) => {
    const target = activeCellColorTarget;
    const safeColor = String(nextColor || '').trim();
    if (!target?.key || !safeColor) return;
    if (updateCellRangeStyle(
      setCellColorRanges,
      target,
      'backgroundColor',
      safeColor,
      {
        color: getReadableTextColor(safeColor),
        '--data-grid-cell-text': getReadableTextColor(safeColor) || '#0f172a'
      }
    )) {
      setCellColorPalette(null);
      return;
    }
    const targetColumns = getTargetColumnNames(target);
    if (targetColumns.length > 0) {
      setColumnCellColors((prev) => {
        const next = { ...(prev || {}) };
        targetColumns.forEach((columnName) => {
          if (safeColor) next[columnName] = safeColor;
          else delete next[columnName];
        });
        return next;
      });
      setCellColors((prev) => {
        const next = { ...(prev || {}) };
        targetColumns.forEach((columnName) => {
          next[`header::${columnName}`] = safeColor;
        });
        return next;
      });
      setCellColorPalette(null);
      return;
    }
    const targetKeys = Array.isArray(target.selectionKeys) && target.selectionKeys.length > 0
      ? target.selectionKeys
      : [target.key];
    setCellColors((prev) => {
      const next = { ...(prev || {}) };
      targetKeys.forEach((key) => {
        next[key] = safeColor;
      });
      return next;
    });
    setCellColorPalette(null);
  }, [activeCellColorTarget, getReadableTextColor, getTargetColumnNames, updateCellRangeStyle]);
  const registerCustomCellColor = useCallback((rawColor) => {
    const safeColor = String(rawColor || '').trim();
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(safeColor)) return;
    const normalized = safeColor.length === 4
      ? `#${safeColor.slice(1).split('').map((segment) => `${segment}${segment}`).join('')}`.toLowerCase()
      : safeColor.toLowerCase();
    if (CELL_COLOR_SWATCHES.some((color) => String(color).toLowerCase() === normalized)) return;
    setCustomCellColorSwatches((prev) => {
      const previous = Array.isArray(prev) ? prev.map((color) => String(color).toLowerCase()) : [];
      const next = [normalized, ...previous.filter((color) => color !== normalized)];
      return next.slice(0, 12);
    });
  }, []);
  const clearCellColorForTarget = useCallback(() => {
    const target = activeCellColorTarget;
    if (!target?.key) return;
    const targetRange = getTargetRange(target);
    if (targetRange) {
      setCellColorRanges((previous) => previous.filter((range) => (
        range.rowStart !== targetRange.rowStart
        || range.rowEnd !== targetRange.rowEnd
        || range.colStart !== targetRange.colStart
        || range.colEnd !== targetRange.colEnd
      )));
      setCellColorPalette(null);
      return;
    }
    const targetColumns = getTargetColumnNames(target);
    if (targetColumns.length > 0) {
      setColumnCellColors((prev) => {
        const next = { ...(prev || {}) };
        targetColumns.forEach((columnName) => delete next[columnName]);
        return next;
      });
      setCellColors((prev) => {
        const next = { ...(prev || {}) };
        targetColumns.forEach((columnName) => delete next[`header::${columnName}`]);
        return next;
      });
      setCellColorPalette(null);
      return;
    }
    const targetKeys = Array.isArray(target.selectionKeys) && target.selectionKeys.length > 0
      ? target.selectionKeys
      : [target.key];
    setCellColors((prev) => {
      if (!prev || !targetKeys.some((key) => Object.prototype.hasOwnProperty.call(prev, key))) return prev;
      const next = { ...prev };
      targetKeys.forEach((key) => delete next[key]);
      return next;
    });
    setCellColorPalette(null);
  }, [activeCellColorTarget, getTargetColumnNames, getTargetRange]);
  const openCellColorPicker = useCallback((rowIndex, columnName, cellNode, selectionKeys = [], selectionMeta = {}) => {
    const safeRowIndex = Number(rowIndex);
    const safeColumnName = String(columnName || '').trim();
    if (!Number.isInteger(safeRowIndex) || safeRowIndex < 0 || !safeColumnName) return;
    const key = `${safeRowIndex}::${safeColumnName}`;
    const nextColor = cellColors?.[key] || columnColors?.[safeColumnName] || '#3b82f6';
    setActiveCellColorTarget({
      rowIndex: safeRowIndex,
      columnName: safeColumnName,
      key,
      selectionKeys: Array.isArray(selectionKeys) && selectionKeys.length > 0 ? selectionKeys : [key],
      wholeColumn: Boolean(selectionMeta?.wholeColumn),
      columnNames: Array.isArray(selectionMeta?.columnNames) ? selectionMeta.columnNames : [],
      selectionRange: Boolean(selectionMeta?.selectionRange),
      selectionBounds: selectionMeta?.selectionBounds || null
    });
    const rect = typeof cellNode?.getBoundingClientRect === 'function'
      ? cellNode.getBoundingClientRect()
      : null;
    const panelWidth = 238;
    const swatchColumns = 6;
    const baseRows = Math.ceil(CELL_COLOR_SWATCHES.length / swatchColumns);
    const customRows = customCellColorSwatches.length > 0
      ? Math.ceil(customCellColorSwatches.length / swatchColumns)
      : 0;
    const estimatedSwatchSize = 28;
    const estimatedGap = 6;
    const estimatedBaseGridHeight = (baseRows * estimatedSwatchSize) + Math.max(0, (baseRows - 1) * estimatedGap);
    const estimatedCustomGridHeight = customRows > 0
      ? (customRows * estimatedSwatchSize) + Math.max(0, (customRows - 1) * estimatedGap) + 34
      : 0;
    const panelHeight = 28 + estimatedBaseGridHeight + estimatedCustomGridHeight + 36;
    const margin = 8;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 720;
    const baseLeft = rect ? rect.left + Math.max(0, (rect.width - panelWidth) / 2) : (viewportWidth - panelWidth) / 2;
    const desiredTop = rect ? rect.bottom + margin : (viewportHeight - panelHeight) / 2;
    const fallbackTop = rect ? rect.top - panelHeight - margin : desiredTop;
    const unclampedTop = desiredTop + panelHeight <= viewportHeight - margin
      ? desiredTop
      : fallbackTop;
    const left = clampValue(baseLeft, margin, Math.max(margin, viewportWidth - panelWidth - margin));
    const top = clampValue(unclampedTop, margin, Math.max(margin, viewportHeight - panelHeight - margin));
    setCellColorPalette({
      left,
      top,
      key,
      color: nextColor
    });
  }, [cellColors, columnColors, customCellColorSwatches.length]);
  useEffect(() => {
    if (!cellColorPalette || typeof window === 'undefined') return undefined;
    let rafId = null;
    const adjustPaletteBounds = () => {
      const paletteNode = cellColorPaletteRef.current;
      if (!paletteNode) return;
      const rect = paletteNode.getBoundingClientRect();
      const margin = 8;
      const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
      const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
      const nextLeft = clampValue(cellColorPalette.left, margin, maxLeft);
      const nextTop = clampValue(cellColorPalette.top, margin, maxTop);
      if (Math.abs(nextLeft - cellColorPalette.left) > 0.5 || Math.abs(nextTop - cellColorPalette.top) > 0.5) {
        setCellColorPalette((prev) => {
          if (!prev) return prev;
          if (Math.abs(nextLeft - prev.left) <= 0.5 && Math.abs(nextTop - prev.top) <= 0.5) return prev;
          return { ...prev, left: nextLeft, top: nextTop };
        });
      }
    };
    rafId = window.requestAnimationFrame(adjustPaletteBounds);
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [cellColorPalette, customCellColorSwatches.length]);
  const openCustomCellColorPicker = useCallback(() => {
    const target = activeCellColorTarget;
    if (!target?.key) return;
    const input = cellColorPickerInputRef.current;
    if (!input) return;
    const nextColor = cellColors?.[target.key] || columnColors?.[target.columnName] || '#3b82f6';
    input.value = nextColor;
    input.click();
  }, [activeCellColorTarget, cellColors, columnColors]);
  const applyCellColorFromPicker = useCallback((event) => {
    const nextColor = String(event?.target?.value || '').trim();
    if (!nextColor) return;
    registerCustomCellColor(nextColor);
    applyCellColor(nextColor);
  }, [applyCellColor, registerCustomCellColor]);
  useEffect(() => {
    if (!cellColorPalette) return undefined;

    const closePalette = () => {
      setCellColorPalette((prev) => (prev ? null : prev));
    };
    const handlePointerDown = (event) => {
      const paletteNode = cellColorPaletteRef.current;
      if (paletteNode && paletteNode.contains(event.target)) return;
      closePalette();
    };
    const handleContextMenu = (event) => {
      const paletteNode = cellColorPaletteRef.current;
      if (paletteNode && paletteNode.contains(event.target)) return;
      closePalette();
    };
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closePalette();
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('scroll', closePalette, true);
    window.addEventListener('resize', closePalette);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('scroll', closePalette, true);
      window.removeEventListener('resize', closePalette);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cellColorPalette]);

  const getColumnWidth = useCallback(
    (columnName) => {
      const raw = columnWidths?.[columnName];
      if (Number.isFinite(raw)) return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, raw));
      return DEFAULT_COLUMN_WIDTH;
    },
    [columnWidths]
  );

  const exportColumnWidths = useMemo(
    () => columns.reduce((widths, columnName) => {
      widths[columnName] = getColumnWidth(columnName);
      return widths;
    }, {}),
    [columns, getColumnWidth]
  );

  const exportFormatting = useMemo(() => ({
    fontSize: cellFormattingDefaults?.fontSize || '13px',
    headerFontSize: '14px',
    rowHeight: 28,
    headerRowHeight: 30
  }), [cellFormattingDefaults?.fontSize]);

  useEffect(() => {
    if (!isResizingColumn) return undefined;
    const handleMove = (event) => {
      const state = resizeStateRef.current;
      if (!state) return;
      pendingResizeRef.current = {
        column: state.column,
        width: Math.max(
          MIN_COLUMN_WIDTH,
          Math.min(MAX_COLUMN_WIDTH, state.startWidth + (event.clientX - state.startX))
        )
      };
      if (resizeFrameRef.current) return;
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        const pending = pendingResizeRef.current;
        if (!pending) return;
        const columnNode = columnWidthColRefs.current?.[pending.column];
        if (columnNode) {
          columnNode.style.width = `${pending.width}px`;
        }
      });
    };
    const handleUp = () => {
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      const pending = pendingResizeRef.current;
      if (pending) {
        const columnNode = columnWidthColRefs.current?.[pending.column];
        if (columnNode) {
          columnNode.style.width = `${pending.width}px`;
        }
        setColumnWidths((prev) => {
          if (prev?.[pending.column] === pending.width) return prev;
          return {
            ...prev,
            [pending.column]: pending.width
          };
        });
      }
      pendingResizeRef.current = null;
      resizeStateRef.current = null;
      setIsResizingColumn(false);
    };
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleUp);
    return () => {
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
    };
  }, [isResizingColumn]);

  const setColumnColor = useCallback((column, color) => {
    if (column === null || column === undefined) return;
    const columnKey = String(column);
    setColumnColors((prev) => {
      if (prev[columnKey] === color) return prev;
      return { ...prev, [columnKey]: color };
    });
  }, []);

  const clearColumnColor = useCallback((column) => {
    if (column === null || column === undefined) return;
    const columnKey = String(column);
    setColumnColors((prev) => {
      if (!prev[columnKey]) return prev;
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
  }, []);

  const selectedRowsLookup = useMemo(() => new Set(selectedRows), [selectedRows]);
  const isRowChecked = useCallback((rowIndex) => {
    if (typeof isRowSelected === 'function') return isRowSelected(rowIndex);
    if (selectedRowsMode === 'all') return !selectedRowsLookup.has(rowIndex);
    return selectedRowsLookup.has(rowIndex);
  }, [isRowSelected, selectedRowsMode, selectedRowsLookup]);
  const selectedRowCountLive = useMemo(() => {
    const totalRows = Array.isArray(fullData) ? fullData.length : 0;
    if (totalRows <= 0) return 0;

    const uniqueValidRows = new Set();
    const candidateRows = Array.isArray(selectedRows) ? selectedRows : [];
    candidateRows.forEach((rowIndex) => {
      const normalized = Number(rowIndex);
      if (!Number.isInteger(normalized) || normalized < 0 || normalized >= totalRows) return;
      uniqueValidRows.add(normalized);
    });

    if (selectedRowsMode === 'all') {
      return Math.max(0, totalRows - uniqueValidRows.size);
    }
    return uniqueValidRows.size;
  }, [fullData.length, selectedRows, selectedRowsMode]);
  const selectedAdditionalGroupColumns = useMemo(
    () => selectedGroupColumns.filter((columnName) => String(columnName) !== String(groupVar || '')),
    [selectedGroupColumns, groupVar]
  );
  const selectedAdditionalCategoricalColumns = useMemo(() => {
    if (!Array.isArray(selectedAdditionalGroupColumns) || selectedAdditionalGroupColumns.length === 0) return [];
    const sampleLimit = Math.min(fullData.length, 5000);
    const parseNumericValue = (rawValue) => {
      const text = String(rawValue ?? '').trim();
      if (!text) return null;
      const compact = text.replace(/\s+/g, '');
      let normalized = compact;
      if (compact.includes(',') && compact.includes('.')) {
        normalized = compact.replace(/,/g, '');
      } else if (compact.includes(',') && !compact.includes('.')) {
        normalized = compact.replace(',', '.');
      }
      const numericValue = Number(normalized);
      return Number.isFinite(numericValue) ? numericValue : null;
    };
    return selectedAdditionalGroupColumns.filter((columnName) => {
      let observed = 0;
      let numericCount = 0;
      for (let i = 0; i < sampleLimit; i += 1) {
        const raw = fullData[i]?.[columnName];
        if (raw === undefined || raw === null || String(raw).trim() === '') continue;
        observed += 1;
        if (parseNumericValue(raw) !== null) numericCount += 1;
      }
      if (observed === 0) return false;
      if (numericCount === 0) return true;
      const numericRatio = numericCount / observed;
      // Treat mostly numeric columns as numeric to avoid level chips for columns like measurements
      // that might include a few text artifacts/units.
      return numericRatio < 0.85;
    });
  }, [fullData, selectedAdditionalGroupColumns]);
  const groupColumnLevelsMap = useMemo(() => {
    const next = {};
    selectedAdditionalCategoricalColumns.forEach((columnName) => {
      const levels = fullData
        .map((row) => row?.[columnName])
        .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
        .map((value) => String(value));
      next[columnName] = Array.from(new Set(levels));
    });
    return next;
  }, [fullData, selectedAdditionalCategoricalColumns]);
  useEffect(() => {
    setGroupColumnSelectedLevels((prev) => {
      const next = {};
      selectedAdditionalCategoricalColumns.forEach((columnName) => {
        const availableLevels = Array.isArray(groupColumnLevelsMap[columnName]) ? groupColumnLevelsMap[columnName] : [];
        const previousLevels = Array.isArray(prev?.[columnName])
          ? prev[columnName].map((level) => String(level)).filter((level) => availableLevels.includes(level))
          : availableLevels;
        next[columnName] = previousLevels.length > 0 || availableLevels.length === 0
          ? previousLevels
          : availableLevels;
      });

      const prevKeys = Object.keys(prev || {});
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) return next;
      for (let index = 0; index < nextKeys.length; index += 1) {
        const key = nextKeys[index];
        const prevValues = Array.isArray(prev[key]) ? prev[key].map((level) => String(level)) : [];
        const nextValues = Array.isArray(next[key]) ? next[key].map((level) => String(level)) : [];
        if (prevValues.length !== nextValues.length) return next;
        for (let valueIndex = 0; valueIndex < nextValues.length; valueIndex += 1) {
          if (prevValues[valueIndex] !== nextValues[valueIndex]) return next;
        }
      }
      return prev;
    });
  }, [groupColumnLevelsMap, selectedAdditionalCategoricalColumns]);
  const rowMatchesAddedColumnLevels = useCallback((rowIndex) => {
    if (!isGroupColumnFocusActive || selectedAdditionalCategoricalColumns.length === 0) return true;
    const row = fullData?.[rowIndex] || {};
    for (let index = 0; index < selectedAdditionalCategoricalColumns.length; index += 1) {
      const columnName = selectedAdditionalCategoricalColumns[index];
      const selectedLevels = Array.isArray(groupColumnSelectedLevels?.[columnName])
        ? groupColumnSelectedLevels[columnName].map((level) => String(level))
        : (groupColumnLevelsMap[columnName] || []);
      if (!Array.isArray(selectedLevels) || selectedLevels.length === 0) return false;
      const rawValue = row?.[columnName];
      if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') return false;
      const normalizedValue = String(rawValue);
      if (!selectedLevels.includes(normalizedValue)) return false;
    }
    return true;
  }, [
    fullData,
    groupColumnLevelsMap,
    groupColumnSelectedLevels,
    isGroupColumnFocusActive,
    selectedAdditionalCategoricalColumns
  ]);
  const selectionModeRowIndices = useMemo(() => {
    if (!isGroupColumnFocusActive || !Array.isArray(fullData) || fullData.length === 0) return null;
    const next = [];
    for (let rowIndex = 0; rowIndex < fullData.length; rowIndex += 1) {
      if (!isRowChecked(rowIndex)) continue;
      if (!rowMatchesAddedColumnLevels(rowIndex)) continue;
      next.push(rowIndex);
    }
    return next;
  }, [fullData, isGroupColumnFocusActive, isRowChecked, rowMatchesAddedColumnLevels]);

  const rowSelectionFocusActive = selectedRowsMode === 'subset' || (Array.isArray(selectedRows) && selectedRows.length > 0);
  const computedTotalRowIndices = useMemo(() => {
    const totalRows = [];
    const rows = Array.isArray(fullData) ? fullData : [];
    // Total rows created by the explorer are appended as a contiguous tail.
    // Walk backward until the first normal row so ordinary edits do not scan
    // every value in a large dataset just to find total markers.
    for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex -= 1) {
      const row = rows[rowIndex];
      const hasTotalValue = Object.values(row || {}).some((value) => /^T=/.test(String(value ?? '').trim()));
      if (!hasTotalValue) break;
      totalRows.push(rowIndex);
    }
    return totalRows.reverse();
  }, [fullData]);
  const effectiveFilteredRowIndices = useMemo(() => {
    if (!isGroupColumnFocusActive && !rowSelectionFocusActive && computedTotalRowIndices.length === 0) {
      return Array.isArray(filteredRowIndices) ? filteredRowIndices : null;
    }
    const baseIndices = Array.isArray(filteredRowIndices)
      ? filteredRowIndices
      : fullData.map((_, rowIndex) => rowIndex);
    const totalRowSet = new Set(computedTotalRowIndices);
    const visibleIndices = Array.from(new Set([...baseIndices, ...computedTotalRowIndices]));
    if (!isGroupColumnFocusActive && !rowSelectionFocusActive) {
      return visibleIndices;
    }
    return visibleIndices.filter((rowIndex) => {
      const safeRowIndex = Number(rowIndex);
      if (totalRowSet.has(safeRowIndex)) return true;
      if (rowSelectionFocusActive && !isRowChecked(safeRowIndex)) return false;
      if (isGroupColumnFocusActive && !rowMatchesAddedColumnLevels(safeRowIndex)) return false;
      return true;
    });
  }, [computedTotalRowIndices, filteredRowIndices, fullData.length, isGroupColumnFocusActive, isRowChecked, rowMatchesAddedColumnLevels, rowSelectionFocusActive]);
  const hasFilteredSubset = Array.isArray(effectiveFilteredRowIndices);
  const totalVisibleRows = hasFilteredSubset ? effectiveFilteredRowIndices.length : fullData.length;
  const selectedDataRowIndices = useMemo(() => {
    const visibleIndices = hasFilteredSubset
      ? effectiveFilteredRowIndices
      : fullData.map((_, rowIndex) => rowIndex);
    return visibleIndices.filter((rowIndex) => isRowChecked(rowIndex));
  }, [effectiveFilteredRowIndices, fullData.length, hasFilteredSubset, isRowChecked]);
  const agentRowScope = useMemo(
    () => selectedDataRowIndices.length > 0
      ? selectedDataRowIndices
      : fullData.map((_, rowIndex) => rowIndex),
    [fullData, selectedDataRowIndices]
  );
  const visibleRowPositionLookup = useMemo(() => {
    if (!hasFilteredSubset || !Array.isArray(effectiveFilteredRowIndices) || effectiveFilteredRowIndices.length === 0) {
      return null;
    }
    const next = new Map();
    effectiveFilteredRowIndices.forEach((rowIndex, visiblePosition) => {
      const safeRowIndex = Number(rowIndex);
      if (Number.isInteger(safeRowIndex) && safeRowIndex >= 0 && !next.has(safeRowIndex)) {
        next.set(safeRowIndex, visiblePosition);
      }
    });
    return next;
  }, [effectiveFilteredRowIndices, hasFilteredSubset]);
  const resolveVisibleRowIndex = useCallback((visiblePosition) => {
    if (!Number.isInteger(visiblePosition) || visiblePosition < 0 || visiblePosition >= totalVisibleRows) return -1;
    if (hasFilteredSubset) return Number(effectiveFilteredRowIndices?.[visiblePosition] ?? -1);
    return visiblePosition;
  }, [hasFilteredSubset, effectiveFilteredRowIndices, totalVisibleRows]);
  const findVisiblePositionForRow = useCallback((rowIndex) => {
    const safeRowIndex = Number(rowIndex);
    if (!Number.isInteger(safeRowIndex) || safeRowIndex < 0) return -1;
    if (hasFilteredSubset) {
      return visibleRowPositionLookup?.get(safeRowIndex) ?? -1;
    }
    return safeRowIndex < totalVisibleRows ? safeRowIndex : -1;
  }, [hasFilteredSubset, totalVisibleRows, visibleRowPositionLookup]);
  const focusedVisibleColumns = useMemo(() => {
    const next = validFocusedGroupColumns;
    return next.length > 0 ? next : selectedColumns;
  }, [selectedColumns, validFocusedGroupColumns]);
  const effectiveSelectedColumns = useMemo(
    () => (isGroupColumnFocusActive ? focusedVisibleColumns : selectedColumns),
    [isGroupColumnFocusActive, focusedVisibleColumns, selectedColumns]
  );
  const selectedColumnIndexLookup = useMemo(() => {
    const map = new Map();
    (Array.isArray(effectiveSelectedColumns) ? effectiveSelectedColumns : []).forEach((columnName, index) => {
      map.set(String(columnName), index);
    });
    return map;
  }, [effectiveSelectedColumns]);
  const cellSelectionBounds = useMemo(() => {
    if (!cellRangeSelection) return null;
    const maxRow = totalVisibleRows - 1;
    const maxCol = effectiveSelectedColumns.length - 1;
    if (maxRow < 0 || maxCol < 0) return null;

    const anchorRow = Number(cellRangeSelection.anchorRowPos);
    const anchorCol = Number(cellRangeSelection.anchorColIdx);
    const focusRow = Number(cellRangeSelection.focusRowPos);
    const focusCol = Number(cellRangeSelection.focusColIdx);
    if (![anchorRow, anchorCol, focusRow, focusCol].every((value) => Number.isFinite(value))) return null;

    const clampedAnchorRow = Math.max(0, Math.min(maxRow, Math.trunc(anchorRow)));
    const clampedAnchorCol = Math.max(0, Math.min(maxCol, Math.trunc(anchorCol)));
    const clampedFocusRow = Math.max(0, Math.min(maxRow, Math.trunc(focusRow)));
    const clampedFocusCol = Math.max(0, Math.min(maxCol, Math.trunc(focusCol)));

    return {
      rowStart: Math.min(clampedAnchorRow, clampedFocusRow),
      rowEnd: Math.max(clampedAnchorRow, clampedFocusRow),
      colStart: Math.min(clampedAnchorCol, clampedFocusCol),
      colEnd: Math.max(clampedAnchorCol, clampedFocusCol)
    };
  }, [cellRangeSelection, effectiveSelectedColumns.length, totalVisibleRows]);
  useEffect(() => {
    setCellRangeSelection((prev) => {
      if (!prev) return prev;
      const maxRow = totalVisibleRows - 1;
      const maxCol = effectiveSelectedColumns.length - 1;
      if (maxRow < 0 || maxCol < 0) return null;
      const next = {
        anchorRowPos: Math.max(0, Math.min(maxRow, Math.trunc(Number(prev.anchorRowPos) || 0))),
        anchorColIdx: Math.max(0, Math.min(maxCol, Math.trunc(Number(prev.anchorColIdx) || 0))),
        focusRowPos: Math.max(0, Math.min(maxRow, Math.trunc(Number(prev.focusRowPos) || 0))),
        focusColIdx: Math.max(0, Math.min(maxCol, Math.trunc(Number(prev.focusColIdx) || 0)))
      };
      if (
        next.anchorRowPos === prev.anchorRowPos
        && next.anchorColIdx === prev.anchorColIdx
        && next.focusRowPos === prev.focusRowPos
        && next.focusColIdx === prev.focusColIdx
      ) {
        return prev;
      }
      return next;
    });
  }, [effectiveSelectedColumns.length, totalVisibleRows]);
  useEffect(() => {
    const stopRangeSelection = () => {
      isCellRangeSelectingRef.current = false;
    };
    window.addEventListener('pointerup', stopRangeSelection);
    window.addEventListener('pointercancel', stopRangeSelection);
    return () => {
      window.removeEventListener('pointerup', stopRangeSelection);
      window.removeEventListener('pointercancel', stopRangeSelection);
    };
  }, []);

  const resolveEffectiveTarget = useCallback(() => {
    if (cellSelectionBounds) {
      const wholeColumn = Boolean(
        cellSelectionBounds.rowStart === 0
        && cellSelectionBounds.rowEnd === Math.max(0, totalVisibleRows - 1)
      );
      const selectionArea = (cellSelectionBounds.rowEnd - cellSelectionBounds.rowStart + 1)
        * (cellSelectionBounds.colEnd - cellSelectionBounds.colStart + 1);
      const selectionRange = !wholeColumn && selectionArea > LARGE_SELECTION_KEY_LIMIT;
      const selectionKeys = [];
      const selectedColumnNames = [];

      for (let colIdx = cellSelectionBounds.colStart; colIdx <= cellSelectionBounds.colEnd; colIdx += 1) {
        const colName = effectiveSelectedColumns[colIdx];
        if (colName && !selectedColumnNames.includes(colName)) {
          selectedColumnNames.push(colName);
        }
      }

      if (!selectionRange && !wholeColumn) {
        for (let rowPos = cellSelectionBounds.rowStart; rowPos <= cellSelectionBounds.rowEnd; rowPos += 1) {
          const rowIndex = resolveVisibleRowIndex(rowPos);
          if (rowIndex < 0) continue;
          selectedColumnNames.forEach((colName) => {
            selectionKeys.push(`${rowIndex}::${colName}`);
          });
        }
      }

      const primaryRow = resolveVisibleRowIndex(cellSelectionBounds.rowStart);
      const primaryKey = selectionKeys[0] || (selectedColumnNames[0]
        ? `${primaryRow >= 0 ? primaryRow : cellSelectionBounds.rowStart}::${selectedColumnNames[0]}`
        : '');

      return {
        kind: wholeColumn ? 'column-header' : 'cell',
        key: primaryKey,
        selectionKeys,
        wholeColumn,
        columnNames: selectedColumnNames,
        selectionRange,
        selectionBounds: cellSelectionBounds
      };
    }

    if (cellContextTargetRef.current?.key || cellContextTargetRef.current?.selectionKeys?.length) {
      return cellContextTargetRef.current;
    }

    if (effectiveSelectedColumns.length > 0 && totalVisibleRows > 0) {
      const firstRow = resolveVisibleRowIndex(0);
      const firstCol = effectiveSelectedColumns[0];
      const defaultKey = `${firstRow >= 0 ? firstRow : 0}::${firstCol}`;
      return {
        kind: 'cell',
        key: defaultKey,
        selectionKeys: [defaultKey],
        wholeColumn: false,
        columnNames: [firstCol],
        selectionRange: false,
        selectionBounds: { rowStart: 0, rowEnd: 0, colStart: 0, colEnd: 0 }
      };
    }

    return null;
  }, [cellSelectionBounds, effectiveSelectedColumns, resolveVisibleRowIndex, totalVisibleRows]);

  useEffect(() => {
    if (cellSelectionBounds) {
      cellContextTargetRef.current = resolveEffectiveTarget();
    }
  }, [cellSelectionBounds, resolveEffectiveTarget]);

  const resolveAgentFormattingTarget = useCallback((options = {}) => {
    const scope = String(options.scope || 'selection').trim().toLowerCase();
    const requestedColumnNames = Array.isArray(options.columns)
      ? options.columns
      : options.column
        ? [options.column]
        : [];
    const normalizedColumnNames = requestedColumnNames
      .map((columnName) => String(columnName || '').trim())
      .filter((columnName) => effectiveSelectedColumns.includes(columnName));
    const hasExplicitRow = options.row_index !== undefined || options.rowIndex !== undefined || options.row !== undefined;
    const requestedRowIndex = Number(options.row_index ?? options.rowIndex ?? options.row);
    const hasExplicitColumn = normalizedColumnNames.length > 0;
    const useCellSelection = scope === 'selection'
      && !hasExplicitRow
      && !hasExplicitColumn
      && cellSelectionBounds;

    const rowPositions = useCellSelection
      ? Array.from({ length: cellSelectionBounds.rowEnd - cellSelectionBounds.rowStart + 1 }, (_, index) => (
        cellSelectionBounds.rowStart + index
      ))
      : scope === 'column' && !hasExplicitRow
        ? Array.from({ length: totalVisibleRows }, (_, index) => index)
        : (hasExplicitRow && Number.isInteger(requestedRowIndex)
          ? [findVisiblePositionForRow(requestedRowIndex)]
          : agentRowScope.map((rowIndex) => findVisiblePositionForRow(rowIndex)))
          .filter((rowPosition) => Number.isInteger(rowPosition) && rowPosition >= 0 && rowPosition < totalVisibleRows);

    const colIndices = useCellSelection
      ? Array.from({ length: cellSelectionBounds.colEnd - cellSelectionBounds.colStart + 1 }, (_, index) => (
        cellSelectionBounds.colStart + index
      ))
      : (hasExplicitColumn
        ? normalizedColumnNames.map((columnName) => selectedColumnIndexLookup.get(columnName))
        : effectiveSelectedColumns.map((_, index) => index))
        .filter((columnIndex) => Number.isInteger(columnIndex) && columnIndex >= 0 && columnIndex < effectiveSelectedColumns.length);

    return {
      rowPositions: Array.from(new Set(rowPositions)),
      colIndices: Array.from(new Set(colIndices))
    };
  }, [agentRowScope, cellSelectionBounds, effectiveSelectedColumns, findVisiblePositionForRow, selectedColumnIndexLookup, totalVisibleRows]);

  const applyAgentGridStyle = useCallback((kind, rawValue, options = {}) => {
    const propertyByKind = {
      background: 'backgroundColor',
      text: 'color',
      fontFamily: 'fontFamily',
      fontSize: 'fontSize',
      textAlign: 'textAlign',
      textTransform: 'textTransform',
      fontWeight: 'fontWeight',
      fontStyle: 'fontStyle',
      textDecoration: 'textDecoration'
    };
    const property = propertyByKind[kind];
    if (!property) return false;
    const rawText = String(rawValue ?? '').trim();
    const isColor = kind === 'background' || kind === 'text';
    if (isColor && !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(rawText)) return false;
    if (!rawText) return false;
    const safeValue = isColor && rawText.length === 4
      ? `#${rawText.slice(1).split('').map((part) => `${part}${part}`).join('')}`.toLowerCase()
      : kind === 'fontSize' && /^\d+(?:\.\d+)?$/.test(rawText)
        ? `${rawText}px`
        : ['textTransform', 'fontStyle', 'textDecoration'].includes(kind) && ['normal', 'none'].includes(rawText.toLowerCase())
          ? ''
          : rawText;
    if (!safeValue && kind !== 'textTransform' && kind !== 'fontStyle' && kind !== 'textDecoration') return false;
    const target = resolveAgentFormattingTarget(options);
    if (target.rowPositions.length === 0 || target.colIndices.length === 0) return false;

    const groupConsecutive = (values) => {
      const sorted = Array.from(new Set(values)).sort((a, b) => a - b);
      const groups = [];
      sorted.forEach((value) => {
        const current = groups[groups.length - 1];
        if (!current || value !== current[current.length - 1] + 1) groups.push([value]);
        else current.push(value);
      });
      return groups;
    };
    const area = target.rowPositions.length * target.colIndices.length;
    const rowGroups = groupConsecutive(target.rowPositions);
    const colGroups = groupConsecutive(target.colIndices);

    if (area > LARGE_SELECTION_KEY_LIMIT) {
      const ranges = rowGroups.flatMap((rowGroup) => colGroups.map((colGroup) => ({
        rowStart: rowGroup[0],
        rowEnd: rowGroup[rowGroup.length - 1],
        colStart: colGroup[0],
        colEnd: colGroup[colGroup.length - 1],
        style: kind === 'background'
          ? {
            backgroundColor: safeValue,
            color: getReadableTextColor(safeValue),
            '--data-grid-cell-text': getReadableTextColor(safeValue) || '#0f172a'
          }
          : { [property]: safeValue }
      })));
      if (kind === 'background') setCellColorRanges((previous) => [...(previous || []), ...ranges]);
      else if (['fontFamily', 'fontSize'].includes(kind)) setCellFontRanges((previous) => [...(previous || []), ...ranges]);
      else setCellTextRanges((previous) => [...(previous || []), ...ranges]);
      return true;
    }

    const rowIndices = target.rowPositions.map((rowPosition) => resolveVisibleRowIndex(rowPosition));
    const columnNames = target.colIndices.map((columnIndex) => effectiveSelectedColumns[columnIndex]);
    if (kind === 'background') {
      setCellColors((previous) => {
        const next = { ...(previous || {}) };
        rowIndices.forEach((rowIndex) => {
          columnNames.forEach((columnName) => {
            if (rowIndex >= 0 && columnName) next[`${rowIndex}::${columnName}`] = safeValue;
          });
        });
        return next;
      });
    } else if (kind === 'fontFamily' || kind === 'fontSize') {
      setCellFontStyles((previous) => {
        const next = { ...(previous || {}) };
        rowIndices.forEach((rowIndex) => {
          columnNames.forEach((columnName) => {
            if (rowIndex < 0 || !columnName) return;
            const key = `${rowIndex}::${columnName}`;
            next[key] = { ...(next[key] || {}), [property]: safeValue };
          });
        });
        return next;
      });
    } else {
      setCellTextStyles((previous) => {
        const next = { ...(previous || {}) };
        rowIndices.forEach((rowIndex) => {
          columnNames.forEach((columnName) => {
            if (rowIndex < 0 || !columnName) return;
            const key = `${rowIndex}::${columnName}`;
            next[key] = { ...(next[key] || {}), [property]: safeValue };
          });
        });
        return next;
      });
    }
    return true;
  }, [effectiveSelectedColumns, getReadableTextColor, resolveAgentFormattingTarget, resolveVisibleRowIndex]);

  const handleAgentSetCellColor = useCallback(
    (color, options) => applyAgentGridStyle('background', color, options),
    [applyAgentGridStyle]
  );
  const handleAgentSetTextColor = useCallback(
    (color, options) => applyAgentGridStyle('text', color, options),
    [applyAgentGridStyle]
  );
  const handleAgentFormatCells = useCallback((format = {}, options = {}) => {
    const properties = [
      ['background', format.background_color ?? format.backgroundColor],
      ['text', format.color ?? format.text_color ?? format.textColor],
      ['fontFamily', format.font_family ?? format.fontFamily],
      ['fontSize', format.font_size ?? format.fontSize],
      ['textAlign', format.text_align ?? format.textAlign],
      ['textTransform', format.text_transform ?? format.textTransform],
      ['fontWeight', format.font_weight ?? format.fontWeight],
      ['fontStyle', format.font_style ?? format.fontStyle],
      ['textDecoration', format.text_decoration ?? format.textDecoration]
    ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
    return properties.reduce(
      (applied, [property, value]) => applyAgentGridStyle(property, value, options) || applied,
      false
    );
  }, [applyAgentGridStyle]);

  const applyCellFontStyle = useCallback((property, value, keepMenuOpen = false) => {
    const target = resolveEffectiveTarget();
    const safeProperty = property === 'fontFamily' || property === 'fontSize' ? property : '';
    const safeValue = String(value || '').trim();
    if (!target?.key && (!target?.selectionKeys || target.selectionKeys.length === 0)) return;

    if (safeProperty) {
      setCellFormattingDefaults((previous) => ({ ...previous, [safeProperty]: safeValue }));
    }

    cellContextTargetRef.current = target;

    if (updateCellRangeStyle(setCellFontRanges, target, safeProperty, safeValue)) {
      if (!keepMenuOpen) setCellContextMenu(null);
      return;
    }
    const targetColumns = getTargetColumnNames(target);
    if (targetColumns.length > 0) {
      setColumnFontStyles((prev) => {
        const next = { ...(prev || {}) };
        targetColumns.forEach((columnName) => {
          const existing = { ...(next[columnName] || {}) };
          if (safeValue) existing[safeProperty] = safeValue;
          else delete existing[safeProperty];
          if (Object.keys(existing).length > 0) next[columnName] = existing;
          else delete next[columnName];
        });
        return next;
      });
      setCellFontStyles((prev) => {
        const next = { ...(prev || {}) };
        targetColumns.forEach((columnName) => {
          const key = `header::${columnName}`;
          const existing = { ...(next[key] || {}) };
          if (safeValue) existing[safeProperty] = safeValue;
          else delete existing[safeProperty];
          if (Object.keys(existing).length > 0) next[key] = existing;
          else delete next[key];
        });
        return next;
      });
      if (!keepMenuOpen) setCellContextMenu(null);
      return;
    }
    const targetKeys = Array.isArray(target.selectionKeys) && target.selectionKeys.length > 0
      ? target.selectionKeys
      : [target.key];
    setCellFontStyles((prev) => {
      const next = { ...(prev || {}) };
      targetKeys.forEach((key) => {
        const existing = { ...(next[key] || {}) };
        if (safeValue) existing[safeProperty] = safeValue;
        else delete existing[safeProperty];
        if (Object.keys(existing).length > 0) next[key] = existing;
        else delete next[key];
      });
      return next;
    });
    if (!keepMenuOpen) setCellContextMenu(null);
  }, [getTargetColumnNames, resolveEffectiveTarget, updateCellRangeStyle]);

  const applyCellTextStyle = useCallback((property, value, keepMenuOpen = false) => {
    const target = resolveEffectiveTarget();
    const safeProperty = property === 'color' || property === 'textAlign' || property === 'textTransform' || property === 'fontWeight' || property === 'fontStyle' || property === 'textDecoration' ? property : '';
    const safeValue = String(value || '').trim();
    if (!target?.key && (!target?.selectionKeys || target.selectionKeys.length === 0)) return;

    if (safeProperty) {
      setCellFormattingDefaults((previous) => ({ ...previous, [safeProperty]: safeValue }));
    }

    cellContextTargetRef.current = target;

    if (updateCellRangeStyle(setCellTextRanges, target, safeProperty, safeValue)) {
      if (!keepMenuOpen) setCellContextMenu(null);
      return;
    }
    const targetColumns = getTargetColumnNames(target);
    if (targetColumns.length > 0) {
      setColumnTextStyles((prev) => {
        const next = { ...(prev || {}) };
        targetColumns.forEach((columnName) => {
          const existing = { ...(next[columnName] || {}) };
          if (safeValue) existing[safeProperty] = safeValue;
          else delete existing[safeProperty];
          if (Object.keys(existing).length > 0) next[columnName] = existing;
          else delete next[columnName];
        });
        return next;
      });
      setCellTextStyles((prev) => {
        const next = { ...(prev || {}) };
        targetColumns.forEach((columnName) => {
          const key = `header::${columnName}`;
          const existing = { ...(next[key] || {}) };
          if (safeValue) existing[safeProperty] = safeValue;
          else delete existing[safeProperty];
          if (Object.keys(existing).length > 0) next[key] = existing;
          else delete next[key];
        });
        return next;
      });
      if (!keepMenuOpen) setCellContextMenu(null);
      return;
    }
    const targetKeys = Array.isArray(target.selectionKeys) && target.selectionKeys.length > 0
      ? target.selectionKeys
      : [target.key];
    setCellTextStyles((prev) => {
      const next = { ...(prev || {}) };
      targetKeys.forEach((key) => {
        const existing = { ...(next[key] || {}) };
        if (safeValue) existing[safeProperty] = safeValue;
        else delete existing[safeProperty];
        if (Object.keys(existing).length > 0) next[key] = existing;
        else delete next[key];
      });
      return next;
    });
    if (!keepMenuOpen) setCellContextMenu(null);
  }, [getTargetColumnNames, resolveEffectiveTarget, updateCellRangeStyle]);

  const activeCellFormatting = useMemo(() => {
    const target = resolveEffectiveTarget();
    if (!target) return cellFormattingDefaults;
    const key = target.key;
    const fontMeta = cellFontStyles?.[key] || {};
    const textMeta = cellTextStyles?.[key] || {};
    let fontFamily = fontMeta.fontFamily || '';
    let fontSize = fontMeta.fontSize || '';
    let color = textMeta.color || '';
    let textAlign = textMeta.textAlign || '';
    let textTransform = textMeta.textTransform || '';
    let fontWeight = textMeta.fontWeight || '';
    let fontStyle = textMeta.fontStyle || '';
    let textDecoration = textMeta.textDecoration || '';

    if ((!fontFamily || !fontSize) && target.selectionBounds) {
      const rangeFont = findGridRangeStyle(cellFontRanges, target.selectionBounds.rowStart, target.selectionBounds.colStart);
      if (rangeFont) {
        if (!fontFamily) fontFamily = rangeFont.fontFamily || '';
        if (!fontSize) fontSize = rangeFont.fontSize || '';
      }
    }
    if ((!color || !textAlign || !textTransform || !fontWeight || !fontStyle || !textDecoration) && target.selectionBounds) {
      const rangeText = findGridRangeStyle(cellTextRanges, target.selectionBounds.rowStart, target.selectionBounds.colStart);
      if (rangeText) {
        if (!color) color = rangeText.color || '';
        if (!textAlign) textAlign = rangeText.textAlign || '';
        if (!textTransform) textTransform = rangeText.textTransform || '';
        if (!fontWeight) fontWeight = rangeText.fontWeight || '';
        if (!fontStyle) fontStyle = rangeText.fontStyle || '';
        if (!textDecoration) textDecoration = rangeText.textDecoration || '';
      }
    }

    const col = target.columnNames?.[0] || target.columnName;
    if (col) {
      const colFont = columnFontStyles?.[col];
      if (colFont) {
        if (!fontFamily) fontFamily = colFont.fontFamily || '';
        if (!fontSize) fontSize = colFont.fontSize || '';
      }
      const colText = columnTextStyles?.[col];
      if (colText) {
        if (!color) color = colText.color || '';
        if (!textAlign) textAlign = colText.textAlign || '';
        if (!textTransform) textTransform = colText.textTransform || '';
        if (!fontWeight) fontWeight = colText.fontWeight || '';
        if (!fontStyle) fontStyle = colText.fontStyle || '';
        if (!textDecoration) textDecoration = colText.textDecoration || '';
      }
    }

    return {
      fontFamily: fontFamily || cellFormattingDefaults.fontFamily,
      fontSize: fontSize || cellFormattingDefaults.fontSize,
      color: color || cellFormattingDefaults.color,
      textAlign: textAlign || cellFormattingDefaults.textAlign,
      textTransform: textTransform || cellFormattingDefaults.textTransform,
      fontWeight: fontWeight || cellFormattingDefaults.fontWeight || '',
      fontStyle: fontStyle || cellFormattingDefaults.fontStyle || '',
      textDecoration: textDecoration || cellFormattingDefaults.textDecoration || ''
    };
  }, [
    cellFontRanges,
    cellFontStyles,
    cellTextRanges,
    cellTextStyles,
    columnFontStyles,
    columnTextStyles,
    cellFormattingDefaults,
    resolveEffectiveTarget
  ]);

  const toggleContextDropdown = useCallback((dropdownKey, event) => {
    const nextDropdown = contextDropdown === dropdownKey ? null : dropdownKey;
    if (nextDropdown && typeof window !== 'undefined') {
      const triggerRect = event.currentTarget.getBoundingClientRect();
      const estimatedHeight = 224;
      setContextDropdownPlacement(
        triggerRect.bottom + estimatedHeight > window.innerHeight - 8 ? 'above' : 'below'
      );
    }
    setContextDropdown(nextDropdown);
  }, [contextDropdown]);

  const beginCellRangeSelection = useCallback((rowIndex, columnName, event) => {
    if (event?.button !== 0) return;
    const visiblePosition = findVisiblePositionForRow(rowIndex);
    const columnIndex = selectedColumnIndexLookup.get(String(columnName));
    if (!Number.isInteger(visiblePosition) || visiblePosition < 0 || !Number.isInteger(columnIndex) || columnIndex < 0) return;

    // Removed preventDefault to allow single-click events to fire alongside range selection
    event.stopPropagation();
    if (editingCellRef.current) {
      const { rowIndex: editRow, columnName: editCol } = editingCellRef.current;
      void commitCellEdit(editRow, editCol, editingOriginalValueRef.current);
    }

    isCellRangeSelectingRef.current = true;
    setCellRangeSelection((prev) => {
      if (event.shiftKey && prev) {
        if (prev.focusRowPos === visiblePosition && prev.focusColIdx === columnIndex) return prev;
        return {
          ...prev,
          focusRowPos: visiblePosition,
          focusColIdx: columnIndex
        };
      }
      return {
        anchorRowPos: visiblePosition,
        anchorColIdx: columnIndex,
        focusRowPos: visiblePosition,
        focusColIdx: columnIndex
      };
    });
  }, [findVisiblePositionForRow, selectedColumnIndexLookup]);
  const selectColumnHeader = useCallback((columnName, event) => {
    const columnIndex = selectedColumnIndexLookup.get(String(columnName));
    if (!Number.isInteger(columnIndex) || columnIndex < 0 || totalVisibleRows <= 0) return;
    event?.stopPropagation();
    const maxRow = Math.max(0, totalVisibleRows - 1);
    setCellRangeSelection((prev) => {
      const anchorColumn = event?.shiftKey && prev
        ? Math.max(0, Math.min(effectiveSelectedColumns.length - 1, Number(prev.anchorColIdx) || 0))
        : columnIndex;
      return {
        anchorRowPos: 0,
        anchorColIdx: anchorColumn,
        focusRowPos: maxRow,
        focusColIdx: columnIndex
      };
    });
  }, [effectiveSelectedColumns.length, selectedColumnIndexLookup, totalVisibleRows]);
  const selectRowHeader = useCallback((rowIndex, event) => {
    const visiblePosition = findVisiblePositionForRow(rowIndex);
    if (!Number.isInteger(visiblePosition) || visiblePosition < 0 || effectiveSelectedColumns.length <= 0) return;
    event?.stopPropagation();
    const maxCol = Math.max(0, effectiveSelectedColumns.length - 1);
    setCellRangeSelection((prev) => {
      const anchorRow = event?.shiftKey && prev
        ? Math.max(0, Math.min(totalVisibleRows - 1, Number(prev.anchorRowPos) || 0))
        : visiblePosition;
      return {
        anchorRowPos: anchorRow,
        anchorColIdx: 0,
        focusRowPos: visiblePosition,
        focusColIdx: maxCol
      };
    });
  }, [effectiveSelectedColumns.length, findVisiblePositionForRow, totalVisibleRows]);
  const updateCellRangeSelection = useCallback((rowIndex, columnName) => {
    if (!isCellRangeSelectingRef.current) return;
    const visiblePosition = findVisiblePositionForRow(rowIndex);
    const columnIndex = selectedColumnIndexLookup.get(String(columnName));
    if (!Number.isInteger(visiblePosition) || visiblePosition < 0 || !Number.isInteger(columnIndex) || columnIndex < 0) return;

    setCellRangeSelection((prev) => {
      if (!prev) return prev;
      if (prev.focusRowPos === visiblePosition && prev.focusColIdx === columnIndex) return prev;
      return {
        ...prev,
        focusRowPos: visiblePosition,
        focusColIdx: columnIndex
      };
    });
  }, [findVisiblePositionForRow, selectedColumnIndexLookup]);
  const endCellRangeSelection = useCallback(() => {
    isCellRangeSelectingRef.current = false;
  }, []);
  const parseClipboardMatrix = useCallback((text) => {
    const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!normalized.trim()) return [];
    const lines = normalized.split('\n');
    if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
    return lines.map((line) => line.split('\t'));
  }, []);
  const copySelectedCellRange = useCallback(async () => {
    if (!cellSelectionBounds) return false;
    const lines = [];
    for (let rowPos = cellSelectionBounds.rowStart; rowPos <= cellSelectionBounds.rowEnd; rowPos += 1) {
      const rowIndex = resolveVisibleRowIndex(rowPos);
      if (rowIndex < 0) continue;
      const row = fullData?.[rowIndex] || {};
      const values = [];
      for (let colIdx = cellSelectionBounds.colStart; colIdx <= cellSelectionBounds.colEnd; colIdx += 1) {
        const columnName = effectiveSelectedColumns[colIdx];
        values.push(String(row?.[columnName] ?? ''));
      }
      lines.push(values.join('\t'));
    }
    const payload = lines.join('\n');
    if (!payload) return false;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        return true;
      }
    } catch (_) {
      // Fallback handled below.
    }

    if (typeof document === 'undefined') return false;
    const textarea = document.createElement('textarea');
    textarea.value = payload;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (_) {
      copied = false;
    } finally {
      document.body.removeChild(textarea);
    }
    return copied;
  }, [cellSelectionBounds, effectiveSelectedColumns, fullData, resolveVisibleRowIndex]);
  const pasteIntoSelectedCellRange = useCallback(async () => {
    if (!cellSelectionBounds || typeof handleInlineCellEdit !== 'function') return false;
    let clipboardText = '';
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        clipboardText = await navigator.clipboard.readText();
      }
    } catch (_) {
      clipboardText = '';
    }
    const matrix = parseClipboardMatrix(clipboardText);
    if (!matrix.length) return false;

    const startRowPos = cellSelectionBounds.rowStart;
    const startColIdx = cellSelectionBounds.colStart;
    const isSingleValue = matrix.length === 1 && matrix[0].length === 1;
    let appliedCount = 0;
    let lastRowPos = startRowPos;
    let lastColIdx = startColIdx;
    const changes = [];

    if (isSingleValue && (cellSelectionBounds.rowEnd > cellSelectionBounds.rowStart || cellSelectionBounds.colEnd > cellSelectionBounds.colStart)) {
      const singleValue = String(matrix[0][0] ?? '');
      for (let rowPos = cellSelectionBounds.rowStart; rowPos <= cellSelectionBounds.rowEnd; rowPos += 1) {
        const rowIndex = resolveVisibleRowIndex(rowPos);
        if (rowIndex < 0) continue;
        for (let colIdx = cellSelectionBounds.colStart; colIdx <= cellSelectionBounds.colEnd; colIdx += 1) {
          const columnName = effectiveSelectedColumns[colIdx];
          if (columnName === null || columnName === undefined) continue;
          changes.push({ rowIndex, columnName, nextValue: singleValue });
          lastRowPos = rowPos;
          lastColIdx = colIdx;
        }
      }
    } else {
      for (let rowOffset = 0; rowOffset < matrix.length; rowOffset += 1) {
        const rowPos = startRowPos + rowOffset;
        if (rowPos >= totalVisibleRows) break;
        const rowIndex = resolveVisibleRowIndex(rowPos);
        if (rowIndex < 0) continue;
        const values = Array.isArray(matrix[rowOffset]) ? matrix[rowOffset] : [];
        for (let colOffset = 0; colOffset < values.length; colOffset += 1) {
          const colIdx = startColIdx + colOffset;
          if (colIdx >= effectiveSelectedColumns.length) break;
          const columnName = effectiveSelectedColumns[colIdx];
          if (columnName === null || columnName === undefined) continue;
          changes.push({ rowIndex, columnName, nextValue: String(values[colOffset] ?? '') });
          lastRowPos = rowPos;
          lastColIdx = colIdx;
        }
      }
    }

    if (changes.length > 0) {
      if (typeof handleInlineCellRangeEdit === 'function') {
        appliedCount = await handleInlineCellRangeEdit(changes);
      } else {
        for (const change of changes) {
          const applied = await handleInlineCellEdit(change.rowIndex, change.columnName, change.nextValue);
          if (applied !== false) appliedCount += 1;
        }
      }
    }

    if (appliedCount > 0) {
      setCellRangeSelection({
        anchorRowPos: startRowPos,
        anchorColIdx: startColIdx,
        focusRowPos: lastRowPos,
        focusColIdx: lastColIdx
      });
      return true;
    }
    return false;
  }, [
    cellSelectionBounds,
    effectiveSelectedColumns,
    handleInlineCellEdit,
    handleInlineCellRangeEdit,
    parseClipboardMatrix,
    resolveVisibleRowIndex,
    totalVisibleRows
  ]);
  const clearSelectedCellRange = useCallback(async () => {
    if (!cellSelectionBounds || typeof handleInlineCellEdit !== 'function') return false;
    const changes = [];
    for (let rowPos = cellSelectionBounds.rowStart; rowPos <= cellSelectionBounds.rowEnd; rowPos += 1) {
      const rowIndex = resolveVisibleRowIndex(rowPos);
      if (rowIndex < 0) continue;
      for (let colIdx = cellSelectionBounds.colStart; colIdx <= cellSelectionBounds.colEnd; colIdx += 1) {
        const columnName = effectiveSelectedColumns[colIdx];
        if (columnName === null || columnName === undefined) continue;
        changes.push({ rowIndex, columnName, nextValue: '' });
      }
    }
    if (changes.length === 0) return false;
    if (typeof handleInlineCellRangeEdit === 'function') {
      return (await handleInlineCellRangeEdit(changes)) > 0;
    }
    let clearedCount = 0;
    for (const change of changes) {
      const applied = await handleInlineCellEdit(change.rowIndex, change.columnName, change.nextValue);
      if (applied !== false) clearedCount += 1;
    }
    return clearedCount > 0;
  }, [cellSelectionBounds, effectiveSelectedColumns, handleInlineCellEdit, handleInlineCellRangeEdit, resolveVisibleRowIndex]);

  const cutSelectedCellRange = useCallback(async () => {
    const copied = await copySelectedCellRange();
    if (!copied) return false;
    return clearSelectedCellRange();
  }, [clearSelectedCellRange, copySelectedCellRange]);

  const openCellContextMenu = useCallback((rowIndex, columnName, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    const visiblePosition = findVisiblePositionForRow(rowIndex);
    const columnIndex = selectedColumnIndexLookup.get(String(columnName));
    if (!Number.isInteger(visiblePosition) || visiblePosition < 0 || !Number.isInteger(columnIndex) || columnIndex < 0) return;

    const isInsideSelection = Boolean(
      cellSelectionBounds
      && visiblePosition >= cellSelectionBounds.rowStart
      && visiblePosition <= cellSelectionBounds.rowEnd
      && columnIndex >= cellSelectionBounds.colStart
      && columnIndex <= cellSelectionBounds.colEnd
    );
    if (!isInsideSelection) {
      setCellRangeSelection({
        anchorRowPos: visiblePosition,
        anchorColIdx: columnIndex,
        focusRowPos: visiblePosition,
        focusColIdx: columnIndex
      });
    }

    const targetSelectionBounds = isInsideSelection
      ? cellSelectionBounds
      : {
        rowStart: visiblePosition,
        rowEnd: visiblePosition,
        colStart: columnIndex,
        colEnd: columnIndex
      };
    const wholeColumn = targetSelectionBounds.rowStart === 0
      && targetSelectionBounds.rowEnd === Math.max(0, totalVisibleRows - 1);
    const selectionArea = (targetSelectionBounds.rowEnd - targetSelectionBounds.rowStart + 1)
      * (targetSelectionBounds.colEnd - targetSelectionBounds.colStart + 1);
    const selectionRange = !wholeColumn && selectionArea > LARGE_SELECTION_KEY_LIMIT;
    const columnNames = [];
    for (let colIdx = targetSelectionBounds.colStart; colIdx <= targetSelectionBounds.colEnd; colIdx += 1) {
      const targetColumnName = effectiveSelectedColumns[colIdx];
      if (targetColumnName) columnNames.push(targetColumnName);
    }
    const selectionKeys = wholeColumn || selectionRange
      ? []
      : (() => {
        const keys = [];
        for (let rowPos = targetSelectionBounds.rowStart; rowPos <= targetSelectionBounds.rowEnd; rowPos += 1) {
          const targetRowIndex = resolveVisibleRowIndex(rowPos);
          if (targetRowIndex < 0) continue;
          columnNames.forEach((targetColumnName) => keys.push(`${targetRowIndex}::${targetColumnName}`));
        }
        return keys;
      })();

    cellContextTargetRef.current = {
      kind: 'cell',
      rowIndex: Number(rowIndex),
      columnName: String(columnName),
      cellNode: event?.currentTarget || null,
      selectionBounds: targetSelectionBounds,
      selectionKeys,
      selectionRange,
      wholeColumn,
      columnNames
    };
    setCellColorPalette(null);
    setCellContextView('main');
    const menuWidth = 264;
    const menuHeight = 520;
    const margin = 8;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 720;
    const left = clampValue(
      Number(event?.clientX || 0),
      margin,
      Math.max(margin, viewportWidth - menuWidth - margin)
    );
    const top = clampValue(
      Number(event?.clientY || 0),
      margin,
      Math.max(margin, viewportHeight - menuHeight - margin)
    );
    setCellContextMenu({ left, top });
  }, [cellSelectionBounds, effectiveSelectedColumns, findVisiblePositionForRow, resolveVisibleRowIndex, selectedColumnIndexLookup, totalVisibleRows]);

  const openGridHeaderContextMenu = useCallback((kind, value, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    const safeValue = String(value ?? '').trim();
    if (!safeValue) return;
    const isColumnHeader = kind === 'column';
    const key = `${isColumnHeader ? 'header' : 'row-header'}::${safeValue}`;
    cellContextTargetRef.current = {
      kind: isColumnHeader ? 'column-header' : 'row-header',
      key,
      columnName: isColumnHeader ? safeValue : '',
      selectionKeys: [key]
    };
    setCellColorPalette(null);
    setCellContextView('main');
    const menuWidth = 264;
    const menuHeight = 520;
    const margin = 8;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 720;
    const left = clampValue(
      Number(event?.clientX || 0),
      margin,
      Math.max(margin, viewportWidth - menuWidth - margin)
    );
    const top = clampValue(
      Number(event?.clientY || 0),
      margin,
      Math.max(margin, viewportHeight - menuHeight - margin)
    );
    setCellContextMenu({ left, top });
  }, []);

  const openColumnHeaderContextMenu = useCallback((columnName, event) => {
    openGridHeaderContextMenu('column', columnName, event);
  }, [openGridHeaderContextMenu]);

  const openRowHeaderContextMenu = useCallback((rowIndex, event) => {
    openGridHeaderContextMenu('row', rowIndex, event);
  }, [openGridHeaderContextMenu]);

  const runCellContextAction = useCallback(async (action) => {
    const target = cellContextTargetRef.current;
    if (action === 'color') {
      setContextDropdown(null);
      setCellContextView((current) => current === 'color' ? 'main' : 'color');
    } else {
      setCellContextMenu(null);
    }
    if (action === 'copy') {
      await copySelectedCellRange();
      return;
    }
    if (action === 'paste') {
      await pasteIntoSelectedCellRange();
      return;
    }
    if (action === 'cut') {
      await cutSelectedCellRange();
      return;
    }
    if (action === 'delete') {
      await clearSelectedCellRange();
      return;
    }
    if (action === 'select-all') {
      if (totalVisibleRows > 0 && effectiveSelectedColumns.length > 0) {
        setCellRangeSelection({
          anchorRowPos: 0,
          anchorColIdx: 0,
          focusRowPos: totalVisibleRows - 1,
          focusColIdx: effectiveSelectedColumns.length - 1
        });
      }
      return;
    }
    if ((action === 'total-column' || action === 'total-row') && target
      && typeof handleCalculateSelectionTotal === 'function') {
      const selectionBounds = target.selectionBounds || cellSelectionBounds;
      if (!selectionBounds) return;
      const rowIndices = [];
      for (let rowPos = selectionBounds.rowStart; rowPos <= selectionBounds.rowEnd; rowPos += 1) {
        const rowIndex = resolveVisibleRowIndex(rowPos);
        if (rowIndex >= 0) rowIndices.push(rowIndex);
      }
      const columnNames = [];
      for (let colIdx = selectionBounds.colStart; colIdx <= selectionBounds.colEnd; colIdx += 1) {
        const columnName = effectiveSelectedColumns[colIdx];
        if (columnName) columnNames.push(columnName);
      }
      await handleCalculateSelectionTotal({
        axis: action === 'total-column' ? 'column' : 'row',
        rowIndices,
        columnNames
      });
      return;
    }
    const colorTarget = target || resolveEffectiveTarget();
    if (action === 'color' && colorTarget) {
      const selectionKeys = [];
      const selectionBounds = colorTarget.selectionBounds || cellSelectionBounds;
      const wholeColumn = Boolean(colorTarget.wholeColumn) || Boolean(
        selectionBounds
        && selectionBounds.rowStart === 0
        && selectionBounds.rowEnd === Math.max(0, totalVisibleRows - 1)
      );
      const selectionArea = selectionBounds
        ? (selectionBounds.rowEnd - selectionBounds.rowStart + 1)
        * (selectionBounds.colEnd - selectionBounds.colStart + 1)
        : 0;
      const selectionRange = !wholeColumn
        && (Boolean(colorTarget.selectionRange) || selectionArea > LARGE_SELECTION_KEY_LIMIT);
      const columnNames = [];
      if (selectionBounds) {
        for (let colIdx = selectionBounds.colStart; colIdx <= selectionBounds.colEnd; colIdx += 1) {
          const columnName = effectiveSelectedColumns[colIdx];
          if (columnName) columnNames.push(columnName);
        }
      }
      if (selectionBounds && !wholeColumn && !selectionRange) {
        for (let rowPos = selectionBounds.rowStart; rowPos <= selectionBounds.rowEnd; rowPos += 1) {
          const rowIndex = resolveVisibleRowIndex(rowPos);
          if (rowIndex < 0) continue;
          for (let colIdx = selectionBounds.colStart; colIdx <= selectionBounds.colEnd; colIdx += 1) {
            const columnName = effectiveSelectedColumns[colIdx];
            if (columnName) selectionKeys.push(`${rowIndex}::${columnName}`);
          }
        }
      }
      const fallbackRowIndex = resolveVisibleRowIndex(selectionBounds?.rowStart ?? 0);
      const fallbackColumnName = colorTarget.columnName || columnNames[0] || effectiveSelectedColumns[0];
      const colorRowIndex = Number.isInteger(Number(colorTarget.rowIndex))
        ? Number(colorTarget.rowIndex)
        : fallbackRowIndex;
      if (colorRowIndex < 0 || !fallbackColumnName) return;
      openCellColorPicker(colorRowIndex, fallbackColumnName, colorTarget.cellNode, selectionKeys, {
        wholeColumn,
        columnNames,
        selectionRange,
        selectionBounds
      });
      setCellColorPalette(null);
    }
  }, [cellSelectionBounds, clearSelectedCellRange, copySelectedCellRange, cutSelectedCellRange, effectiveSelectedColumns, handleCalculateSelectionTotal, openCellColorPicker, pasteIntoSelectedCellRange, resolveEffectiveTarget, resolveVisibleRowIndex, setCellRangeSelection, totalVisibleRows]);

  useEffect(() => {
    if (!cellContextMenu) return undefined;
    const closeMenu = (event) => {
      if (!cellContextMenuRef.current?.contains(event.target)) {
        setCellContextMenu(null);
        setContextDropdown(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setCellContextMenu(null);
        setContextDropdown(null);
      }
    };
    window.addEventListener('pointerdown', closeMenu, true);
    window.addEventListener('contextmenu', closeMenu, true);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('pointerdown', closeMenu, true);
      window.removeEventListener('contextmenu', closeMenu, true);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [cellContextMenu]);

  useEffect(() => {
    const isEditableTarget = (target) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = String(target.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
    };
    const handleShortcutKey = (event) => {
      const target = event.target;
      const shellNode = shellRef.current;
      const targetInsideShell = Boolean(shellNode && target instanceof Node && shellNode.contains(target));
      if (!targetInsideShell && !cellSelectionBounds) return;
      if (isEditableTarget(target)) return;

      if ((event.key === 'Delete' || event.key === 'Backspace') && !editingCellRef.current) {
        if (!cellSelectionBounds) return;
        event.preventDefault();
        void clearSelectedCellRange();
        return;
      }

      const hasModifier = event.ctrlKey || event.metaKey;
      if (!hasModifier || event.altKey) return;

      const key = String(event.key || '').toLowerCase();

      if (key === 'a') {
        if (effectiveSelectedColumns.length === 0 || totalVisibleRows === 0) return;
        event.preventDefault();
        setCellRangeSelection({
          anchorRowPos: 0,
          anchorColIdx: 0,
          focusRowPos: totalVisibleRows - 1,
          focusColIdx: effectiveSelectedColumns.length - 1
        });
        return;
      }
      if (key === 'c') {
        if (!cellSelectionBounds || editingCellRef.current) return;
        event.preventDefault();
        void copySelectedCellRange();
        return;
      }
      if (key === 'v') {
        if (!cellSelectionBounds || editingCellRef.current) return;
        event.preventDefault();
        void pasteIntoSelectedCellRange();
      }
    };

    window.addEventListener('keydown', handleShortcutKey);
    return () => {
      window.removeEventListener('keydown', handleShortcutKey);
    };
  }, [
    cellSelectionBounds,
    clearSelectedCellRange,
    copySelectedCellRange,
    effectiveSelectedColumns.length,
    pasteIntoSelectedCellRange,
    totalVisibleRows
  ]);

  const numericColumns = useMemo(() => {
    if (!Array.isArray(columns) || columns.length === 0 || !Array.isArray(deferredFullData) || deferredFullData.length === 0) {
      return [];
    }
    return columns.filter((col) => {
      const sampleLimit = Math.min(deferredFullData.length, 5000);
      for (let i = 0; i < sampleLimit; i += 1) {
        const raw = deferredFullData[i]?.[col];
        if (raw === undefined || raw === null || String(raw).trim() === '') continue;
        if (!Number.isFinite(Number(raw))) return false;
      }
      return true;
    });
  }, [columns, deferredFullData]);

  const categoricalColumns = useMemo(
    () => columns.filter((col) => !numericColumns.includes(col)),
    [columns, numericColumns]
  );
  const groupCandidateColumns = useMemo(() => {
    return Array.isArray(categoricalColumns) ? categoricalColumns : [];
  }, [categoricalColumns]);
  const isFilterNumeric = useMemo(
    () => numericColumns.includes(filterColumn),
    [numericColumns, filterColumn]
  );
  const filterValueOptions = useMemo(() => {
    if (!filterColumn || isFilterNumeric || !Array.isArray(deferredFullData) || deferredFullData.length === 0) return [];
    const limit = Math.min(deferredFullData.length, 5000);
    const seen = new Set();
    for (let i = 0; i < limit; i += 1) {
      const raw = deferredFullData[i]?.[filterColumn];
      if (raw === undefined || raw === null) continue;
      const value = String(raw).trim();
      if (!value) continue;
      seen.add(value);
      if (seen.size >= 30) break;
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [filterColumn, isFilterNumeric, deferredFullData]);
  const selectedFilterValues = useMemo(
    () => String(filterValue ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    [filterValue]
  );
  const toggleFilterValue = useCallback((value) => {
    const next = new Set(selectedFilterValues);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    const list = Array.from(next);
    setFilterValue(list.join(', '));
    if (list.length <= 1) {
      setFilterOperator('equals');
    } else {
      setFilterOperator('in_list');
    }
  }, [selectedFilterValues, setFilterValue, setFilterOperator]);
  const filterOperatorOptions = useMemo(() => {
    if (isFilterNumeric) {
      return [
        { value: 'equals', label: '=' },
        { value: 'not_equals', label: '≠' },
        { value: 'greater_than', label: '>' },
        { value: 'greater_equal', label: '≥' },
        { value: 'less_than', label: '<' },
        { value: 'less_equal', label: '≤' },
        { value: 'between', label: 'Between' },
        { value: 'missing', label: 'Is Missing' },
        { value: 'not_missing', label: 'Not Missing' }
      ];
    }
    return [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
      { value: 'contains', label: 'Contains' },
      { value: 'starts_with', label: 'Starts With' },
      { value: 'ends_with', label: 'Ends With' },
      { value: 'in_list', label: 'In List (comma)' },
      { value: 'missing', label: 'Is Missing' },
      { value: 'not_missing', label: 'Not Missing' }
    ];
  }, [isFilterNumeric]);
  const filterNeedsValue = !['missing', 'not_missing'].includes(filterOperator);
  const filterNeedsSecondValue = filterOperator === 'between';

  useEffect(() => {
    const allowed = filterOperatorOptions.map((option) => option.value);
    if (!allowed.includes(filterOperator)) {
      setFilterOperator(allowed[0] || 'equals');
    }
  }, [filterOperator, filterOperatorOptions, setFilterOperator]);
  const separateResolvedOutputCount = useMemo(() => {
    const parsed = Number.parseInt(String(separateOutputCount ?? 2), 10);
    if (!Number.isFinite(parsed)) return 2;
    return Math.min(12, Math.max(2, parsed));
  }, [separateOutputCount]);
  const separateOutputNameFields = useMemo(() => {
    const names = Array.isArray(separateOutputNames) ? separateOutputNames : [];
    return Array.from({ length: separateResolvedOutputCount }, (_, index) => {
      if (index < names.length) return String(names[index] ?? '');
      if (index === 0) return 'first';
      if (index === 1) return 'last';
      return `part_${index + 1}`;
    });
  }, [separateOutputNames, separateResolvedOutputCount]);
  const syncSeparateOutputs = useCallback((nextCount, nextNames = null) => {
    const parsed = Number.parseInt(String(nextCount ?? 2), 10);
    const resolvedCount = Number.isFinite(parsed) ? Math.min(12, Math.max(2, parsed)) : 2;
    const sourceNames = Array.isArray(nextNames)
      ? nextNames
      : (Array.isArray(separateOutputNames) ? separateOutputNames : []);
    const resolvedNames = Array.from({ length: resolvedCount }, (_, index) => {
      if (index < sourceNames.length) return String(sourceNames[index] ?? '');
      if (index === 0) return 'first';
      if (index === 1) return 'last';
      return `part_${index + 1}`;
    });
    setSeparateOutputCount?.(resolvedCount);
    setSeparateOutputNames?.(resolvedNames);
  }, [separateOutputNames, setSeparateOutputCount, setSeparateOutputNames]);
  const handleSeparateOutputNameChange = useCallback((index, nextValue) => {
    const nextNames = [...separateOutputNameFields];
    nextNames[index] = nextValue;
    syncSeparateOutputs(separateResolvedOutputCount, nextNames);
  }, [separateOutputNameFields, separateResolvedOutputCount, syncSeparateOutputs]);
  const separateSourceStats = useMemo(() => {
    const source = String(separateSourceColumn || '').trim();
    const rows = Array.isArray(deferredFullData) ? deferredFullData : [];
    if (!source || rows.length === 0) {
      return {
        nonEmptyCount: 0,
        uniqueCount: 0,
        totalRows: rows.length
      };
    }
    const uniqueValues = new Set();
    let nonEmptyCount = 0;
    rows.forEach((row) => {
      const rawValue = row?.[source];
      if (rawValue === undefined || rawValue === null) return;
      const trimmedValue = String(rawValue).trim();
      if (!trimmedValue) return;
      nonEmptyCount += 1;
      uniqueValues.add(trimmedValue);
    });
    return {
      nonEmptyCount,
      uniqueCount: uniqueValues.size,
      totalRows: rows.length
    };
  }, [deferredFullData, separateSourceColumn]);
  const resolvedGroupByColumns = useMemo(() => {
    const listFromProps = Array.isArray(groupByColumns)
      ? groupByColumns.map((columnName) => String(columnName || '').trim()).filter(Boolean)
      : [];
    if (listFromProps.length > 0) return Array.from(new Set(listFromProps));
    const fallback = String(groupByColumn || '').trim();
    return fallback ? [fallback] : [];
  }, [groupByColumn, groupByColumns]);
  const resolvedGroupByOutputMode = String(groupByOutputMode || '').trim() === 'new_column'
    ? 'new_column'
    : 'summary_rows';
  const groupByNeedsSummaryColumn = groupBySummaryFn !== 'count';
  const groupByPipelinePreview = useMemo(() => {
    const groupColumns = resolvedGroupByColumns.length > 0 ? resolvedGroupByColumns : ['group'];
    const summaryColumn = String(groupBySummaryColumn || '').trim() || 'value';
    const summaryFn = String(groupBySummaryFn || 'count').trim();
    const resultLabel = String(groupByResultName || '').trim()
      || (summaryFn === 'count' ? 'n' : `${summaryFn}_${summaryColumn}`);
    const safeResultLabel = resultLabel.replace(/\s+/g, '_');
    const groupRefs = groupColumns.map((columnName) => `\`${columnName.replace(/`/g, '')}\``).join(', ');
    const summaryRef = `\`${summaryColumn.replace(/`/g, '')}\``;
    const resultRef = `\`${safeResultLabel.replace(/`/g, '')}\``;

    let summaryExpr = 'n()';
    if (summaryFn === 'n_distinct') summaryExpr = `n_distinct(${summaryRef})`;
    if (summaryFn === 'mean') summaryExpr = `mean(suppressWarnings(as.numeric(${summaryRef})), na.rm = TRUE)`;
    if (summaryFn === 'sum') summaryExpr = `sum(suppressWarnings(as.numeric(${summaryRef})), na.rm = TRUE)`;
    if (summaryFn === 'median') summaryExpr = `stats::median(suppressWarnings(as.numeric(${summaryRef})), na.rm = TRUE)`;
    if (summaryFn === 'min') summaryExpr = `min(suppressWarnings(as.numeric(${summaryRef})), na.rm = TRUE)`;
    if (summaryFn === 'max') summaryExpr = `max(suppressWarnings(as.numeric(${summaryRef})), na.rm = TRUE)`;
    const orderExpr = String(groupBySortDirection || 'desc') === 'asc'
      ? resultRef
      : `desc(${resultRef})`;
    if (resolvedGroupByOutputMode === 'new_column') {
      return `df %>% group_by(${groupRefs}) %>% mutate(${resultRef} = ${summaryExpr}) %>% ungroup()`;
    }
    return `df %>% group_by(${groupRefs}) %>% summarise(${resultRef} = ${summaryExpr}, .groups = "drop") %>% arrange(${orderExpr})`;
  }, [groupByResultName, groupBySortDirection, groupBySummaryColumn, groupBySummaryFn, resolvedGroupByColumns, resolvedGroupByOutputMode]);
  const setGroupByColumnsFromSelection = useCallback(() => {
    const fromGroupSelection = Array.from(new Set([
      String(groupVar || '').trim(),
      ...selectedAdditionalGroupColumns.map((columnName) => String(columnName || '').trim())
    ])).filter((columnName) => columnName && groupCandidateColumns.includes(columnName));
    if (fromGroupSelection.length === 0) return;
    setGroupByColumns?.(fromGroupSelection);
    setGroupByColumn?.(fromGroupSelection[0]);
  }, [groupCandidateColumns, groupVar, selectedAdditionalGroupColumns, setGroupByColumn, setGroupByColumns]);
  useEffect(() => {
    if (!selectGroupByEnabled) return;
    setGroupByColumnsFromSelection();
  }, [selectGroupByEnabled, setGroupByColumnsFromSelection]);

  const activeQualityColumns = useMemo(() => {
    const allColumns = Array.isArray(columns) ? columns : [];
    if (allColumns.length === 0) return [];
    const selected = Array.isArray(selectedColumns)
      ? selectedColumns.map((columnName) => String(columnName || '').trim()).filter(Boolean)
      : [];
    const selectedValid = selected.filter((columnName) => allColumns.includes(columnName));
    return selectedValid.length > 0 ? selectedValid : allColumns;
  }, [columns, selectedColumns]);
  const rowQualitySummary = useMemo(() => {
    const emptySummary = {
      completePct: 0,
      incompletePct: 0,
      completeRowsPct: 0,
      incompleteRowsPct: 0,
      incompleteRowCount: 0,
      incompleteColumnCount: 0,
      missingValueCount: 0,
      topMissingCells: [],
      topIncompleteColumns: [],
      sampleRows: 0,
      totalRows: 0,
      sampled: false
    };
    if (!Array.isArray(fullData) || fullData.length === 0 || activeQualityColumns.length === 0) {
      return emptySummary;
    }

    const qualityRowCount = hasFilteredSubset ? totalVisibleRows : selectedRowCountLive;
    if (qualityRowCount === 0) {
      return {
        ...emptySummary,
        sampleRows: 0,
        totalRows: 0
      };
    }

    const sampleRows = qualityRowCount;
    const totalCells = sampleRows * activeQualityColumns.length;
    const missingByColumn = new Map(activeQualityColumns.map((col) => [col, { missingCount: 0, firstRowIndex: null }]));
    const topMissingCells = [];
    let missingValueCount = 0;
    let incompleteRowCount = 0;
    let filledCells = 0;

    let processedRows = 0;
    const iterateLimit = hasFilteredSubset ? effectiveFilteredRowIndices.length : fullData.length;
    for (let visibleIndex = 0; visibleIndex < iterateLimit; visibleIndex += 1) {
      const rowIndex = hasFilteredSubset ? Number(effectiveFilteredRowIndices?.[visibleIndex] ?? -1) : visibleIndex;
      if (rowIndex < 0 || !isRowChecked(rowIndex)) continue;
      const row = fullData[rowIndex] || {};
      let rowMissingCount = 0;

      activeQualityColumns.forEach((col, colIndex) => {
        const value = row?.[col];
        const isMissing = value === undefined || value === null || String(value).trim() === '';
        if (isMissing) {
          rowMissingCount += 1;
          missingValueCount += 1;
          if (topMissingCells.length < 30) {
            topMissingCells.push({
              rowIndex,
              columnName: col,
              columnIndex: colIndex
            });
          }
          const columnSummary = missingByColumn.get(col);
          if (columnSummary) {
            columnSummary.missingCount += 1;
            if (columnSummary.firstRowIndex === null) columnSummary.firstRowIndex = rowIndex;
          }
        } else {
          filledCells += 1;
        }
      });

      if (rowMissingCount > 0) {
        incompleteRowCount += 1;
      }
      processedRows += 1;
      if (processedRows >= sampleRows) break;
    }

    const incompleteCells = Math.max(0, totalCells - filledCells);
    const completePct = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 100;
    const incompletePct = totalCells > 0 ? Math.round((incompleteCells / totalCells) * 100) : 0;
    const incompleteColumns = Array.from(missingByColumn.entries())
      .filter(([, summary]) => summary.missingCount > 0);
    const topIncompleteColumns = incompleteColumns
      .sort((a, b) => b[1].missingCount - a[1].missingCount)
      .slice(0, 5)
      .map(([columnName, summary]) => ({
        columnName,
        missingCount: summary.missingCount,
        incompletePct: Math.round((summary.missingCount / sampleRows) * 100),
        firstMissingRowIndex: summary.firstRowIndex
      }));

    return {
      completePct,
      incompletePct,
      completeRowsPct: Math.round(((sampleRows - incompleteRowCount) / sampleRows) * 100),
      incompleteRowsPct: Math.round((incompleteRowCount / sampleRows) * 100),
      incompleteRowCount,
      incompleteColumnCount: incompleteColumns.length,
      missingValueCount,
      allIncompleteColumns: incompleteColumns.map(([columnName, summary]) => ({
        columnName,
        missingCount: summary.missingCount,
        incompletePct: Math.round((summary.missingCount / sampleRows) * 100),
        firstMissingRowIndex: summary.firstRowIndex
      })),
      topMissingCells,
      topIncompleteColumns,
      sampleRows,
      totalRows: qualityRowCount,
      sampled: qualityRowCount > sampleRows
    };
  }, [activeQualityColumns, fullData, effectiveFilteredRowIndices, hasFilteredSubset, isRowChecked, selectedRowCountLive, totalVisibleRows]);
  const completeness = rowQualitySummary.completePct;
  const openStudioPanelsCount = useMemo(
    () => Object.values(studioPanels).filter(Boolean).length,
    [studioPanels]
  );
  const studioPanelsTotal = useMemo(() => Object.keys(studioPanels).length, [studioPanels]);
  const [cleanMissingMode, setCleanMissingMode] = useState('remove_rows');
  const [cleanMissingGroupColumn, setCleanMissingGroupColumn] = useState('');
  const cleanMissingTargetColumns = useMemo(
    () => (Array.isArray(activeQualityColumns) ? activeQualityColumns : []),
    [activeQualityColumns]
  );
  const cleanMissingGroupOptions = useMemo(
    () => [
      { label: 'Auto-detect label column', value: '' },
      ...(Array.isArray(categoricalColumns) ? categoricalColumns : []).map((columnName) => ({
        label: String(columnName),
        value: String(columnName)
      }))
    ],
    [categoricalColumns]
  );
  useEffect(() => {
    if (!cleanMissingGroupColumn || categoricalColumns.includes(cleanMissingGroupColumn)) return;
    setCleanMissingGroupColumn('');
  }, [categoricalColumns, cleanMissingGroupColumn]);
  const cleanCandidateRowIndices = useMemo(() => {
    if (!Array.isArray(fullData) || fullData.length === 0) return [];
    const candidate = [];
    const iterateLimit = hasFilteredSubset ? effectiveFilteredRowIndices.length : fullData.length;
    for (let visibleIndex = 0; visibleIndex < iterateLimit; visibleIndex += 1) {
      const rowIndex = hasFilteredSubset ? Number(effectiveFilteredRowIndices?.[visibleIndex] ?? -1) : visibleIndex;
      if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= fullData.length) continue;
      if (!isRowChecked(rowIndex)) continue;
      candidate.push(rowIndex);
    }
    return candidate;
  }, [effectiveFilteredRowIndices, fullData, hasFilteredSubset, isRowChecked]);
  const cleanMissingActionLabel = CLEAN_MISSING_MODE_ACTION_LABELS[cleanMissingMode]
    || CLEAN_MISSING_MODE_ACTION_LABELS.remove_rows;
  const cleanMissingRowInsights = useMemo(() => {
    const emptySummary = {
      scopedRowCount: 0,
      rowsWithMissingCount: 0,
      rowsWithMissingIndices: [],
      missingCellCount: 0,
      previewRows: [],
      hasMoreRows: false
    };
    if (!floatingTools.clean?.open) return emptySummary;
    if (
      !Array.isArray(fullData)
      || fullData.length === 0
      || cleanMissingTargetColumns.length === 0
      || cleanCandidateRowIndices.length === 0
    ) {
      return emptySummary;
    }

    let rowsWithMissingCount = 0;
    const rowsWithMissingIndices = [];
    let missingCellCount = 0;
    const previewRows = [];

    for (let idx = 0; idx < cleanCandidateRowIndices.length; idx += 1) {
      const rowIndex = cleanCandidateRowIndices[idx];
      const row = fullData[rowIndex] || {};
      let rowMissingCount = 0;
      for (let columnIndex = 0; columnIndex < cleanMissingTargetColumns.length; columnIndex += 1) {
        const columnName = cleanMissingTargetColumns[columnIndex];
        const value = row?.[columnName];
        if (value === undefined || value === null || String(value).trim() === '') {
          rowMissingCount += 1;
          missingCellCount += 1;
        }
      }
      if (rowMissingCount > 0) {
        rowsWithMissingCount += 1;
        rowsWithMissingIndices.push(rowIndex);
        if (previewRows.length < CLEAN_MISSING_ROW_PREVIEW_LIMIT) {
          previewRows.push({
            rowIndex,
            missingCount: rowMissingCount
          });
        }
      }
    }

    return {
      scopedRowCount: cleanCandidateRowIndices.length,
      rowsWithMissingCount,
      rowsWithMissingIndices,
      missingCellCount,
      previewRows,
      hasMoreRows: rowsWithMissingCount > previewRows.length
    };
  }, [cleanCandidateRowIndices, cleanMissingTargetColumns, floatingTools.clean?.open, fullData]);
  const cleanMissingSelectableRows = useMemo(
    () => (Array.isArray(cleanMissingRowInsights.rowsWithMissingIndices) ? cleanMissingRowInsights.rowsWithMissingIndices : []),
    [cleanMissingRowInsights.rowsWithMissingIndices]
  );
  const [cleanSelectedRows, setCleanSelectedRows] = useState([]);
  const cleanSelectedRowSet = useMemo(
    () => new Set(Array.isArray(cleanSelectedRows) ? cleanSelectedRows : []),
    [cleanSelectedRows]
  );
  useEffect(() => {
    if (!Array.isArray(cleanMissingSelectableRows) || cleanMissingSelectableRows.length === 0) {
      setCleanSelectedRows([]);
      return;
    }
    setCleanSelectedRows((prev) => {
      const previous = Array.isArray(prev)
        ? prev.filter((rowIndex) => cleanMissingSelectableRows.includes(rowIndex))
        : [];
      if (previous.length > 0) return previous;
      return [...cleanMissingSelectableRows];
    });
  }, [cleanMissingSelectableRows]);
  const toggleCleanRowSelection = useCallback((rowIndex) => {
    const safeRowIndex = Number(rowIndex);
    if (!Number.isInteger(safeRowIndex) || safeRowIndex < 0) return;
    setCleanSelectedRows((prev) => {
      const current = new Set(Array.isArray(prev) ? prev : []);
      if (current.has(safeRowIndex)) {
        current.delete(safeRowIndex);
      } else {
        current.add(safeRowIndex);
      }
      return cleanMissingSelectableRows.filter((candidate) => current.has(candidate));
    });
  }, [cleanMissingSelectableRows]);
  const selectAllCleanRows = useCallback(() => {
    setCleanSelectedRows([...cleanMissingSelectableRows]);
  }, [cleanMissingSelectableRows]);
  const clearCleanRowsSelection = useCallback(() => {
    setCleanSelectedRows([]);
  }, []);
  const groupLevelsInEditor = useMemo(() => {
    if (!groupVar) return [];
    if (!Array.isArray(fullData) || fullData.length === 0) {
      return Array.isArray(inferentialAllGroupLevels)
        ? inferentialAllGroupLevels.map((level) => String(level))
        : [];
    }
    const values = fullData
      .map((row) => row?.[groupVar])
      .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
      .map((value) => String(value));
    return Array.from(new Set(values));
  }, [inferentialAllGroupLevels, groupVar, fullData]);
  const selectedGroupLevelSet = useMemo(() => {
    if (inferentialSelectedGroupSet instanceof Set) return inferentialSelectedGroupSet;
    if (Array.isArray(inferentialSelectedGroupSet)) return new Set(inferentialSelectedGroupSet.map((level) => String(level)));
    return new Set();
  }, [inferentialSelectedGroupSet]);
  const renameTargetLevels = useMemo(() => {
    const rawLimit = Number.parseInt(String(groupLevelRenameLimit ?? 1), 10);
    const safeLimit = Number.isFinite(rawLimit) ? Math.max(1, rawLimit) : 1;
    const selectedSet = selectedGroupLevelSet instanceof Set
      ? selectedGroupLevelSet
      : new Set(Array.isArray(selectedGroupLevelSet) ? selectedGroupLevelSet.map((level) => String(level)) : []);
    return groupLevelsInEditor
      .map((level) => String(level))
      .filter((level) => selectedSet.has(level))
      .slice(0, safeLimit);
  }, [groupLevelRenameLimit, groupLevelsInEditor, selectedGroupLevelSet]);
  useEffect(() => {
    setGroupLevelRenameValue('');
    setGroupLevelRenameLimit(1);
    setIsRenamingGroupLevels(false);
  }, [groupVar]);
  useEffect(() => {
    const normalizedGroupVar = String(groupVar || '').trim();
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const sheetNameKey = String(activeSheetName || '__default__').trim() || '__default__';
    const sheetKey = `${datasetKey}::${sheetNameKey}`;
    const savedSelection = DATA_EXPLORER_SHEET_GROUP_SELECTION[sheetKey];
    const canUseSavedSelection = Boolean(
      normalizedGroupVar
      && savedSelection
      && String(savedSelection.groupVar || '') === normalizedGroupVar
    );
    const savedColumns = canUseSavedSelection && Array.isArray(savedSelection.selectedGroupColumns)
      ? savedSelection.selectedGroupColumns
        .map((columnName) => String(columnName))
        .filter((columnName) => columns.includes(columnName))
      : [];
    const savedLevels = canUseSavedSelection && savedSelection.groupColumnSelectedLevels
      ? savedSelection.groupColumnSelectedLevels
      : {};

    setSelectedGroupColumns((prev) => {
      const previous = Array.isArray(prev) ? prev : [];
      const validPrevious = previous.filter((col) => columns.includes(col));
      if (!normalizedGroupVar) {
        return previous.length === 0 ? previous : [];
      }
      if (savedColumns.length > 0) {
        const normalizedSavedColumns = [normalizedGroupVar, ...savedColumns.filter((columnName) => columnName !== normalizedGroupVar)];
        if (
          normalizedSavedColumns.length === validPrevious.length
          && normalizedSavedColumns.every((columnName, index) => columnName === validPrevious[index])
        ) {
          return validPrevious;
        }
        return normalizedSavedColumns;
      }
      if (validPrevious[0] === normalizedGroupVar) return validPrevious;
      return [normalizedGroupVar];
    });

    setGroupColumnSelectedLevels((prev) => {
      if (!normalizedGroupVar) {
        return Object.keys(prev || {}).length === 0 ? prev : {};
      }
      if (!canUseSavedSelection) {
        return Object.keys(prev || {}).length === 0 ? prev : {};
      }
      const next = {};
      Object.entries(savedLevels || {}).forEach(([columnName, levels]) => {
        const normalizedColumnName = String(columnName || '').trim();
        if (!normalizedColumnName || !columns.includes(normalizedColumnName)) return;
        const safeLevels = Array.isArray(levels)
          ? levels
            .map((level) => String(level))
            .filter((level) => level !== '')
          : [];
        next[normalizedColumnName] = Array.from(new Set(safeLevels));
      });
      const prevKeys = Object.keys(prev || {});
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) return next;
      for (let index = 0; index < nextKeys.length; index += 1) {
        const key = nextKeys[index];
        const prevValues = Array.isArray(prev?.[key]) ? prev[key] : [];
        const nextValues = Array.isArray(next[key]) ? next[key] : [];
        if (prevValues.length !== nextValues.length) return next;
        for (let valueIndex = 0; valueIndex < nextValues.length; valueIndex += 1) {
          if (String(prevValues[valueIndex]) !== String(nextValues[valueIndex])) return next;
        }
      }
      return prev;
    });
    setGroupColumnToAdd('');
  }, [activeSheetName, columns, groupVar, sourceFileName]);
  useEffect(() => {
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const sheetNameKey = String(activeSheetName || '__default__').trim() || '__default__';
    const sheetKey = `${datasetKey}::${sheetNameKey}`;
    const normalizedGroupVar = String(groupVar || '').trim();
    const validSelectedColumns = Array.isArray(selectedGroupColumns)
      ? selectedGroupColumns
        .map((columnName) => String(columnName || '').trim())
        .filter((columnName) => columnName && columns.includes(columnName))
      : [];
    const normalizedSelectedColumns = normalizedGroupVar
      ? [normalizedGroupVar, ...validSelectedColumns.filter((columnName) => columnName !== normalizedGroupVar)]
      : validSelectedColumns;
    const safeLevelSelection = {};
    Object.entries(groupColumnSelectedLevels || {}).forEach(([columnName, levels]) => {
      const normalizedColumnName = String(columnName || '').trim();
      if (!normalizedColumnName || !columns.includes(normalizedColumnName)) return;
      const safeLevels = Array.isArray(levels)
        ? levels
          .map((level) => String(level))
          .filter((level) => level !== '')
        : [];
      safeLevelSelection[normalizedColumnName] = Array.from(new Set(safeLevels));
    });
    DATA_EXPLORER_SHEET_GROUP_SELECTION[sheetKey] = {
      groupVar: normalizedGroupVar,
      selectedGroupColumns: normalizedSelectedColumns,
      groupColumnSelectedLevels: safeLevelSelection
    };
  }, [activeSheetName, columns, groupVar, groupColumnSelectedLevels, selectedGroupColumns, sourceFileName]);
  const availableGroupColumnsToAdd = useMemo(
    () => columns.filter((columnName) => !selectedGroupColumns.includes(columnName)),
    [columns, selectedGroupColumns]
  );
  useEffect(() => {
    const normalizedColumn = String(groupColumnToAdd || '').trim();
    if (!normalizedColumn) return;
    if (!availableGroupColumnsToAdd.includes(normalizedColumn)) {
      setGroupColumnToAdd('');
    }
  }, [groupColumnToAdd, availableGroupColumnsToAdd]);
  const addGroupColumnSelection = useCallback(() => {
    const normalizedColumn = String(groupColumnToAdd || '').trim();
    if (!normalizedColumn) return;
    setSelectedGroupColumns((prev) => {
      const previous = Array.isArray(prev) ? prev : [];
      if (previous.includes(normalizedColumn)) return previous;
      return [...previous, normalizedColumn];
    });
    setGroupColumnToAdd('');
  }, [groupColumnToAdd]);
  const removeGroupColumnSelection = useCallback((columnName) => {
    const normalizedColumn = String(columnName || '').trim();
    if (!normalizedColumn) return;
    setGroupColumnSelectedLevels((prev) => {
      if (!prev || !Object.prototype.hasOwnProperty.call(prev, normalizedColumn)) return prev;
      const next = { ...prev };
      delete next[normalizedColumn];
      return next;
    });
    setSelectedGroupColumns((prev) => {
      const previous = Array.isArray(prev) ? prev : [];
      if (!previous.includes(normalizedColumn)) return previous;
      const next = previous.filter((col) => col !== normalizedColumn);
      if (normalizedColumn === groupVar && typeof setGroupVar === 'function') {
        setGroupVar(next[0] || '');
      }
      return next;
    });
  }, [groupVar, setGroupVar]);
  const toggleAddedColumnLevel = useCallback((columnName, level) => {
    const normalizedColumn = String(columnName || '').trim();
    const normalizedLevel = String(level || '').trim();
    if (!normalizedColumn || !normalizedLevel) return;
    setGroupColumnSelectedLevels((prev) => {
      const availableLevels = Array.isArray(groupColumnLevelsMap[normalizedColumn]) ? groupColumnLevelsMap[normalizedColumn] : [];
      const current = Array.isArray(prev?.[normalizedColumn])
        ? prev[normalizedColumn].map((value) => String(value))
        : availableLevels;
      const nextLevels = current.includes(normalizedLevel)
        ? current.filter((value) => value !== normalizedLevel)
        : [...current, normalizedLevel];
      return {
        ...(prev || {}),
        [normalizedColumn]: nextLevels
      };
    });
  }, [groupColumnLevelsMap]);
  const setAllAddedColumnLevels = useCallback((columnName) => {
    const normalizedColumn = String(columnName || '').trim();
    if (!normalizedColumn) return;
    const availableLevels = Array.isArray(groupColumnLevelsMap[normalizedColumn]) ? groupColumnLevelsMap[normalizedColumn] : [];
    setGroupColumnSelectedLevels((prev) => ({
      ...(prev || {}),
      [normalizedColumn]: [...availableLevels]
    }));
  }, [groupColumnLevelsMap]);
  const clearAddedColumnLevels = useCallback((columnName) => {
    const normalizedColumn = String(columnName || '').trim();
    if (!normalizedColumn) return;
    setGroupColumnSelectedLevels((prev) => ({
      ...(prev || {}),
      [normalizedColumn]: []
    }));
  }, []);
  const applyGroupLevelRename = useCallback(async () => {
    if (typeof handleRenameGroupLevels !== 'function') return;
    const normalizedGroupVar = String(groupVar || '').trim();
    const replacementLevel = String(groupLevelRenameValue || '').trim();
    const targets = Array.from(new Set(
      (Array.isArray(renameTargetLevels) ? renameTargetLevels : [])
        .map((level) => String(level))
        .filter((level) => level.trim() !== '')
    ));
    if (!normalizedGroupVar || !replacementLevel || targets.length === 0) return;
    setIsRenamingGroupLevels(true);
    try {
      const result = await handleRenameGroupLevels({
        columnName: normalizedGroupVar,
        targetLevels: targets,
        replacementLevel
      });
      if (result?.ok) {
        setGroupLevelRenameValue('');
      }
    } finally {
      setIsRenamingGroupLevels(false);
    }
  }, [groupLevelRenameValue, groupVar, handleRenameGroupLevels, renameTargetLevels]);
  useEffect(() => {
    if (typeof onEditorSelectionContextChange !== 'function') return;
    if (!isGroupColumnFocusActive) {
      if (!emittedSelectionContextRef.current) return;
      emittedSelectionContextRef.current = false;
      onEditorSelectionContextChange(null);
      return;
    }
    const safeColumns = Array.isArray(effectiveSelectedColumns)
      ? effectiveSelectedColumns
        .map((columnName) => String(columnName || '').trim())
        .filter((columnName) => columnName && columns.includes(columnName))
      : [];
    const safeRows = Array.isArray(selectionModeRowIndices)
      ? selectionModeRowIndices
        .map((rowIndex) => Number(rowIndex))
        .filter((rowIndex) => Number.isInteger(rowIndex) && rowIndex >= 0)
      : [];
    emittedSelectionContextRef.current = true;
    onEditorSelectionContextChange({
      selectedColumns: safeColumns,
      selectedRowIndices: safeRows
    });
  }, [
    columns,
    effectiveSelectedColumns,
    isGroupColumnFocusActive,
    onEditorSelectionContextChange,
    selectionModeRowIndices
  ]);

  const toggleStudioPanel = (panelKey) => {
    setStudioPanels((prev) => {
      const shouldOpen = !prev?.[panelKey];
      const next = Object.keys(prev || {}).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {});
      if (shouldOpen) next[panelKey] = true;
      return next;
    });
  };
  const handleStudioGroupVariableChange = useCallback((nextValue) => {
    const normalized = String(nextValue || '').trim();
    if (!normalized) {
      setGroupByColumn?.('');
      setGroupByColumns?.([]);
      return;
    }
    setGroupByColumn?.(normalized);
    setGroupByColumns?.([normalized]);
  }, [setGroupByColumn, setGroupByColumns]);

  const handleSelectAllRows = useCallback(() => {
    setSelectionStepperMode('');
    if (typeof selectAllRows === 'function') selectAllRows();
  }, [selectAllRows]);

  const handleDeselectAllRows = useCallback(() => {
    setSelectionStepperMode('');
    if (typeof deselectAllRows === 'function') deselectAllRows();
  }, [deselectAllRows]);

  const handleSelectFirstNRows = useCallback(() => {
    setSelectionStepperMode('head');
    if (typeof selectFirstNRows === 'function') selectFirstNRows();
  }, [selectFirstNRows]);

  const handleSelectLastNRows = useCallback(() => {
    setSelectionStepperMode('tail');
    if (typeof selectLastNRows === 'function') selectLastNRows();
  }, [selectLastNRows]);

  useEffect(() => {
    if (selectedRowsMode === 'all' || visibleSelectedCount === 0) {
      setSelectionStepperMode('');
    }
  }, [selectedRowsMode, visibleSelectedCount]);

  const queueCellActivation = useCallback((rowIndex, columnName, options = {}) => {
    const safeRowIndex = Number(rowIndex);
    if (!Number.isInteger(safeRowIndex) || safeRowIndex < 0 || !columnName) return;
    const highlightDuration = Number.isFinite(Number(options.highlightDuration))
      ? Number(options.highlightDuration)
      : 900;
    if (!effectiveSelectedColumns.includes(columnName)) {
      if (isGroupColumnFocusActive) {
        setSelectedGroupColumns((prev) => {
          const previous = Array.isArray(prev) ? prev : [];
          if (previous.includes(columnName)) return previous;
          return [...previous, columnName];
        });
      } else if (!selectedColumns.includes(columnName)) {
        toggleColumn?.(columnName);
      }
    }
    if (!forcedTab && effectiveTab !== 'view') {
      setActiveTab('view');
    }
    const nextTarget = {
      rowIndex: safeRowIndex,
      columnName: String(columnName),
      key: `${safeRowIndex}-${columnName}-${Date.now()}`
    };
    setJumpToCellTarget(nextTarget);
    if (jumpToCellTimerRef.current) clearTimeout(jumpToCellTimerRef.current);
    if (highlightDuration > 0) {
      jumpToCellTimerRef.current = setTimeout(() => {
        setJumpToCellTarget((prev) => (prev?.key === nextTarget.key ? null : prev));
      }, highlightDuration);
    } else {
      jumpToCellTimerRef.current = null;
    }
  }, [effectiveSelectedColumns, effectiveTab, forcedTab, isGroupColumnFocusActive, selectedColumns, toggleColumn]);

  const jumpToMissingCell = useCallback((rowIndex, columnName) => {
    queueCellActivation(rowIndex, columnName, { highlightDuration: 2800 });
  }, [queueCellActivation]);

  const getAdjacentCellTarget = useCallback((rowIndex, columnName, direction) => {
    const safeRowIndex = Number(rowIndex);
    if (!Number.isInteger(safeRowIndex) || safeRowIndex < 0 || !columnName) return null;
    const currentColumnIndex = effectiveSelectedColumns.indexOf(columnName);
    if (currentColumnIndex < 0) return null;

    if (direction === 'left') {
      if (currentColumnIndex <= 0) return null;
      return { rowIndex: safeRowIndex, columnName: effectiveSelectedColumns[currentColumnIndex - 1] };
    }
    if (direction === 'right') {
      if (currentColumnIndex >= effectiveSelectedColumns.length - 1) return null;
      return { rowIndex: safeRowIndex, columnName: effectiveSelectedColumns[currentColumnIndex + 1] };
    }
    if (direction === 'up' || direction === 'down') {
      const visiblePosition = findVisiblePositionForRow(safeRowIndex);
      if (!Number.isInteger(visiblePosition) || visiblePosition < 0) return null;
      const nextVisiblePosition = direction === 'up' ? visiblePosition - 1 : visiblePosition + 1;
      const nextRowIndex = resolveVisibleRowIndex(nextVisiblePosition);
      if (!Number.isInteger(nextRowIndex) || nextRowIndex < 0) return null;
      return { rowIndex: nextRowIndex, columnName };
    }

    return null;
  }, [effectiveSelectedColumns, findVisiblePositionForRow, resolveVisibleRowIndex]);

  const getNextFloatingToolZ = useCallback(
    (tools) => Object.values(tools).reduce((max, tool) => Math.max(max, tool?.z || 0), 60) + 1,
    []
  );

  const clampFloatingToolPosition = useCallback((toolKey, x, y, widthOverride, heightOverride) => {
    const shellNode = shellRef.current;
    if (!shellNode) return { x, y };

    const shellRect = shellNode.getBoundingClientRect();
    const preset = FLOATING_TOOL_PRESETS[toolKey] || DEFAULT_FLOATING_TOOL_PRESET;
    const panelNode = floatingToolRefs.current?.[toolKey];
    const panelWidth = widthOverride || panelNode?.offsetWidth || preset.width;
    const panelHeight = heightOverride || panelNode?.offsetHeight || preset.minHeight || 220;
    const minVisibleWidth = Math.min(88, Math.max(56, Math.floor(panelWidth * 0.2)));
    const minVisibleHeader = 42;
    const minX = Math.min(0, minVisibleWidth - panelWidth);
    const maxX = Math.max(0, shellRect.width - minVisibleWidth);
    const minY = Math.min(0, minVisibleHeader - panelHeight);
    const maxY = Math.max(0, shellRect.height - minVisibleHeader);

    return {
      x: clampValue(x, minX, maxX),
      y: clampValue(y, minY, maxY)
    };
  }, []);

  const resolveFloatingToolPosition = useCallback((toolKey, anchorEl, widthOverride, heightOverride) => {
    const preset = FLOATING_TOOL_PRESETS[toolKey] || DEFAULT_FLOATING_TOOL_PRESET;
    const shellNode = shellRef.current;

    if (!shellNode) {
      return { x: preset.defaultX, y: preset.defaultY };
    }

    const shellRect = shellNode.getBoundingClientRect();
    let nextX = preset.defaultX;
    let nextY = preset.defaultY;

    if (toolKey === 'ai') {
      const panelWidth = widthOverride || preset.width;
      const commandSurface = shellNode.querySelector('.data-explorer-command-surface');
      const commandRect = commandSurface?.getBoundingClientRect?.();
      nextX = shellRect.width - panelWidth - 16;
      nextY = commandRect
        ? commandRect.bottom - shellRect.top + 12
        : preset.defaultY;
    } else if (toolKey === 'summary') {
      const panelWidth = widthOverride || preset.width;
      const panelHeight = heightOverride || preset.minHeight || 220;
      nextX = (shellRect.width - panelWidth) / 2;
      nextY = (shellRect.height - panelHeight) / 2;
    } else if (anchorEl?.getBoundingClientRect) {
      const anchorRect = anchorEl.getBoundingClientRect();
      nextX = anchorRect.left - shellRect.left;
      nextY = anchorRect.bottom - shellRect.top + 14;
    }

    return clampFloatingToolPosition(
      toolKey,
      nextX,
      nextY,
      widthOverride || preset.width,
      heightOverride || preset.minHeight
    );
  }, [clampFloatingToolPosition]);
  const resolveSelectPanelOpenWidth = useCallback((currentWidth) => {
    const preset = FLOATING_TOOL_PRESETS.select || DEFAULT_FLOATING_TOOL_PRESET;
    const shellNode = shellRef.current;
    const shellWidth = shellNode?.getBoundingClientRect?.().width || 0;
    const preferredWidth = 720;
    const maxAvailableWidth = shellWidth > 0
      ? Math.max(preset.minWidth, shellWidth - 24)
      : preferredWidth;
    const clampedPreferred = clampValue(preferredWidth, preset.minWidth, maxAvailableWidth);
    if (Number.isFinite(currentWidth) && currentWidth > 0) {
      return Math.max(currentWidth, clampedPreferred);
    }
    return clampedPreferred;
  }, []);
  const resolveCleanPanelOpenWidth = useCallback((currentWidth) => {
    const preset = FLOATING_TOOL_PRESETS.clean || DEFAULT_FLOATING_TOOL_PRESET;
    const shellNode = shellRef.current;
    const shellWidth = shellNode?.getBoundingClientRect?.().width || 0;
    const preferredWidth = preset.width;
    const maxAvailableWidth = shellWidth > 0
      ? Math.max(preset.minWidth, shellWidth - 24)
      : preferredWidth;
    const clampedPreferred = clampValue(preferredWidth, preset.minWidth, maxAvailableWidth);
    return clampedPreferred;
  }, []);

  const bringFloatingToolToFront = useCallback((toolKey) => {
    setFloatingTools((prev) => {
      if (!prev[toolKey]) return prev;
      return {
        ...prev,
        [toolKey]: {
          ...prev[toolKey],
          z: getNextFloatingToolZ(prev)
        }
      };
    });
  }, [getNextFloatingToolZ]);

  const openFloatingTool = useCallback((toolKey, anchorEl = floatingToolTriggerRefs.current?.[toolKey]) => {
    setFloatingTools((prev) => {
      const current = prev[toolKey] || createFloatingToolState()[toolKey];
      const widthForOpen = toolKey === 'select'
        ? resolveSelectPanelOpenWidth(current.width)
        : toolKey === 'clean'
          ? resolveCleanPanelOpenWidth(current.width)
          : current.width;
      const nextPosition = resolveFloatingToolPosition(toolKey, anchorEl, widthForOpen, current.height);
      return {
        ...prev,
        [toolKey]: {
          ...current,
          open: true,
          width: widthForOpen,
          z: getNextFloatingToolZ(prev),
          ...nextPosition
        }
      };
    });
  }, [getNextFloatingToolZ, resolveCleanPanelOpenWidth, resolveFloatingToolPosition, resolveSelectPanelOpenWidth]);

  const openSummaryWindow = useCallback((request = {}, anchorEl = floatingToolTriggerRefs.current?.summary) => {
    const requestedColumn = String(request?.column || '').trim().toLowerCase();
    const firstColumn = Array.isArray(columns) ? columns[0] || '' : '';
    const resolvedColumn = requestedColumn === 'first' || requestedColumn === 'first column'
      ? firstColumn
      : (request?.column || '');
    setSummaryRequest({
      ...request,
      mode: request?.mode || (resolvedColumn ? 'column_total' : 'summary'),
      column: resolvedColumn
    });
    openFloatingTool('summary', anchorEl);
  }, [columns, openFloatingTool]);

  const closeFloatingTool = useCallback((toolKey) => {
    setFloatingTools((prev) => {
      if (!prev[toolKey]) return prev;
      return {
        ...prev,
        [toolKey]: {
          ...prev[toolKey],
          open: false
        }
      };
    });
  }, []);

  const toggleFloatingTool = useCallback((toolKey, anchorEl = floatingToolTriggerRefs.current?.[toolKey]) => {
    setFloatingTools((prev) => {
      const current = prev[toolKey] || createFloatingToolState()[toolKey];
      if (current.open) {
        return {
          ...prev,
          [toolKey]: {
            ...current,
            open: false
          }
        };
      }

      const widthForOpen = toolKey === 'select'
        ? resolveSelectPanelOpenWidth(current.width)
        : toolKey === 'clean'
          ? resolveCleanPanelOpenWidth(current.width)
          : current.width;
      const nextPosition = resolveFloatingToolPosition(toolKey, anchorEl, widthForOpen, current.height);
      return {
        ...prev,
        [toolKey]: {
          ...current,
          open: true,
          width: widthForOpen,
          z: getNextFloatingToolZ(prev),
          ...nextPosition
        }
      };
    });
  }, [getNextFloatingToolZ, resolveCleanPanelOpenWidth, resolveFloatingToolPosition, resolveSelectPanelOpenWidth]);

  const ensureTextSelection = useCallback(() => {
    if (!cellSelectionBounds && effectiveSelectedColumns.length > 0 && totalVisibleRows > 0) {
      setCellRangeSelection({
        anchorRowPos: 0,
        anchorColIdx: 0,
        focusRowPos: 0,
        focusColIdx: 0
      });
    }
    setCellColorPalette(null);
  }, [cellSelectionBounds, effectiveSelectedColumns.length, setCellRangeSelection, setCellColorPalette, totalVisibleRows]);

  const startFloatingToolDrag = useCallback((toolKey, event) => {
    if (typeof event.button === 'number' && event.button !== 0) return;
    const panelNode = floatingToolRefs.current?.[toolKey];
    const shellNode = shellRef.current;
    if (!panelNode || !shellNode) return;

    bringFloatingToolToFront(toolKey);
    const panelRect = panelNode.getBoundingClientRect();
    floatingDragStateRef.current = {
      toolKey,
      panelNode,
      offsetX: event.clientX - panelRect.left,
      offsetY: event.clientY - panelRect.top
    };
    panelNode.dataset.dragging = 'true';
    if (typeof event.currentTarget?.setPointerCapture === 'function' && event.pointerId != null) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch (err) {
        // Ignore capture failures; document listeners still handle dragging.
      }
    }

    if (typeof floatingDragCleanupRef.current === 'function') {
      floatingDragCleanupRef.current();
      floatingDragCleanupRef.current = null;
    }
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    const handlePointerMove = (moveEvent) => {
      const dragState = floatingDragStateRef.current;
      const activeShellNode = shellRef.current;
      if (!dragState || !activeShellNode) return;

      const shellRect = activeShellNode.getBoundingClientRect();
      const nextPosition = clampFloatingToolPosition(
        dragState.toolKey,
        moveEvent.clientX - shellRect.left - dragState.offsetX,
        moveEvent.clientY - shellRect.top - dragState.offsetY
      );

      pendingFloatingDragRef.current = {
        toolKey: dragState.toolKey,
        position: nextPosition,
        panelNode: dragState.panelNode
      };
      if (floatingDragFrameRef.current) return;
      floatingDragFrameRef.current = requestAnimationFrame(() => {
        floatingDragFrameRef.current = null;
        const pending = pendingFloatingDragRef.current;
        if (!pending?.panelNode) return;
        pending.panelNode.style.transform = `translate3d(${pending.position.x}px, ${pending.position.y}px, 0)`;
      });
    };
    const handlePointerUp = () => {
      const dragState = floatingDragStateRef.current;
      if (floatingDragFrameRef.current) {
        cancelAnimationFrame(floatingDragFrameRef.current);
        floatingDragFrameRef.current = null;
      }
      const pending = pendingFloatingDragRef.current;
      const activePanelNode = pending?.panelNode || dragState?.panelNode;
      if (activePanelNode) activePanelNode.dataset.dragging = 'false';
      if (pending) {
        setFloatingTools((prev) => ({
          ...prev,
          [pending.toolKey]: {
            ...prev[pending.toolKey],
            ...pending.position
          }
        }));
      }
      pendingFloatingDragRef.current = null;
      floatingDragStateRef.current = null;
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      floatingDragCleanupRef.current = null;
    };
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    floatingDragCleanupRef.current = handlePointerUp;

    event.preventDefault();
  }, [bringFloatingToolToFront, clampFloatingToolPosition]);

  const startFloatingToolResize = useCallback((toolKey, event) => {
    if (typeof event.button === 'number' && event.button !== 0) return;
    const panelNode = floatingToolRefs.current?.[toolKey];
    const shellNode = shellRef.current;
    if (!panelNode || !shellNode) return;

    const shellRect = shellNode.getBoundingClientRect();
    const panelRect = panelNode.getBoundingClientRect();
    const preset = FLOATING_TOOL_PRESETS[toolKey] || DEFAULT_FLOATING_TOOL_PRESET;

    bringFloatingToolToFront(toolKey);
    floatingResizeStateRef.current = {
      toolKey,
      panelNode,
      startWidth: panelRect.width,
      startHeight: panelRect.height,
      startX: panelRect.left - shellRect.left,
      startY: panelRect.top - shellRect.top,
      pointerX: event.clientX,
      pointerY: event.clientY,
      minWidth: preset.minWidth,
      minHeight: preset.minHeight
    };
    panelNode.dataset.resizing = 'true';

    if (typeof event.currentTarget?.setPointerCapture === 'function' && event.pointerId != null) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch (err) {
        // Ignore capture failures; document listeners still handle resizing.
      }
    }

    if (typeof floatingResizeCleanupRef.current === 'function') {
      floatingResizeCleanupRef.current();
      floatingResizeCleanupRef.current = null;
    }
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';

    const handlePointerMove = (moveEvent) => {
      const resizeState = floatingResizeStateRef.current;
      const activeShellNode = shellRef.current;
      if (!resizeState || !activeShellNode) return;

      const activeShellRect = activeShellNode.getBoundingClientRect();
      const nextWidth = clampValue(
        resizeState.startWidth + (moveEvent.clientX - resizeState.pointerX),
        resizeState.minWidth,
        Math.max(resizeState.minWidth, activeShellRect.width)
      );
      const nextHeight = clampValue(
        resizeState.startHeight + (moveEvent.clientY - resizeState.pointerY),
        resizeState.minHeight,
        Math.max(resizeState.minHeight, activeShellRect.height)
      );
      const nextPosition = clampFloatingToolPosition(
        resizeState.toolKey,
        resizeState.startX,
        resizeState.startY,
        nextWidth,
        nextHeight
      );

      pendingFloatingResizeRef.current = {
        toolKey: resizeState.toolKey,
        panelNode: resizeState.panelNode,
        width: nextWidth,
        height: nextHeight,
        position: nextPosition
      };
      if (floatingResizeFrameRef.current) return;
      floatingResizeFrameRef.current = requestAnimationFrame(() => {
        floatingResizeFrameRef.current = null;
        const pending = pendingFloatingResizeRef.current;
        if (!pending?.panelNode) return;
        pending.panelNode.style.width = `${pending.width}px`;
        pending.panelNode.style.height = `${pending.height}px`;
        pending.panelNode.style.transform = `translate3d(${pending.position.x}px, ${pending.position.y}px, 0)`;
      });
    };

    const handlePointerUp = () => {
      const resizeState = floatingResizeStateRef.current;
      if (floatingResizeFrameRef.current) {
        cancelAnimationFrame(floatingResizeFrameRef.current);
        floatingResizeFrameRef.current = null;
      }
      const pending = pendingFloatingResizeRef.current;
      const activePanelNode = pending?.panelNode || resizeState?.panelNode;
      if (activePanelNode) activePanelNode.dataset.resizing = 'false';
      if (pending) {
        setFloatingTools((prev) => ({
          ...prev,
          [pending.toolKey]: {
            ...prev[pending.toolKey],
            width: pending.width,
            height: pending.height,
            ...pending.position
          }
        }));
      }
      pendingFloatingResizeRef.current = null;
      floatingResizeStateRef.current = null;
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      floatingResizeCleanupRef.current = null;
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    floatingResizeCleanupRef.current = handlePointerUp;

    event.preventDefault();
  }, [bringFloatingToolToFront, clampFloatingToolPosition]);

  useEffect(() => {
    const handleResize = () => {
      setFloatingTools((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.entries(prev).forEach(([toolKey, toolState]) => {
          if (!toolState?.open) return;
          const nextPosition = clampFloatingToolPosition(toolKey, toolState.x, toolState.y);
          if (nextPosition.x !== toolState.x || nextPosition.y !== toolState.y) {
            changed = true;
            next[toolKey] = {
              ...toolState,
              ...nextPosition
            };
          }
        });
        return changed ? next : prev;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampFloatingToolPosition]);

  const beginCellEdit = useCallback((rowIndex, columnName, currentValue) => {
    if (isApplyingDplyrTidyr) return;
    const nextEditingCell = { rowIndex, columnName };

    // Stop any active range selection dragging before starting edit
    isCellRangeSelectingRef.current = false;

    editingCellRef.current = nextEditingCell;
    setEditingCell(nextEditingCell);
    editingValueRef.current = String(currentValue ?? '');
    editingOriginalValueRef.current = String(currentValue ?? '');
  }, [isApplyingDplyrTidyr]);

  const beginHeaderEdit = (columnName) => {
    if (isApplyingDplyrTidyr) return;
    setEditingHeader(columnName);
    setEditingHeaderValue(String(columnName ?? ''));
    if (typeof setRenameColumnNameFrom === 'function') {
      setRenameColumnNameFrom(columnName);
    }
    if (typeof setRenameColumnNameTo === 'function') {
      setRenameColumnNameTo(String(columnName ?? ''));
    }
  };

  const cancelHeaderEdit = () => {
    setEditingHeader(null);
    setEditingHeaderValue('');
  };

  const commitHeaderEdit = async () => {
    const targetColumn = editingHeader;
    if (targetColumn === null || targetColumn === undefined) return;
    const nextName = String(editingHeaderValue ?? '').trim();
    if (!nextName || nextName === targetColumn) {
      cancelHeaderEdit();
      return;
    }
    const preservedColor = columnColors?.[targetColumn];
    const preservedWidth = columnWidths?.[targetColumn];
    if (typeof setRenameColumnNameFrom === 'function') {
      setRenameColumnNameFrom(targetColumn);
    }
    if (typeof setRenameColumnNameTo === 'function') {
      setRenameColumnNameTo(nextName);
    }
    let applied = false;
    if (typeof handleRenameColumnName === 'function') {
      applied = await handleRenameColumnName(targetColumn, nextName);
    }
    if (!applied) {
      cancelHeaderEdit();
      return;
    }
    if (preservedColor) {
      setColumnColors((prev) => {
        if (!prev[targetColumn]) return prev;
        const next = { ...prev };
        next[nextName] = preservedColor;
        delete next[targetColumn];
        return next;
      });
    }
    if (Number.isFinite(preservedWidth)) {
      setColumnWidths((prev) => {
        const next = { ...(prev || {}) };
        next[nextName] = preservedWidth;
        delete next[targetColumn];
        return next;
      });
    }
    cancelHeaderEdit();
  };

  const handleInsertColumnAfter = useCallback(async (afterColumnName) => {
    if (typeof handleAddColumn !== 'function') return;
    const existingColumns = new Set(Array.isArray(columns) ? columns : effectiveSelectedColumns);
    if (afterColumnName === null && !existingColumns.has('')) {
      const result = await handleAddColumn({
        name: '',
        value: '',
        afterColumn: null
      });
      if (result !== false) {
        setTimeout(() => {
          beginHeaderEdit('');
        }, 60);
      }
      return;
    }
    let counter = 1;
    while (existingColumns.has(`Column_${counter}`)) {
      counter++;
    }
    const newColumnName = `Column_${counter}`;
    const result = await handleAddColumn({
      name: newColumnName,
      value: '',
      afterColumn: afterColumnName
    });
    if (result) {
      setTimeout(() => {
        beginHeaderEdit(typeof result === 'string' ? result : newColumnName);
      }, 60);
    }
  }, [handleAddColumn, columns, effectiveSelectedColumns, beginHeaderEdit]);

  const cancelCellEdit = useCallback(() => {
    editingCellRef.current = null;
    setEditingCell(null);
    editingValueRef.current = '';
    editingOriginalValueRef.current = '';
  }, []);

  const applyFormattingDefaultsToCell = useCallback((rowIndex, columnName) => {
    const key = `${rowIndex}::${columnName}`;
    const fontDefaults = ['fontFamily', 'fontSize'].reduce((result, property) => {
      if (cellFormattingDefaults[property]) result[property] = cellFormattingDefaults[property];
      return result;
    }, {});
    const textDefaults = ['color', 'textAlign', 'textTransform', 'fontWeight', 'fontStyle', 'textDecoration'].reduce((result, property) => {
      if (cellFormattingDefaults[property]) result[property] = cellFormattingDefaults[property];
      return result;
    }, {});

    if (Object.keys(fontDefaults).length > 0) {
      setCellFontStyles((previous) => {
        const existing = previous?.[key] || {};
        const nextStyle = { ...existing };
        Object.entries(fontDefaults).forEach(([property, value]) => {
          if (!nextStyle[property]) nextStyle[property] = value;
        });
        return { ...(previous || {}), [key]: nextStyle };
      });
    }
    if (Object.keys(textDefaults).length > 0) {
      setCellTextStyles((previous) => {
        const existing = previous?.[key] || {};
        const nextStyle = { ...existing };
        Object.entries(textDefaults).forEach(([property, value]) => {
          if (!nextStyle[property]) nextStyle[property] = value;
        });
        return { ...(previous || {}), [key]: nextStyle };
      });
    }
  }, [cellFormattingDefaults]);

  const commitCellEdit = useCallback(async (rowIndex, columnName, originalValue, options = {}) => {
    const activeEditingCell = editingCellRef.current;
    if (!activeEditingCell || activeEditingCell.rowIndex !== rowIndex || activeEditingCell.columnName !== columnName) return false;
    const cellKey = `${rowIndex}::${columnName}`;
    if (pendingCellCommitRef.current === cellKey) return false;
    pendingCellCommitRef.current = cellKey;
    const nextValue = String(editingValueRef.current ?? '');
    const nextCell = options?.nextCell;
    try {
      if (nextValue === String(originalValue ?? '')) {
        cancelCellEdit();
        if (nextCell) {
          queueCellActivation(nextCell.rowIndex, nextCell.columnName, { highlightDuration: 1200 });
        }
        return true;
      }
      const applied = await handleInlineCellEdit?.(rowIndex, columnName, nextValue);
      if (applied) {
        applyFormattingDefaultsToCell(rowIndex, columnName);
        cancelCellEdit();
        if (nextCell) {
          queueCellActivation(nextCell.rowIndex, nextCell.columnName, { highlightDuration: 1200 });
        }
        return true;
      }
      return false;
    } finally {
      if (pendingCellCommitRef.current === cellKey) {
        pendingCellCommitRef.current = '';
      }
    }
  }, [applyFormattingDefaultsToCell, cancelCellEdit, handleInlineCellEdit, queueCellActivation]);

  const navigateCellEdit = useCallback(async (rowIndex, columnName, originalValue, direction) => {
    const nextCell = getAdjacentCellTarget(rowIndex, columnName, direction);
    if (!nextCell) return false;
    return commitCellEdit(rowIndex, columnName, originalValue, { nextCell });
  }, [commitCellEdit, getAdjacentCellTarget]);

  useEffect(() => {
    cancelCellEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullData]);

  useEffect(() => {
    cancelHeaderEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]);

  useEffect(() => {
    setColumnColors((prev) => {
      if (!prev || Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      columns.forEach((col) => {
        if (!prev[col]) return;
        next[col] = prev[col];
      });
      Object.keys(next).forEach((col) => {
        if (!columns.includes(col)) delete next[col];
      });
      if (Object.keys(next).length === Object.keys(prev).length && Object.keys(next).every((key) => next[key] === prev[key])) return prev;
      return next;
    });
  }, [columns]);
  useEffect(() => {
    const sanitizeColumnStyleMap = (setter) => {
      setter((prev) => {
        if (!prev || Object.keys(prev).length === 0) return prev;
        const next = {};
        Object.entries(prev).forEach(([columnName, style]) => {
          if (columns.includes(columnName) && style && typeof style === 'object') next[columnName] = style;
        });
        if (Object.keys(next).length === Object.keys(prev).length) return prev;
        return next;
      });
    };
    sanitizeColumnStyleMap(setColumnCellColors);
    sanitizeColumnStyleMap(setColumnFontStyles);
    sanitizeColumnStyleMap(setColumnTextStyles);
  }, [columns]);
  useEffect(() => {
    setCellColors((prev) => {
      if (!prev || Object.keys(prev).length === 0) return prev;
      const next = {};
      Object.entries(prev).forEach(([cellKey, color]) => {
        if (!cellKey || !color) return;
        if (!isValidGridStyleKey(cellKey, columns, fullData.length)) return;
        next[cellKey] = color;
      });
      if (Object.keys(next).length === Object.keys(prev).length && Object.keys(next).every((key) => next[key] === prev[key])) {
        return prev;
      }
      return next;
    });
  }, [columns, fullData.length]);
  useEffect(() => {
    setCellFontStyles((prev) => {
      if (!prev || Object.keys(prev).length === 0) return prev;
      const next = {};
      Object.entries(prev).forEach(([cellKey, style]) => {
        if (!cellKey || !style || typeof style !== 'object') return;
        if (!isValidGridStyleKey(cellKey, columns, fullData.length)) return;
        const nextStyle = {};
        if (style.fontFamily) nextStyle.fontFamily = String(style.fontFamily);
        if (style.fontSize) nextStyle.fontSize = String(style.fontSize);
        if (Object.keys(nextStyle).length > 0) next[cellKey] = nextStyle;
      });
      if (Object.keys(next).length === Object.keys(prev).length && Object.keys(next).every((key) => {
        return next[key]?.fontFamily === prev[key]?.fontFamily && next[key]?.fontSize === prev[key]?.fontSize;
      })) {
        return prev;
      }
      return next;
    });
  }, [columns, fullData.length]);
  useEffect(() => {
    setCellTextStyles((prev) => {
      if (!prev || Object.keys(prev).length === 0) return prev;
      const next = {};
      Object.entries(prev).forEach(([cellKey, style]) => {
        if (!cellKey || !style || typeof style !== 'object') return;
        if (!isValidGridStyleKey(cellKey, columns, fullData.length)) return;
        const nextStyle = {};
        if (style.color) nextStyle.color = String(style.color);
        if (style.textAlign) nextStyle.textAlign = String(style.textAlign);
        if (Object.keys(nextStyle).length > 0) next[cellKey] = nextStyle;
      });
      if (Object.keys(next).length === Object.keys(prev).length && Object.keys(next).every((key) => {
        return next[key]?.color === prev[key]?.color && next[key]?.textAlign === prev[key]?.textAlign;
      })) {
        return prev;
      }
      return next;
    });
  }, [columns, fullData.length]);

  useEffect(() => {
    setColumnWidths((prev) => {
      if (!prev || Object.keys(prev).length === 0) return prev;
      const next = {};
      columns.forEach((col) => {
        if (Number.isFinite(prev[col])) next[col] = prev[col];
      });
      if (Object.keys(next).length === Object.keys(prev).length) return prev;
      return next;
    });
  }, [columns]);

  useEffect(() => {
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const nextSheetName = String(activeSheetName || '').trim();
    const nextSheet = `${datasetKey}::${nextSheetName || '__default__'}`;
    const prevSheet = String(lastSheetNameRef.current || '');
    if (nextSheet === prevSheet) return;
    if (prevSheet) {
      sheetColumnColorsRef.current[prevSheet] = columnColors;
      sheetCellColorsRef.current[prevSheet] = cellColors;
      sheetCellFontStylesRef.current[prevSheet] = cellFontStyles;
      sheetCellTextStylesRef.current[prevSheet] = cellTextStyles;
      sheetColumnCellColorsRef.current[prevSheet] = columnCellColors;
      sheetColumnFontStylesRef.current[prevSheet] = columnFontStyles;
      sheetColumnTextStylesRef.current[prevSheet] = columnTextStyles;
      sheetCellColorRangesRef.current[prevSheet] = cellColorRanges;
      sheetCellFontRangesRef.current[prevSheet] = cellFontRanges;
      sheetCellTextRangesRef.current[prevSheet] = cellTextRanges;
      DATA_EXPLORER_SHEET_CUSTOM_CELL_SWATCHES[prevSheet] = customCellColorSwatches;
    }
    const restoredColumnColors = nextSheet ? (sheetColumnColorsRef.current[nextSheet] || {}) : {};
    const restoredCellColors = nextSheet ? (sheetCellColorsRef.current[nextSheet] || {}) : {};
    const restoredCellFontStyles = nextSheet ? (sheetCellFontStylesRef.current[nextSheet] || {}) : {};
    const restoredCellTextStyles = nextSheet ? (sheetCellTextStylesRef.current[nextSheet] || {}) : {};
    const restoredColumnCellColors = nextSheet ? (sheetColumnCellColorsRef.current[nextSheet] || {}) : {};
    const restoredColumnFontStyles = nextSheet ? (sheetColumnFontStylesRef.current[nextSheet] || {}) : {};
    const restoredColumnTextStyles = nextSheet ? (sheetColumnTextStylesRef.current[nextSheet] || {}) : {};
    const restoredCellColorRanges = nextSheet && Array.isArray(sheetCellColorRangesRef.current[nextSheet])
      ? sheetCellColorRangesRef.current[nextSheet]
      : [];
    const restoredCellFontRanges = nextSheet && Array.isArray(sheetCellFontRangesRef.current[nextSheet])
      ? sheetCellFontRangesRef.current[nextSheet]
      : [];
    const restoredCellTextRanges = nextSheet && Array.isArray(sheetCellTextRangesRef.current[nextSheet])
      ? sheetCellTextRangesRef.current[nextSheet]
      : [];
    const restoredCustomSwatches = nextSheet ? (DATA_EXPLORER_SHEET_CUSTOM_CELL_SWATCHES[nextSheet] || []) : [];
    setColumnColors(restoredColumnColors);
    setCellColors(restoredCellColors);
    setCellFontStyles(restoredCellFontStyles);
    setCellTextStyles(restoredCellTextStyles);
    setColumnCellColors(restoredColumnCellColors);
    setColumnFontStyles(restoredColumnFontStyles);
    setColumnTextStyles(restoredColumnTextStyles);
    setCellColorRanges(restoredCellColorRanges);
    setCellFontRanges(restoredCellFontRanges);
    setCellTextRanges(restoredCellTextRanges);
    setCustomCellColorSwatches(Array.isArray(restoredCustomSwatches) ? restoredCustomSwatches.map((value) => String(value)) : []);
    setActiveCellColorTarget(null);
    setCellColorPalette(null);
    lastSheetNameRef.current = nextSheet;
  }, [activeSheetName, cellColors, cellColorRanges, cellFontRanges, cellFontStyles, cellTextRanges, cellTextStyles, columnCellColors, columnColors, columnFontStyles, columnTextStyles, customCellColorSwatches, sourceFileName]);

  useEffect(() => {
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const sheetNameKey = String(activeSheetName || '').trim() || '__default__';
    const sheetKey = `${datasetKey}::${sheetNameKey}`;
    sheetColumnColorsRef.current[sheetKey] = columnColors;
  }, [activeSheetName, columnColors, sourceFileName]);
  useEffect(() => {
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const sheetNameKey = String(activeSheetName || '').trim() || '__default__';
    const sheetKey = `${datasetKey}::${sheetNameKey}`;
    sheetCellColorsRef.current[sheetKey] = cellColors;
  }, [activeSheetName, cellColors, sourceFileName]);
  useEffect(() => {
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const sheetNameKey = String(activeSheetName || '').trim() || '__default__';
    const sheetKey = `${datasetKey}::${sheetNameKey}`;
    sheetCellFontStylesRef.current[sheetKey] = cellFontStyles;
  }, [activeSheetName, cellFontStyles, sourceFileName]);
  useEffect(() => {
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const sheetNameKey = String(activeSheetName || '').trim() || '__default__';
    const sheetKey = `${datasetKey}::${sheetNameKey}`;
    sheetCellTextStylesRef.current[sheetKey] = cellTextStyles;
  }, [activeSheetName, cellTextStyles, sourceFileName]);
  useEffect(() => {
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const sheetNameKey = String(activeSheetName || '').trim() || '__default__';
    sheetCellColorRangesRef.current[`${datasetKey}::${sheetNameKey}`] = cellColorRanges;
  }, [activeSheetName, cellColorRanges, sourceFileName]);
  useEffect(() => {
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const sheetNameKey = String(activeSheetName || '').trim() || '__default__';
    sheetCellFontRangesRef.current[`${datasetKey}::${sheetNameKey}`] = cellFontRanges;
  }, [activeSheetName, cellFontRanges, sourceFileName]);
  useEffect(() => {
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const sheetNameKey = String(activeSheetName || '').trim() || '__default__';
    sheetCellTextRangesRef.current[`${datasetKey}::${sheetNameKey}`] = cellTextRanges;
  }, [activeSheetName, cellTextRanges, sourceFileName]);
  useEffect(() => {
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const sheetNameKey = String(activeSheetName || '').trim() || '__default__';
    sheetColumnCellColorsRef.current[`${datasetKey}::${sheetNameKey}`] = columnCellColors;
  }, [activeSheetName, columnCellColors, sourceFileName]);
  useEffect(() => {
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const sheetNameKey = String(activeSheetName || '').trim() || '__default__';
    sheetColumnFontStylesRef.current[`${datasetKey}::${sheetNameKey}`] = columnFontStyles;
  }, [activeSheetName, columnFontStyles, sourceFileName]);
  useEffect(() => {
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const sheetNameKey = String(activeSheetName || '').trim() || '__default__';
    sheetColumnTextStylesRef.current[`${datasetKey}::${sheetNameKey}`] = columnTextStyles;
  }, [activeSheetName, columnTextStyles, sourceFileName]);
  useEffect(() => {
    const datasetKey = String(sourceFileName || '__dataset__').trim() || '__dataset__';
    const sheetNameKey = String(activeSheetName || '').trim() || '__default__';
    const sheetKey = `${datasetKey}::${sheetNameKey}`;
    DATA_EXPLORER_SHEET_CUSTOM_CELL_SWATCHES[sheetKey] = Array.isArray(customCellColorSwatches)
      ? customCellColorSwatches.map((value) => String(value))
      : [];
  }, [activeSheetName, customCellColorSwatches, sourceFileName]);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isFullscreen]);

  const renderDataTable = () => (
    <div
      className={`data-explorer-data-surface relative flex-1 min-w-0 min-h-0 overflow-hidden ${isDatasetSwitching ? 'data-explorer-loading-surface' : ''}`}
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        isCellRangeSelectingRef.current = false;
        setCellRangeSelection(null);
        setCellContextMenu(null);
        setCellColorPalette(null);
      }}
    >
      <MemoizedVirtualTable
        fullData={fullData}
        totalVisibleRows={totalVisibleRows}
        resolveVisibleRowIndex={resolveVisibleRowIndex}
        findVisiblePositionForRow={findVisiblePositionForRow}
        isRTheme={isRTheme}
        isAyuTheme={isAyuTheme}
        visibleRowsCheckboxRef={visibleRowsCheckboxRef}
        allVisibleRowsSelected={allVisibleRowsSelected}
        toggleVisibleRowsSelection={toggleVisibleRowsSelection}
        selectedColumns={effectiveSelectedColumns}
        editingHeader={editingHeader}
        editingHeaderValue={editingHeaderValue}
        setEditingHeaderValue={setEditingHeaderValue}
        commitHeaderEdit={commitHeaderEdit}
        beginHeaderEdit={beginHeaderEdit}
        cancelHeaderEdit={cancelHeaderEdit}
        onInsertColumn={handleInsertColumnAfter}
        onInsertRow={handleInsertRowAfter}
        isResizingColumn={isResizingColumn}
        resizeStateRef={resizeStateRef}
        getColumnWidth={getColumnWidth}
        columnWidthColRefs={columnWidthColRefs}
        setIsResizingColumn={setIsResizingColumn}
        isRowChecked={isRowChecked}
        toggleRow={toggleRow}
        editingCell={editingCell}
        editingValueRef={editingValueRef}
        beginCellEdit={beginCellEdit}
        commitCellEdit={commitCellEdit}
        navigateCellEdit={navigateCellEdit}
        cancelCellEdit={cancelCellEdit}
        rangeSelectionBounds={cellSelectionBounds}
        onCellPointerDown={beginCellRangeSelection}
        onCellPointerEnter={updateCellRangeSelection}
        onCellPointerUp={endCellRangeSelection}
        onCellContextMenu={openCellContextMenu}
        onColumnHeaderContextMenu={openColumnHeaderContextMenu}
        onColumnHeaderSelect={selectColumnHeader}
        onRowHeaderContextMenu={openRowHeaderContextMenu}
        columnColorStyles={columnColorStyles}
        cellColorStyles={cellColorStyles}
        cellFontStyles={cellFontStyles}
        cellTextStyles={cellTextStyles}
        formattingDefaults={cellFormattingDefaults}
        columnCellColorStyles={columnCellColorStyles}
        columnFontStyles={columnFontStyles}
        columnTextStyles={columnTextStyles}
        cellColorRanges={cellColorRanges}
        cellFontRanges={cellFontRanges}
        cellTextRanges={cellTextRanges}
        jumpToCellTarget={jumpToCellTarget}
      />
      {isDatasetSwitching && (
        <div
          className="data-explorer-upload-overlay absolute inset-0 z-[1500] flex items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="data-explorer-upload-status">
            <span className="data-explorer-upload-spinner" aria-hidden="true" />
            <span>Loading dataset…</span>
          </div>
        </div>
      )}
    </div>
  );

  const isShellFullscreen = !embedded && isFullscreen;
  const normalizedSheetNames = useMemo(() => normalizeSheetNamesList(sheetNames), [sheetNames]);
  const safeActiveSheetName = String(activeSheetName || '').trim();
  const activeSheetValue = normalizedSheetNames.includes(safeActiveSheetName)
    ? safeActiveSheetName
    : (normalizedSheetNames[0] || safeActiveSheetName);
  const showSheetSelector = normalizedSheetNames.length > 0;
  const [sheetBandOpen, setSheetBandOpen] = useState(false);
  const [editingSheetName, setEditingSheetName] = useState('');
  const [sheetRenameValue, setSheetRenameValue] = useState('');
  const fileLabel = String(sourceFileName || activeSheetName || 'Current dataset').trim();
  const sheetLabel = safeActiveSheetName && safeActiveSheetName !== fileLabel ? safeActiveSheetName : '';

  const beginSheetRename = (sheet) => {
    setEditingSheetName(sheet);
    setSheetRenameValue(sheet);
  };

  const cancelSheetRename = () => {
    setEditingSheetName('');
    setSheetRenameValue('');
  };

  const commitSheetRename = () => {
    const nextName = String(sheetRenameValue || '').trim();
    if (!editingSheetName || !nextName) return;
    const result = handleRenameSheet?.(editingSheetName, nextName);
    if (result !== false) cancelSheetRename();
  };

  return (
    <div
      ref={shellRef}
      aria-busy={isDatasetSwitching ? 'true' : 'false'}
      className={`data-explorer-shell relative flex flex-col overflow-visible ${isStudioWindow
        ? 'studio-window-shell h-full rounded-none border-0 shadow-none bg-transparent'
        : (
          embedded
            ? 'h-full rounded-none'
            : (isShellFullscreen
              ? 'fixed inset-2 sm:inset-4 z-[120] rounded-none'
              : 'h-[calc(100vh-140px)] rounded-none')
        )
        } ${isRTheme
          ? `data-explorer-r-theme ${isStudioWindow ? '' : 'border border-cyan-900/35 shadow-[0_24px_48px_-20px_rgba(2,6,23,0.9)] bg-[#070d1a]'}`
          : `data-explorer-standard-theme ${isStudioWindow ? '' : 'border border-slate-200/70 dark:border-slate-800 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)] dark:shadow-[0_24px_48px_-20px_rgba(2,6,23,0.85)] bg-white dark:bg-[#070b10]'}`
        } ${isAyuTheme ? 'data-explorer-ayu-theme' : ''} ${isDatasetSwitching ? 'data-explorer-loading' : ''}`}>
      {!isStudioWindow && (
        <>
          {/* ═══ COMPACT SINGLE-ROW HEADER ══════════════════════════════════════════ */}
          <div className={`data-explorer-topbar relative flex-shrink-0 border-b ${isRTheme
            ? 'border-cyan-900/35 bg-gradient-to-r from-[#050f1e] via-[#071220] to-[#050f1e]'
            : 'border-slate-200/80 dark:border-slate-700/60 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-[#090d14] dark:via-[#0b1019] dark:to-[#090d14]'
            }`}>
            {/* Thin top accent */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] ${isRTheme
              ? 'bg-gradient-to-r from-transparent via-cyan-500/55 to-transparent'
              : 'bg-gradient-to-r from-transparent via-blue-500/35 to-transparent'
              }`} />

            <div className="data-explorer-meta-row flex items-start justify-between w-full gap-3">
              <div className="data-explorer-heading-main !mt-0 mb-1">
                <div className="data-explorer-title-copy relative min-w-0 !pt-2">
                  <div className={`data-explorer-title-heading text-[22px] md:text-[26px] font-extrabold tracking-tight leading-tight ${isRTheme ? 'text-cyan-100' : 'text-slate-800 dark:text-slate-100'
                    }`}>Data Exploration & Manipulation</div>
                  <div className={`data-explorer-title-subheading text-[10px] md:text-[12px] font-bold uppercase tracking-[0.2em] mt-0.5 ${isRTheme ? 'text-cyan-200/85' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                    Interactive Dataset Workspace
                  </div>

                  {/* NEW Dataset Panel Below Title - Absolute so it doesn't change header height */}
                  <div className="data-explorer-dataset-info absolute top-[100%] mt-4 left-0 flex items-center flex-wrap gap-2.5 z-[300] pointer-events-auto w-max">
                    <div className="absolute -left-[69px] flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                      <span className={`text-[9px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400`}>Live</span>
                    </div>
                    <div className="data-explorer-file-pill !ml-0 !py-0.5 !px-2.5 shadow-sm !text-[11px] !min-h-[22px]">
                      <span className="inline-flex items-center gap-1 flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-500">Live</span>
                      </span>
                      <span className="whitespace-nowrap">{fileLabel}</span>
                    </div>
                    {showSheetSelector && (
                      <span className="relative inline-flex items-center">
                        <button
                          type="button"
                          onClick={() => setSheetBandOpen((prev) => !prev)}
                          className={`sheet-toggle-btn ${sheetBandOpen ? 'is-open' : ''}`}
                        >
                          {activeSheetValue || 'Sheet'}
                          <ChevronDown size={10} className={`sheet-toggle-chevron ${sheetBandOpen ? 'is-open' : ''}`} />
                        </button>
                        {sheetBandOpen && (
                          <div className="sheet-tabs-band">
                            <div className="sheet-dropdown-heading">WORKBOOK SHEETS</div>
                            <div className="sheet-dropdown-subtitle">Choose a sheet to open</div>
                            <div className="sheet-dropdown-divider" />
                            {normalizedSheetNames.map((sheet) => {
                              const isActive = sheet === activeSheetValue;
                              if (editingSheetName === sheet) {
                                return (
                                  <div key={sheet} className="sheet-edit-row">
                                    <input
                                      type="text"
                                      value={sheetRenameValue}
                                      autoFocus
                                      onChange={(event) => setSheetRenameValue(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter') commitSheetRename();
                                        if (event.key === 'Escape') cancelSheetRename();
                                      }}
                                      aria-label={`Rename ${sheet}`}
                                    />
                                    <button
                                      type="button"
                                      className="sheet-edit-action is-save"
                                      onClick={commitSheetRename}
                                      title="Save sheet name"
                                      aria-label="Save sheet name"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      className="sheet-edit-action"
                                      onClick={cancelSheetRename}
                                      title="Cancel rename"
                                      aria-label="Cancel rename"
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              }
                              return (
                                <div key={sheet} className={`sheet-option-row ${isActive ? 'is-active' : ''}`}>
                                  <button
                                    type="button"
                                    disabled={isApplyingDplyrTidyr}
                                    onClick={() => {
                                      handleSheetChange?.(sheet);
                                      setSheetBandOpen(false);
                                    }}
                                    onDoubleClick={() => beginSheetRename(sheet)}
                                    className="sheet-tab-btn"
                                  >
                                    {sheet}
                                  </button>
                                  <button
                                    type="button"
                                    className="sheet-edit-btn"
                                    disabled={isApplyingDplyrTidyr}
                                    onClick={() => beginSheetRename(sheet)}
                                    title={`Rename ${sheet}`}
                                    aria-label={`Rename ${sheet}`}
                                  >
                                    <PencilLine size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    className="sheet-delete-btn"
                                    disabled={isApplyingDplyrTidyr || normalizedSheetNames.length <= 1}
                                    onClick={() => handleDeleteSheet?.(sheet)}
                                    title={normalizedSheetNames.length <= 1 ? 'Keep at least one sheet' : `Delete ${sheet}`}
                                    aria-label={normalizedSheetNames.length <= 1 ? 'Keep at least one sheet' : `Delete ${sheet}`}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </span>
                    )}
                    {typeof handleAddSheet === 'function' && (
                      <button
                        type="button"
                        className="sheet-add-btn"
                        title="Insert a new sheet"
                        aria-label="Insert a new sheet"
                        onClick={() => {
                          setSheetBandOpen(false);
                          handleAddSheet();
                        }}
                      >
                        +
                      </button>
                    )}
                    {!showSheetSelector && sheetLabel ? (
                      <span className="data-explorer-file-sheet !py-0 !px-1.5 !text-[9px]">{sheetLabel}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-auto flex-shrink-0">
                <div className="data-explorer-meta-actions">
                  {isVirtualSource ? <span className="data-explorer-meta-chip">Workspace</span> : null}
                  {!hideFullscreenToggle && !embedded && (
                    <button
                      type="button"
                      onClick={() => setIsFullscreen((prev) => !prev)}
                      className="data-explorer-icon-btn"
                      title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
                    >
                      {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>
                  )}
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="data-explorer-icon-btn data-explorer-main-close-btn"
                      title="Close Viewer"
                    >
                      <Power size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="data-explorer-heading-row !mt-0 !pt-0 justify-end">
              <div className="data-explorer-heading-actions ml-auto">
                {!hideTabs && (
                  <div className="data-explorer-tabs flex items-center gap-1 p-0.5 rounded-xl border border-[#262626] bg-[#141414] shadow-sm">
                    <button
                      onClick={() => setActiveTab('view')}
                      title="Data View"
                      data-active={effectiveTab === 'view' ? 'true' : 'false'}
                      className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${effectiveTab === 'view'
                        ? 'bg-[#242424] text-zinc-100 border border-[#383838] shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e1e] border border-transparent'
                        } data-explorer-tab-icon-btn`}
                    >
                      <Database size={16} />
                    </button>

                    <div className="w-[1px] h-4 mx-0.5 bg-[#262626]" />

                    {[
                      { id: 'filter', icon: Filter, title: 'Filter Rows' },
                      { id: 'select', icon: Columns, title: 'Select Columns' },
                      { id: 'arrange', icon: ArrowUpDown, title: 'Arrange Rows' },
                      { id: 'summarize', icon: Database, title: 'Summarize by Group' },
                      { id: 'distinct', icon: Copy, title: 'Distinct Rows' },
                      { id: 'renameLevels', icon: PencilLine, title: 'Rename Group Levels' },
                      { id: 'separate', icon: FileText, title: 'Separate Columns' },
                      { id: 'reshape', icon: LayoutGrid, title: 'Reshape (Pivot)' },
                      { id: 'merge', icon: Layers, title: 'Merge (Stack)' }
                    ].map((tool) => {
                      const isToolActive = effectiveTab === 'manipulate' && studioPanels[tool.id];
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setActiveTab('manipulate');
                            toggleStudioPanel(tool.id);
                          }}
                          title={tool.title}
                          data-active={isToolActive ? 'true' : 'false'}
                          className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${isToolActive
                            ? 'bg-[#242424] text-zinc-100 border border-[#383838] shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e1e] border border-transparent'
                            } data-explorer-tab-icon-btn`}
                        >
                          <tool.icon size={16} />
                        </button>
                      );
                    })}

                    <div className="w-[1px] h-4 mx-0.5 bg-[#262626]" />

                    {/* AI Agent Tab */}
                    <button
                      onClick={() => toggleFloatingTool('ai')}
                      title="AI Data Agent"
                      aria-expanded={floatingTools.ai?.open ? 'true' : 'false'}
                      data-active={floatingTools.ai?.open ? 'true' : 'false'}
                      className={`p-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${floatingTools.ai?.open
                        ? 'bg-[#242424] text-zinc-100 border border-[#383838] shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e1e] border border-transparent'
                        } data-explorer-tab-icon-btn`}
                    >
                      <Bot size={16} />
                    </button>

                    <button
                      ref={(node) => { floatingToolTriggerRefs.current.summary = node; }}
                      onClick={() => openSummaryWindow({ mode: 'summary' })}
                      title="Calculations and Summary"
                      aria-expanded={floatingTools.summary?.open ? 'true' : 'false'}
                      data-active={floatingTools.summary?.open ? 'true' : 'false'}
                      className={`p-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${floatingTools.summary?.open
                        ? 'bg-[#242424] text-zinc-100 border border-[#383838] shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e1e] border border-transparent'
                        } data-explorer-tab-icon-btn`}
                    >
                      <Calculator size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="data-explorer-command-surface">
            <div className="data-explorer-toolbar flex items-center flex-wrap gap-2 px-3 py-2">
              <div className="toolbar-left">
                <button
                  type="button"
                  ref={(node) => { floatingToolTriggerRefs.current.rows = node; }}
                  onClick={(event) => toggleFloatingTool('rows', event.currentTarget)}
                  aria-expanded={floatingTools.rows?.open ? 'true' : 'false'}
                  disabled={isApplyingDplyrTidyr || fullData.length === 0 || columns.length === 0}
                  className={`toolbar-menu-trigger toolbar-floating-trigger disabled:opacity-50 disabled:cursor-not-allowed ${floatingTools.rows?.open ? 'is-open' : ''}`}
                >
                  <Database size={12} /> Data Quality <ChevronDown size={12} className="toolbar-floating-trigger-caret" />
                </button>

                <button
                  type="button"
                  ref={(node) => { floatingToolTriggerRefs.current.select = node; }}
                  onClick={(event) => toggleFloatingTool('select', event.currentTarget)}
                  aria-expanded={floatingTools.select?.open ? 'true' : 'false'}
                  disabled={isApplyingDplyrTidyr || fullData.length === 0 || columns.length === 0}
                  className={`toolbar-menu-trigger toolbar-floating-trigger disabled:opacity-50 disabled:cursor-not-allowed ${floatingTools.select?.open ? 'is-open' : ''}`}
                >
                  <CheckSquare size={12} /> Select <ChevronDown size={12} className="toolbar-floating-trigger-caret" />
                </button>

                <button
                  type="button"
                  ref={(node) => { floatingToolTriggerRefs.current.clean = node; }}
                  onClick={(event) => toggleFloatingTool('clean', event.currentTarget)}
                  aria-expanded={floatingTools.clean?.open ? 'true' : 'false'}
                  disabled={isApplyingDplyrTidyr || fullData.length === 0 || columns.length === 0}
                  className={`toolbar-menu-trigger toolbar-floating-trigger disabled:opacity-50 disabled:cursor-not-allowed clean-tool-btn ${floatingTools.clean?.open ? 'is-open' : ''}`}
                >
                  <ShieldCheck size={12} /> Clean <ChevronDown size={12} className="toolbar-floating-trigger-caret" />
                </button>

                <button
                  type="button"
                  ref={(node) => { floatingToolTriggerRefs.current.columns = node; }}
                  onClick={(event) => toggleFloatingTool('columns', event.currentTarget)}
                  aria-expanded={floatingTools.columns?.open ? 'true' : 'false'}
                  disabled={isApplyingDplyrTidyr || fullData.length === 0 || columns.length === 0}
                  className={`toolbar-menu-trigger toolbar-floating-trigger disabled:opacity-50 disabled:cursor-not-allowed ${floatingTools.columns?.open ? 'is-open' : ''}`}
                >
                  <Columns size={12} /> Columns <ChevronDown size={12} className="toolbar-floating-trigger-caret" />
                </button>

                <HeaderTxtControls
                  currentFontFamily={activeCellFormatting.fontFamily}
                  currentFontSize={activeCellFormatting.fontSize}
                  currentTextColor={activeCellFormatting.color}
                  currentTextAlign={activeCellFormatting.textAlign}
                  currentTextTransform={activeCellFormatting.textTransform}
                  currentFontWeight={activeCellFormatting.fontWeight}
                  currentFontStyle={activeCellFormatting.fontStyle}
                  currentTextDecoration={activeCellFormatting.textDecoration}
                  applyCellFontStyle={applyCellFontStyle}
                  applyCellTextStyle={applyCellTextStyle}
                  ensureSelection={ensureTextSelection}
                  disabled={isApplyingDplyrTidyr || fullData.length === 0 || columns.length === 0}
                />



                {fullData.length === 0 && !isDatasetSwitching && typeof handleCreateDataframe === 'function' && (
                  <div className={`data-explorer-new-data inline-flex items-center gap-1.5 rounded-lg border px-1.5 py-1 ${isRTheme
                    ? 'border-cyan-900/45 bg-[#071426]'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/80'
                    }`}>
                    <span className={`px-1 text-[10px] font-bold uppercase tracking-[0.08em] ${isRTheme ? 'text-cyan-100' : 'text-slate-600 dark:text-slate-300'}`}>
                      New data
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="500000"
                      value={createDataframeRows}
                      onChange={(event) => setCreateDataframeRows?.(event.target.value)}
                      className="data-explorer-new-data-input h-7 w-14 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-700 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      aria-label="New data rows"
                      placeholder="Rows"
                    />
                    <span className="text-[10px] text-slate-400">×</span>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={createDataframeCols}
                      onChange={(event) => setCreateDataframeCols?.(event.target.value)}
                      className="data-explorer-new-data-input h-7 w-14 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-700 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      aria-label="New data columns"
                      placeholder="Cols"
                    />
                    <input
                      type="text"
                      value={createDataframePrefix}
                      onChange={(event) => setCreateDataframePrefix?.(event.target.value)}
                      className="data-explorer-new-data-input h-7 w-16 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-700 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      aria-label="New data column prefix"
                      placeholder="Prefix"
                    />
                    <button
                      type="button"
                      onClick={handleCreateDataframe}
                      disabled={isApplyingDplyrTidyr}
                      className="data-explorer-new-data-button inline-flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2 text-[10px] font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus size={12} /> Create
                    </button>
                  </div>
                )}

              </div>

              <div className="toolbar-right">
                {isApplyingDplyrTidyr && (
                  <span className="toolbar-status">
                    <span className="toolbar-status-dot" /> Updating
                  </span>
                )}

                <div className="relative flex items-center gap-1" ref={undoTimerMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      if (undoTimerOpen) {
                        setUndoTimerOpen(false);
                        return;
                      }
                      const triggerRect = undoTimerMenuRef.current?.getBoundingClientRect?.();
                      if (triggerRect) {
                        setUndoTimerPosition({
                          top: triggerRect.bottom + 8,
                          left: Math.max(8, Math.min(window.innerWidth - 238, triggerRect.right - 230))
                        });
                      }
                      setUndoTimerOpen(true);
                    }}
                    disabled={isApplyingDplyrTidyr}
                    className={`toolbar-menu-trigger toolbar-header-action disabled:cursor-not-allowed disabled:opacity-50 ${undoTimerOpen ? 'is-open' : ''}`}
                    title="Choose how far back to restore"
                    aria-label="Restore timer"
                    aria-expanded={undoTimerOpen}
                  >
                    <span>Timer</span>
                    <ChevronDown size={12} className={`transition-transform ${undoTimerOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {undoTimerOpen && undoTimerPosition && createPortal(
                    <div
                      ref={undoTimerPanelRef}
                      className="fixed z-[9999] w-[230px] overflow-hidden rounded-xl border border-zinc-700/80 bg-[#161616] shadow-2xl backdrop-blur-md"
                      style={{ top: undoTimerPosition.top, left: undoTimerPosition.left }}
                    >
                      <div className="border-b border-zinc-800/90 bg-[#121212] px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-300">Restore time</div>
                        <div className="mt-0.5 text-[10px] text-zinc-500">Choose a saved workspace point</div>
                      </div>
                      <div className="space-y-1 p-2">
                        {UNDO_RESTORE_OPTIONS.map((option) => {
                          const isSelected = undoRestoreTarget === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setUndoRestoreTarget(option.value);
                                setUndoTimerOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-all ${isSelected
                                ? 'border-zinc-600 bg-zinc-800 text-zinc-100 shadow-sm'
                                : 'border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'}`}
                            >
                              <span>
                                <span className="block">{option.label}</span>
                                {option.description && <span className="mt-0.5 block text-[10px] font-normal text-zinc-500">{option.description}</span>}
                              </span>
                              {isSelected && <span className="ml-2 h-2 w-2 shrink-0 rounded-full bg-zinc-300 shadow-[0_0_6px_rgba(212,212,216,0.6)]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>,
                    document.body
                  )}
                  <button
                    type="button"
                    onClick={() => handleUndoDataset?.(undoRestoreTarget)}
                    disabled={!canUndoDataset || isApplyingDplyrTidyr}
                    className="toolbar-menu-trigger toolbar-header-action disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Restore workspace"
                  >
                    <RotateCcw size={12} /> Undo
                  </button>
                </div>

                <div className="search-field toolbar-search-field">
                  <Search className="search-icon" size={13} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="search-clear"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveDatasetCsv?.({
                    columnColors,
                    columnWidths: exportColumnWidths,
                    ...exportFormatting,
                    useFullData: true
                  })}
                  disabled={isApplyingDplyrTidyr || isSavingDatasetCsv || fullData.length === 0 || columns.length === 0}
                  className="toolbar-menu-trigger toolbar-header-action disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export current working dataset as CSV"
                >
                  <Save size={12} /> {isSavingDatasetCsv ? 'CSV…' : 'CSV'}
                </button>

                {typeof handleSaveDatasetXlsx === 'function' && (
                  <button
                    type="button"
                    onClick={() => handleSaveDatasetXlsx?.({
                      columnColors,
                      columnWidths: exportColumnWidths,
                      ...exportFormatting,
                      useFullData: true
                    })}
                    disabled={isApplyingDplyrTidyr || isSavingDatasetXlsx || fullData.length === 0 || columns.length === 0}
                    className="toolbar-menu-trigger toolbar-header-action disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export current working dataset as XLSX"
                  >
                    <Layers size={12} /> {isSavingDatasetXlsx ? 'XLSX…' : 'XLSX'}
                  </button>
                )}

                {typeof handleSaveDatasetPdf === 'function' && (
                  <button
                    type="button"
                    onClick={() => handleSaveDatasetPdf?.({ columnColors })}
                    disabled={isApplyingDplyrTidyr || isSavingDatasetPdf || fullData.length === 0 || columns.length === 0 || selectedColumns.length === 0}
                    className="toolbar-menu-trigger toolbar-header-action disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export PDF"
                  >
                    <FileText size={12} /> {isSavingDatasetPdf ? 'PDF…' : 'PDF'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="data-explorer-floating-layer">
            <FloatingToolWindow
              toolKey="summary"
              panelRef={(node) => { floatingToolRefs.current.summary = node; }}
              state={floatingTools.summary}
              title="Calculations"
              subtitle="Excel-style summaries, totals, and row calculations."
              icon={Calculator}
              width={FLOATING_TOOL_PRESETS.summary.width}
              isRTheme={isRTheme}
              className="floating-tool-window-summary"
              onClose={closeFloatingTool}
              onFocus={bringFloatingToolToFront}
              onDragStart={startFloatingToolDrag}
              onResizeStart={startFloatingToolResize}
            >
              <DataExplorerCalculations
                fullData={fullData}
                columns={columns}
                selectedColumns={effectiveSelectedColumns}
                selectedRows={selectedRows}
                selectedRowsMode={selectedRowsMode}
                filteredRowIndices={effectiveFilteredRowIndices}
                isRowSelected={isRowSelected}
                request={summaryRequest}
                isRTheme={isRTheme}
              />
            </FloatingToolWindow>

            <FloatingToolWindow
              toolKey="ai"
              panelRef={(node) => { floatingToolRefs.current.ai = node; }}
              state={floatingTools.ai}
              title="AI Data Agent"
              subtitle="Explore and transform the current dataset."
              icon={Bot}
              width={FLOATING_TOOL_PRESETS.ai.width}
              isRTheme={isRTheme}
              className="floating-tool-window-ai"
              onClose={closeFloatingTool}
              onFocus={bringFloatingToolToFront}
              onDragStart={startFloatingToolDrag}
              onResizeStart={startFloatingToolResize}
            >
              <DataExplorerAIAgent
                fullData={fullData}
                columns={effectiveSelectedColumns}
                allColumns={columns}
                selectedRowIndices={selectedDataRowIndices}
                theme={theme}
                isRTheme={isRTheme}
                defaultOllamaUrl={aiAgentDefaultOllamaUrl}
                defaultApiKey={aiAgentDefaultApiKey}
                floating
                onShowSummary={(request) => openSummaryWindow(request)}
                onAddColumn={(name, value) => {
                  if (typeof handleAddColumn !== 'function') return false;
                  return handleAddColumn({ name, value: value ?? '', rowIndices: agentRowScope });
                }}
                onDeleteColumn={(name) => {
                  if (!columns.includes(name)) return false;
                  if (typeof handleDeleteColumn !== 'function') return false;
                  return handleDeleteColumn(name);
                }}
                onRenameColumn={(from, to) => {
                  if (!columns.includes(from)) return false;
                  if (typeof handleRenameColumnName !== 'function') return false;
                  return handleRenameColumnName(from, to);
                }}
                onFilterRows={(column, operator, value, value2) => {
                  if (!columns.includes(column)) return false;
                  if (typeof handleFilterRows !== 'function') return false;
                  return handleFilterRows({ column, operator, value, value2, scopeRowIndices: agentRowScope, scopeColumnNames: columns });
                }}
                onSortRows={(column, direction) => {
                  if (!columns.includes(column)) return false;
                  if (typeof handleSortRows !== 'function') return false;
                  return handleSortRows({ column, direction, scopeRowIndices: agentRowScope, scopeColumnNames: columns });
                }}
                onFillMissing={(column, mode, value, groupColumn) => {
                  const requestedColumns = column === '*' || (Array.isArray(column) && column.includes('*'))
                    ? columns
                    : (Array.isArray(column) ? column : [column]);
                  const validColumns = requestedColumns
                    .map((columnName) => String(columnName || '').trim())
                    .filter((columnName) => columns.includes(columnName));
                  if (validColumns.length === 0 || typeof cleanMissingValues !== 'function') return false;
                  return cleanMissingValues({
                    columns: validColumns,
                    rows: agentRowScope,
                    scopeRowIndices: agentRowScope,
                    scopeRows: true,
                    mode,
                    value,
                    groupColumn,
                    skipConfirm: true
                  });
                }}
                onReplaceValue={(column, findValue, replaceValue) => (
                  columns.includes(column) && typeof handleReplaceValue === 'function'
                    ? handleReplaceValue(column, findValue, replaceValue, { rowIndices: agentRowScope })
                    : false
                )}
                onAddRow={(values) => {
                  if (typeof handleAddRow !== 'function') return false;
                  return handleAddRow(values ?? {});
                }}
                onDeleteRows={(options = {}) => {
                  if (typeof handleDeleteRows !== 'function') return false;
                  const requested = options.rowIndices ?? options.rowIndex;
                  const rowIndices = requested === undefined
                    ? (selectedDataRowIndices.length > 0 ? selectedDataRowIndices : agentRowScope)
                    : (Array.isArray(requested) ? requested : [requested]);
                  if (!rowIndices.every((rowIndex) => Number.isInteger(Number(rowIndex)) && Number(rowIndex) >= 0 && Number(rowIndex) < fullData.length)) return false;
                  return handleDeleteRows({ rowIndices });
                }}
                onCreateDataset={(dataset) => {
                  if (typeof handleCreateDataset !== 'function') return false;
                  return handleCreateDataset(dataset ?? {});
                }}
                onEditCell={(rowIndex, columnName, value) => (
                  columns.includes(columnName)
                    && Number.isInteger(Number(rowIndex))
                    && Number(rowIndex) >= 0
                    && Number(rowIndex) < fullData.length
                    && typeof handleInlineCellEdit === 'function'
                    ? handleInlineCellEdit(rowIndex, columnName, value)
                    : false
                )}
                onSetCellColor={handleAgentSetCellColor}
                onSetTextColor={handleAgentSetTextColor}
                onFormatCells={handleAgentFormatCells}
                onReorderColumns={(from, to) => {
                  const sourceColumn = String(from || '').trim();
                  const targetColumn = String(to || '').trim();
                  if (!sourceColumn || !targetColumn || sourceColumn === targetColumn) return false;
                  if (!columns.includes(sourceColumn) || !columns.includes(targetColumn)) return false;
                  return typeof handleReorderColumns === 'function'
                    ? handleReorderColumns({ sourceColumn, targetColumn })
                    : false;
                }}
                onMergeColumns={(options) => (
                  Array.isArray(options) || !options
                    ? false
                    : columns.includes(options.columnA ?? options.column_a)
                      && columns.includes(options.columnB ?? options.column_b)
                      && typeof handleMergeColumns === 'function'
                      ? handleMergeColumns({ ...options, scopeRowIndices: agentRowScope, scopeColumnNames: columns })
                      : false
                )}
                onReshapeWideToLong={(options = {}) => {
                  const requestedColumns = Array.isArray(options.columns) ? options.columns : [];
                  const idColumn = options.idColumn ?? options.id_column;
                  const targetColumns = [...requestedColumns, idColumn]
                    .filter(Boolean)
                    .map((columnName) => String(columnName));
                  return targetColumns.every((columnName) => columns.includes(columnName))
                    && typeof handleReshapeWideToLong === 'function'
                    ? handleReshapeWideToLong({ ...options, scopeRowIndices: agentRowScope, scopeColumnNames: columns })
                    : false;
                }}
                onSeparateColumn={(options = {}) => {
                  const sourceColumn = options.column ?? options.sourceColumn ?? options.source_column;
                  return columns.includes(sourceColumn)
                    && typeof handleSeparateColumn === 'function'
                    ? handleSeparateColumn({ ...options, scopeRowIndices: agentRowScope, scopeColumnNames: columns })
                    : false;
                }}
                onGroupBySummarise={(options = {}) => {
                  const groupColumns = Array.isArray(options.groupColumns)
                    ? options.groupColumns
                    : [options.groupColumns ?? options.groupColumn ?? options.group_column].filter(Boolean);
                  const summaryColumn = options.summaryColumn ?? options.summary_column;
                  const targetColumns = [...groupColumns, summaryColumn].filter(Boolean);
                  return targetColumns.every((columnName) => columns.includes(columnName))
                    && typeof handleGroupBySummarise === 'function'
                    ? handleGroupBySummarise({ ...options, scopeRowIndices: agentRowScope, scopeColumnNames: columns })
                    : false;
                }}
                onDistinctRows={(options = {}) => {
                  const requestedColumns = Array.isArray(options.columns) ? options.columns : columns;
                  return requestedColumns.every((columnName) => columns.includes(columnName))
                    && typeof handleDistinctRows === 'function'
                    ? handleDistinctRows({ ...options, columns: requestedColumns, useSelected: false, scopeRowIndices: agentRowScope, scopeColumnNames: columns })
                    : false;
                }}
                onRenameGroupLevels={(options = {}) => {
                  const columnName = options.column ?? options.column_name ?? options.columnName;
                  return columns.includes(columnName)
                    && typeof handleRenameGroupLevels === 'function'
                    ? handleRenameGroupLevels({ ...options, scopeRowIndices: agentRowScope })
                    : false;
                }}
                onKeepColumns={(targetColumns) => (
                  Array.isArray(targetColumns)
                    && targetColumns.every((columnName) => columns.includes(columnName))
                    && typeof handleKeepSelectedColumns === 'function'
                    ? handleKeepSelectedColumns({ columns: targetColumns, scopeRowIndices: agentRowScope })
                    : false
                )}
                onDeleteColumns={(targetColumns) => (
                  Array.isArray(targetColumns)
                    && targetColumns.every((columnName) => columns.includes(columnName))
                    && typeof handleDeleteSelectedVariables === 'function'
                    ? handleDeleteSelectedVariables({ columns: targetColumns, scopeRowIndices: agentRowScope })
                    : false
                )}
                onApplyDplyrTidyrPipeline={(pipeline) => (
                  typeof handleApplyDplyrTidyrPipeline === 'function'
                    ? handleApplyDplyrTidyrPipeline(pipeline, { scopeRowIndices: agentRowScope, scopeColumnNames: columns })
                    : false
                )}
                onUndoDataset={() => (
                  canUndoDataset && typeof handleUndoDataset === 'function'
                    ? handleUndoDataset(undoRestoreTarget)
                    : false
                )}
              />
            </FloatingToolWindow>

            <FloatingToolWindow
              toolKey="rows"
              panelRef={(node) => { floatingToolRefs.current.rows = node; }}
              state={floatingTools.rows}
              title="Data Quality"
              subtitle="Interactive dataset quality and selection stats."
              icon={Database}
              width={FLOATING_TOOL_PRESETS.rows.width}
              isRTheme={isRTheme}
              className="floating-tool-window-rows"
              onClose={closeFloatingTool}
              onFocus={bringFloatingToolToFront}
              onDragStart={startFloatingToolDrag}
              onResizeStart={startFloatingToolResize}
            >
              <div className="toolbar-menu-section rows-dataset-section">
                <span className="toolbar-menu-label">Dataset</span>
                <div className="toolbar-dataset-mini-table-wrap">
                  <table className="toolbar-dataset-mini-table">
                    <thead>
                      <tr>
                        <th aria-label="Type" />
                        <th>Columns</th>
                        <th>Rows</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th scope="row">Total</th>
                        <td>{columns.length.toLocaleString()}</td>
                        <td>{fullData.length.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <th scope="row">Selected</th>
                        <td>{selectedColumns.length.toLocaleString()}</td>
                        <td>{selectedRowCountLive.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="toolbar-menu-section rows-quality-section">
                <p className="toolbar-menu-copy">
                  {hasFilteredSubset ? 'Based on selected visible rows after search/filter.' : 'Based on selected rows in the current working dataset.'}
                  {activeQualityColumns.length < columns.length
                    ? ` Using ${activeQualityColumns.length.toLocaleString()} selected column(s).`
                    : ' Using all columns.'}
                  {rowQualitySummary.sampled ? ` Sampled the first ${rowQualitySummary.sampleRows.toLocaleString()} row(s) for speed.` : ''}
                </p>
                <div className="toolbar-quality-meter" aria-hidden="true">
                  <span
                    className="toolbar-quality-meter-complete"
                    style={{ width: `${rowQualitySummary.completePct}%` }}
                  />
                </div>
                <div className="toolbar-quality-legend">
                  <span><strong>{rowQualitySummary.completePct}%</strong> complete</span>
                  <span><strong>{rowQualitySummary.incompletePct}%</strong> incomplete</span>
                </div>
                <div className="toolbar-stats-grid toolbar-stats-grid-compact">
                  <div className="toolbar-stat-card">
                    <span className="toolbar-stat-label">Messing Values</span>
                    <strong>{rowQualitySummary.missingValueCount.toLocaleString()}</strong>
                  </div>
                  <div className="toolbar-stat-card">
                    <span className="toolbar-stat-label">Missing Rows %</span>
                    <strong>{rowQualitySummary.incompleteRowsPct}%</strong>
                  </div>
                  <div className="toolbar-stat-card">
                    <span className="toolbar-stat-label">Rows Evaluated</span>
                    <strong>{rowQualitySummary.sampleRows.toLocaleString()}</strong>
                  </div>
                  <div className="toolbar-stat-card">
                    <span className="toolbar-stat-label">Full Rows %</span>
                    <strong>{rowQualitySummary.completeRowsPct}%</strong>
                  </div>
                </div>
              </div>

              <div className="toolbar-menu-section toolbar-quality-panel rows-missing-section">
                <span className="toolbar-menu-label">Messing Values</span>
                {rowQualitySummary.topMissingCells.length > 0 ? (
                  <div className="toolbar-quality-list toolbar-quality-list-horizontal-flow">
                    {rowQualitySummary.topMissingCells.map(({ rowIndex, columnName }, idx) => (
                      <div key={`quality-missing-cell-${rowIndex}-${columnName}-${idx}`} className="toolbar-quality-item">
                        <div className="toolbar-quality-copy">
                          <strong>Row {rowIndex + 1} x {columnName}</strong>
                          <span>Missing value</span>
                        </div>
                        <div className="toolbar-quality-actions">
                          <button
                            type="button"
                            className="toolbar-quality-jump"
                            onClick={() => jumpToMissingCell(rowIndex, columnName)}
                          >
                            Go to cell
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="toolbar-quality-empty">
                    {rowQualitySummary.totalRows === 0 ? 'No selected rows to evaluate.' : 'No messing values found in the selected rows.'}
                  </div>
                )}
              </div>
            </FloatingToolWindow>

            <FloatingToolWindow
              toolKey="select"
              panelRef={(node) => { floatingToolRefs.current.select = node; }}
              state={floatingTools.select}
              title="Selection"
              subtitle="Keep row and group selection in one place."
              icon={CheckSquare}
              width={FLOATING_TOOL_PRESETS.select.width}
              isRTheme={isRTheme}
              className="floating-tool-window-selection"
              onClose={closeFloatingTool}
              onFocus={bringFloatingToolToFront}
              onDragStart={startFloatingToolDrag}
              onResizeStart={startFloatingToolResize}
            >
              <div className="toolbar-menu-section">
                <span className="toolbar-menu-label">Row Selection</span>
                <div className="toolbar-floating-stack">
                  <div className="segmented-group">
                    <button
                      type="button"
                      onClick={handleSelectAllRows}
                      className={`control-btn ${selectedRowsMode === 'all' ? 'is-active' : ''}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllRows}
                      className={`control-btn ${visibleSelectedCount === 0 ? 'is-active' : ''}`}
                    >
                      None
                    </button>
                  </div>
                  <div className="segmented-group selection-stepper">
                    <span className="segmented-label">N</span>
                    <input
                      type="number"
                      className="selection-input"
                      value={quickSelectN}
                      onChange={(e) => setQuickSelectN(parseInt(e.target.value, 10) || 1)}
                    />
                    <button
                      type="button"
                      onClick={handleSelectFirstNRows}
                      className={`control-btn ${selectionStepperMode === 'head' ? 'is-active' : ''}`}
                    >
                      Head
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectLastNRows}
                      className={`control-btn ${selectionStepperMode === 'tail' ? 'is-active' : ''}`}
                    >
                      Tail
                    </button>
                  </div>
                  <span className="selection-summary">
                    {visibleSelectedCount > 0 && (
                      <><span className="selection-summary-strong">{visibleSelectedCount}</span> visible · </>
                    )}
                    {selectedRowCountLive} total selected
                  </span>
                </div>
              </div>

              {groupCandidateColumns.length > 0 && (
                <div className="toolbar-menu-section">
                  <span className="toolbar-menu-label">Group Selection</span>
                  <p className="toolbar-menu-copy">
                    Choose a grouping column, then add more columns with `+` when you want temporary multi-column focus.
                    Group By execution is now controlled from the Studio header toggle.
                  </p>
                  <div className="toolbar-floating-stack">
                    <div className="group-selection-layout">
                      <div className="group-selection-main">
                        <AyuSelect
                          isRTheme={isRTheme}
                          className="group-select group-select-compact"
                          value={groupVar}
                          onChange={(val) => {
                            if (typeof setGroupVar === 'function') setGroupVar(val);
                            setGroupColumnToAdd('');
                            setSelectedGroupColumns(val ? [String(val)] : []);
                            if (typeof setSelectedRowsForGroups === 'function') setSelectedRowsForGroups([]);
                          }}
                          options={[
                            { label: 'Choose column', value: '' },
                            ...groupCandidateColumns.map(col => ({ label: col, value: col }))
                          ]}
                        />

                        <div className="control-row control-row-group">
                          <AyuSelect
                            isRTheme={isRTheme}
                            className="group-select group-select-compact"
                            value={groupColumnToAdd}
                            onChange={setGroupColumnToAdd}
                            disabled={!groupVar || availableGroupColumnsToAdd.length === 0}
                            options={[
                              {
                                label: availableGroupColumnsToAdd.length > 0
                                  ? 'Choose column to add'
                                  : 'No extra columns',
                                value: ''
                              },
                              ...availableGroupColumnsToAdd.map((columnName) => ({ label: columnName, value: columnName }))
                            ]}
                          />
                          <button
                            type="button"
                            onClick={addGroupColumnSelection}
                            disabled={!groupVar || !groupColumnToAdd}
                            className="control-btn inline-flex items-center gap-1.5"
                          >
                            <Plus size={13} />
                            Add Column
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const normalizedGroupVar = String(groupVar || '').trim();
                              setSelectedGroupColumns(normalizedGroupVar ? [normalizedGroupVar] : []);
                              setGroupColumnSelectedLevels({});
                              setGroupColumnToAdd('');
                            }}
                            disabled={!isGroupColumnFocusActive}
                            className="control-btn"
                          >
                            Restore View
                          </button>
                        </div>

                        {selectedGroupColumns.length > 0 && (
                          <div className="group-levels">
                            {selectedGroupColumns.map((columnName, index) => {
                              const isPrimary = index === 0 && String(columnName) === String(groupVar || '');
                              return (
                                <button
                                  key={`group-column-chip-${columnName}`}
                                  type="button"
                                  onClick={() => removeGroupColumnSelection(columnName)}
                                  className="group-chip group-chip-active"
                                  title={isPrimary ? `${columnName} (primary grouping column)` : `Remove ${columnName}`}
                                >
                                  {isPrimary ? `${columnName} (primary)` : columnName}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {isGroupColumnFocusActive && (
                          <span className="group-controls-hint">
                            Focus mode is active: non-selected columns and non-selected rows are hidden until you restore to one column.
                          </span>
                        )}

                        {selectedAdditionalGroupColumns.length > 0 && (
                          <>
                            <span className="group-controls-hint">
                              Added columns use compact controls. Numeric columns are added without level selection.
                            </span>
                            <div className="group-column-compact-list">
                              {selectedAdditionalGroupColumns.map((columnName) => {
                                const isCategoricalColumn = selectedAdditionalCategoricalColumns.includes(columnName);
                                const levels = Array.isArray(groupColumnLevelsMap[columnName]) ? groupColumnLevelsMap[columnName] : [];
                                const selectedLevels = Array.isArray(groupColumnSelectedLevels[columnName])
                                  ? groupColumnSelectedLevels[columnName]
                                  : levels;
                                return (
                                  <div key={`group-column-compact-${columnName}`} className="group-column-compact-item">
                                    <div className="group-column-compact-head">
                                      <span className="group-column-compact-name" title={columnName}>{columnName}</span>
                                      {isCategoricalColumn ? (
                                        <>
                                          <span className="group-column-compact-meta" title={`${selectedLevels.length}/${levels.length} levels active`}>
                                            {selectedLevels.length}/{levels.length}
                                          </span>
                                          <div className="group-column-compact-actions">
                                            <button
                                              type="button"
                                              onClick={() => setAllAddedColumnLevels(columnName)}
                                              disabled={levels.length === 0}
                                              className="group-column-icon-btn"
                                              title={`Select all levels for ${columnName}`}
                                              aria-label={`Select all levels for ${columnName}`}
                                            >
                                              <CheckSquare size={12} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => clearAddedColumnLevels(columnName)}
                                              disabled={levels.length === 0}
                                              className="group-column-icon-btn"
                                              title={`Clear all levels for ${columnName}`}
                                              aria-label={`Clear all levels for ${columnName}`}
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        <span
                                          className="group-column-compact-meta group-column-compact-meta-numeric group-column-compact-meta-icon"
                                          title={`${columnName} (numeric column)`}
                                          aria-label={`${columnName} numeric column`}
                                        >
                                          <Columns size={11} />
                                        </span>
                                      )}
                                    </div>
                                    {isCategoricalColumn && levels.length > 0 && (
                                      <div className="group-column-levels-inline">
                                        {levels.map((level) => {
                                          const active = selectedLevels.includes(level);
                                          return (
                                            <button
                                              key={`group-column-level-chip-${columnName}-${level}`}
                                              type="button"
                                              onClick={() => toggleAddedColumnLevel(columnName, level)}
                                              className={`group-chip ${active ? 'group-chip-active' : ''}`}
                                              title={`Toggle ${columnName} = ${level}`}
                                            >
                                              {level}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        <div className="control-row control-row-group">
                          <button
                            type="button"
                            onClick={() => setSelectedRowsForGroups?.(groupLevelsInEditor)}
                            disabled={!groupVar || groupLevelsInEditor.length === 0}
                            className="control-btn"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedRowsForGroups?.([])}
                            disabled={!groupVar || groupLevelsInEditor.length === 0}
                            className="control-btn"
                          >
                            None
                          </button>
                        </div>

                        {!groupVar && (
                          <span className="group-controls-hint">Choose a column to enable group selection.</span>
                        )}

                        {groupVar && groupLevelsInEditor.length === 0 && (
                          <span className="group-controls-hint">No groups were found in this column.</span>
                        )}

                        {groupVar && groupLevelsInEditor.length > 0 && (
                          <>
                            <span className="group-controls-hint">Click multiple groups to keep them selected together.</span>
                            <div className="group-levels">
                              {groupLevelsInEditor.map((level) => {
                                const active = selectedGroupLevelSet.has(String(level));
                                return (
                                  <button
                                    key={`editor-group-level-${level}`}
                                    type="button"
                                    onClick={() => {
                                      if (typeof toggleInferentialGroupLevel === 'function') {
                                        toggleInferentialGroupLevel(level);
                                      } else if (setSelectedRowsForGroups) {
                                        const nextSet = new Set(selectedGroupLevelSet);
                                        const normalizedLevel = String(level);
                                        if (nextSet.has(normalizedLevel)) {
                                          nextSet.delete(normalizedLevel);
                                        } else {
                                          nextSet.add(normalizedLevel);
                                        }
                                        setSelectedRowsForGroups(Array.from(nextSet));
                                      }
                                    }}
                                    className={`group-chip ${active ? 'group-chip-active' : ''}`}
                                    title={`Toggle ${level}`}
                                  >
                                    {level}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </FloatingToolWindow>

            <FloatingToolWindow
              toolKey="clean"
              panelRef={(node) => { floatingToolRefs.current.clean = node; }}
              state={floatingTools.clean}
              title="Clean"
              subtitle="Run lightweight cleanup actions."
              icon={ShieldCheck}
              width={FLOATING_TOOL_PRESETS.clean.width}
              isRTheme={isRTheme}
              className="floating-tool-window-clean"
              onClose={closeFloatingTool}
              onFocus={bringFloatingToolToFront}
              onDragStart={startFloatingToolDrag}
              onResizeStart={startFloatingToolResize}
            >
              <div className="clean-floating-layout">
                <div className="toolbar-menu-section clean-panel-rows">
                  <span className="toolbar-menu-label">Rows To Clean</span>
                  <p className="toolbar-menu-copy">Select only the rows you want to clean. Cleaning no longer has to run on every scoped row.</p>
                  {cleanMissingRowInsights.rowsWithMissingCount > 0 ? (
                    <>
                      <span className="group-controls-hint">
                        {hasFilteredSubset
                          ? 'Detecting in selected visible rows after search/filter.'
                          : 'Detecting in selected rows in the current dataset.'}
                      </span>
                      <div className="clean-row-selection-toolbar">
                        <button
                          type="button"
                          onClick={selectAllCleanRows}
                          className="control-btn"
                          disabled={cleanMissingSelectableRows.length === 0}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={clearCleanRowsSelection}
                          className="control-btn"
                          disabled={cleanSelectedRows.length === 0}
                        >
                          None
                        </button>
                        <span className="clean-row-selection-summary">
                          {cleanSelectedRows.length.toLocaleString()} selected
                        </span>
                      </div>
                      <div className="clean-missing-row-list custom-scrollbar">
                        {cleanMissingRowInsights.previewRows.map(({ rowIndex, missingCount }) => {
                          const isSelected = cleanSelectedRowSet.has(rowIndex);
                          return (
                            <button
                              key={`clean-missing-row-${rowIndex}`}
                              type="button"
                              onClick={() => toggleCleanRowSelection(rowIndex)}
                              className={`clean-missing-row-item clean-row-picker ${isSelected ? 'is-selected' : ''}`}
                            >
                              <span className="clean-missing-row-name">Row {rowIndex + 1}</span>
                              <span className="clean-missing-row-meta">
                                {missingCount.toLocaleString()} missing {missingCount === 1 ? 'cell' : 'cells'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <span className="group-controls-hint">
                        {cleanMissingRowInsights.missingCellCount.toLocaleString()} missing cell(s) across {cleanMissingRowInsights.rowsWithMissingCount.toLocaleString()} row(s) in a scope of {cleanMissingRowInsights.scopedRowCount.toLocaleString()} row(s).
                      </span>
                      {cleanMissingRowInsights.hasMoreRows && (
                        <span className="group-controls-hint">
                          Showing the first {cleanMissingRowInsights.previewRows.length.toLocaleString()} rows with missing values.
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="toolbar-quality-empty">No missing values found in the active row scope.</div>
                  )}
                </div>

                <div className="toolbar-menu-section clean-panel-actions">
                  <span className="clean-actions-title">
                    <Brush size={12} />
                    <span>Clean Actions</span>
                  </span>
                  <p className="toolbar-menu-copy">Choose a method, then run cleaning only on the selected rows.</p>
                  {cleanMissingRowInsights.rowsWithMissingCount > 0 ? (
                    <>
                      <div className="control-group">
                        <span className="group-controls-label">Method</span>
                        <AyuSelect
                          value={cleanMissingMode}
                          onChange={setCleanMissingMode}
                          options={CLEAN_MISSING_MODE_OPTIONS}
                          className="group-select"
                          isRTheme={isRTheme}
                        />
                      </div>
                      {cleanMissingMode === 'ml_prediction' && (
                        <div className="control-group">
                          <span className="group-controls-label">Label / group column</span>
                          <AyuSelect
                            value={cleanMissingGroupColumn}
                            onChange={setCleanMissingGroupColumn}
                            options={cleanMissingGroupOptions}
                            className="group-select"
                            isRTheme={isRTheme}
                          />
                        </div>
                      )}
                      <span className="group-controls-hint">
                        Running on {cleanSelectedRows.length.toLocaleString()} selected row(s).
                        {cleanMissingMode === 'ml_prediction'
                          ? ` Same-label training: ${cleanMissingGroupColumn || 'automatic detection'}${!cleanMissingGroupColumn ? ' (choose the label matching your subject when several labels exist)' : ''}.`
                          : ''}
                      </span>
                      {cleanMissingMode === 'ml_prediction' && (
                        <span className="group-controls-hint">
                          Runs the local background prediction model and fills only the selected missing cells.
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => cleanMissingValues?.({
                          columns: cleanMissingTargetColumns,
                          mode: cleanMissingMode,
                          groupColumn: cleanMissingGroupColumn,
                          rows: cleanSelectedRows,
                          scopeRowIndices: cleanCandidateRowIndices
                        })}
                        disabled={isApplyingDplyrTidyr || cleanMissingTargetColumns.length === 0 || cleanSelectedRows.length === 0}
                        className="control-btn control-btn-danger toolbar-menu-action clean-actions-run-btn disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ShieldCheck size={12} /> {isApplyingDplyrTidyr ? 'Running...' : cleanMissingActionLabel}
                      </button>
                    </>
                  ) : (
                    <div className="toolbar-quality-empty">Select rows with missing values to enable actions.</div>
                  )}
                </div>
              </div>
            </FloatingToolWindow>

            <FloatingToolWindow
              toolKey="columns"
              panelRef={(node) => { floatingToolRefs.current.columns = node; }}
              state={floatingTools.columns}
              title="Columns"
              subtitle="Manage structure without pushing the table down."
              icon={Columns}
              width={FLOATING_TOOL_PRESETS.columns.width}
              isRTheme={isRTheme}
              className="floating-tool-window-columns"
              onClose={closeFloatingTool}
              onFocus={bringFloatingToolToFront}
              onDragStart={startFloatingToolDrag}
              onResizeStart={startFloatingToolResize}
            >
              <div className="toolbar-menu-section">
                <span className="toolbar-menu-label">Column Tools</span>
                <div className="columns-flyout-top">
                  <div className="columns-flyout-actions">
                    <button
                      type="button"
                      onClick={selectAllColumns}
                      className="columns-flyout-link"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllColumns}
                      className="columns-flyout-link"
                    >
                      None
                    </button>
                    <span className={`columns-flyout-meta ${isRTheme ? 'text-slate-300' : 'text-slate-400'}`}>
                      {selectedColumns.length}/{columns.length} selected · Numeric {numericColumns.length} · Categorical {categoricalColumns.length}
                    </span>
                  </div>
                </div>

                <div className="columns-flyout-grid">
                  {columns.map((col) => {
                    const columnColor = columnColors?.[col];
                    const columnLabel = col === '' ? '(empty name)' : col;
                    return (
                      <div
                        key={`view-col-${col}`}
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={(event) => {
                          event.stopPropagation();
                          clearColumnDragPreview();
                          setDraggedColumnName(col);
                          setDragOverColumnName('');
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', col);
                          if (typeof document !== 'undefined' && typeof event.dataTransfer.setDragImage === 'function') {
                            const preview = document.createElement('div');
                            preview.textContent = columnLabel;
                            preview.setAttribute('aria-hidden', 'true');
                            preview.style.cssText = [
                              'position: fixed',
                              'top: -1000px',
                              'left: -1000px',
                              'z-index: 99999',
                              'display: flex',
                              'align-items: center',
                              'width: 220px',
                              'height: 42px',
                              'box-sizing: border-box',
                              'padding: 0 14px',
                              'border: 1px solid rgba(148, 163, 184, 0.28)',
                              'border-radius: 10px',
                              'background: #1c1d1e',
                              'color: #e9feff',
                              'font: 600 12px/1.2 system-ui, sans-serif',
                              'white-space: nowrap',
                              'overflow: hidden',
                              'text-overflow: ellipsis',
                              'box-shadow: 0 12px 28px rgba(0, 0, 0, 0.42)',
                              'pointer-events: none'
                            ].join(';');
                            document.body.appendChild(preview);
                            columnDragPreviewRef.current = preview;
                            event.dataTransfer.setDragImage(preview, 18, 21);
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedColumnName('');
                          setDragOverColumnName('');
                          clearColumnDragPreview();
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'move';
                          if (draggedColumnName && draggedColumnName !== col) setDragOverColumnName(col);
                        }}
                        onDragLeave={() => {
                          if (dragOverColumnName === col) setDragOverColumnName('');
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const sourceColumn = event.dataTransfer.getData('text/plain') || draggedColumnName;
                          if (sourceColumn !== col && sourceColumn !== null && sourceColumn !== undefined) {
                            void handleReorderColumns?.({ sourceColumn, targetColumn: col });
                          }
                          setDraggedColumnName('');
                          setDragOverColumnName('');
                          clearColumnDragPreview();
                        }}
                        onClick={() => toggleColumn(col)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleColumn(col);
                          }
                        }}
                        className={`columns-flyout-chip cursor-grab active:cursor-grabbing transition-all duration-150 ${draggedColumnName === col ? 'scale-[0.98] opacity-45 ring-2 ring-sky-400/60 shadow-lg' : ''} ${dragOverColumnName === col ? 'scale-[1.02] ring-2 ring-cyan-400/80 shadow-[0_0_18px_rgba(34,211,238,0.24)]' : ''} ${selectedColumns.includes(col)
                          ? (isRTheme ? 'bg-cyan-900/25 border-cyan-700/50' : 'bg-sky-900/25 border-sky-700/40')
                          : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/70'
                          } ${selectedColumns.includes(col) ? 'is-selected' : ''}`}
                      >
                        <GripVertical size={14} className={`shrink-0 ${dragOverColumnName === col ? 'text-cyan-300' : 'text-slate-500'}`} aria-hidden="true" />
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedColumns.includes(col)
                          ? (isRTheme ? 'bg-cyan-400 border-cyan-400' : 'bg-sky-500 border-sky-500')
                          : 'bg-[#020617] border-slate-600'
                          }`}>
                          {selectedColumns.includes(col) && <CheckSquare size={10} className="text-white" />}
                        </div>
                        <span className="columns-flyout-chip-label" title={col === '' ? 'Unnamed column (empty header)' : col}>{columnLabel}</span>
                        <div
                          className="ml-auto flex items-center gap-1"
                          onClick={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <input
                            type="color"
                            className="col-color-input"
                            value={columnColor || '#94a3b8'}
                            onChange={(event) => setColumnColor(col, event.target.value)}
                            aria-label={`Set color for ${columnLabel}`}
                            title={columnColor ? `Column color: ${columnColor}` : `Set color for ${columnLabel}`}
                            style={columnColor ? { backgroundColor: columnColor, borderColor: columnColor } : undefined}
                          />
                          {columnColor && (
                            <button
                              type="button"
                              onClick={() => clearColumnColor(col)}
                              className={`col-color-clear ${isRTheme ? 'text-slate-200' : 'text-slate-600 dark:text-slate-300'}`}
                              title="Clear column color"
                            >
                              <X size={9} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </FloatingToolWindow>

          </div>

          {viewerNotice && (
            <div className={`viewer-notice viewer-notice-compact mx-3 mt-2 flex items-center gap-2 px-3 py-2 text-[12px] font-semibold border ${viewerNotice.type === 'success'
              ? (isRTheme
                ? 'bg-emerald-900/16 text-emerald-300 border-emerald-800/25'
                : 'bg-emerald-50/85 text-emerald-700 border-emerald-100 dark:bg-emerald-900/18 dark:text-emerald-300 dark:border-emerald-900/35')
              : (isRTheme
                ? 'bg-rose-900/16 text-rose-300 border-rose-800/25'
                : 'bg-red-50/85 text-red-700 border-red-100 dark:bg-rose-900/18 dark:text-rose-300 dark:border-rose-900/35')
              }`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${viewerNotice.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
                }`} />
              {viewerNotice.text}
            </div>
          )}
        </>
      )}


      <div className="flex-1 min-w-0 min-h-0 overflow-hidden relative flex flex-col">
        {effectiveTab === 'view' && (
          <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
            {renderDataTable()}
          </div>
        )}

        {effectiveTab === 'manipulate' && (
          <div className={`flex-1 min-h-0 flex overflow-hidden ${isStudioWindow ? 'flex-col' : 'flex-col xl:flex-row'}`}>
            {!isStudioWindow && (
              <div className={`studio-preview-panel flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden border-b xl:border-b-0 xl:border-r ${isRTheme ? 'border-cyan-900/25' : 'border-slate-200 dark:border-slate-800'
                }`}>
                <div className={`studio-preview-header px-4 py-2 border-b ${isRTheme
                  ? 'border-cyan-900/25 bg-[#0a1120]/70'
                  : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0d1117]/50'
                  }`}>
                  <p className={`text-[11px] font-semibold ${isRTheme ? 'text-cyan-200' : 'text-slate-600 dark:text-slate-300'}`}>
                    Live Data Preview
                  </p>
                  <p className={`text-[10px] ${isRTheme ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    Data updates as you apply dplyr/tidyr operations.
                  </p>
                </div>
                {renderDataTable()}
              </div>
            )}

            <div className={`w-full ${isStudioWindow ? 'h-full studio-window-scroll studio-window-content px-5 py-5' : 'xl:w-[440px] p-6'} shrink-0 min-h-0 overflow-y-auto studio-surface space-y-6`}>
              <div className={`studio-banner rounded-none border px-5 py-4 ${isRTheme
                ? 'border-cyan-900/45 bg-gradient-to-br from-[#0b1220]/95 via-[#102137]/88 to-[#0a1628]/92'
                : 'border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 dark:from-slate-900/80 dark:via-slate-900/65 dark:to-slate-950/70'
                }`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className={`text-sm font-black tracking-tight ${isRTheme ? 'text-cyan-100' : 'text-slate-800 dark:text-slate-100'}`}>
                      dplyr Studio Operations
                    </h3>
                    <p className={`text-xs ${isRTheme ? 'text-slate-300/80' : 'text-slate-500 dark:text-slate-400'}`}>
                      Modern academic controls with background R operations. Open one or more panels and run transformations instantly.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectGroupByEnabled((prev) => !prev)}
                      aria-pressed={selectGroupByEnabled}
                      title={selectGroupByEnabled ? 'Disable global Group By for Studio operations' : 'Enable global Group By for Studio operations'}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-colors ${isRTheme
                        ? (selectGroupByEnabled
                          ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-100'
                          : 'bg-[#0b1324] border-cyan-900/45 text-cyan-200/90 hover:bg-[#12203a]')
                        : (selectGroupByEnabled
                          ? 'bg-cyan-100 border-cyan-400/50 text-cyan-700 dark:border-cyan-500/45 dark:bg-cyan-900/30 dark:text-cyan-200'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')
                        }`}
                    >
                      <Database size={13} />
                      Group By {selectGroupByEnabled ? 'On' : 'Off'}
                    </button>
                    {selectGroupByEnabled && (
                      <div className="inline-flex items-center gap-2 rounded-full border px-2 py-1 studio-groupby-selector-shell">
                        <span className="studio-groupby-selector-label">Group Variable</span>
                        <AyuSelect
                          isRTheme={isRTheme}
                          className="studio-groupby-select"
                          value={resolvedGroupByColumns[0] || ''}
                          onChange={handleStudioGroupVariableChange}
                          options={[
                            { label: 'Choose variable', value: '' },
                            ...columns.map((columnName) => ({ label: columnName, value: columnName }))
                          ]}
                          disabled={columns.length === 0}
                        />
                      </div>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${isRTheme
                      ? 'bg-cyan-900/35 border border-cyan-700/35 text-cyan-100'
                      : 'bg-slate-100 border border-slate-200 text-slate-600 dark:bg-slate-800/90 dark:border-slate-700 dark:text-slate-200'
                      }`}>
                      {studioPanelsTotal} Panels
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${isRTheme
                      ? 'bg-emerald-900/25 border border-emerald-700/35 text-emerald-100'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-200'
                      }`}>
                      {openStudioPanelsCount} Open
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${isRTheme
                      ? 'bg-indigo-900/30 border border-indigo-700/35 text-indigo-100'
                      : 'bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-800/50 dark:text-indigo-200'
                      }`}>
                      {columns.length} Variables
                    </span>
                    {selectGroupByEnabled && (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${isRTheme
                        ? 'bg-cyan-900/30 border border-cyan-700/35 text-cyan-100'
                        : 'bg-cyan-50 border border-cyan-200 text-cyan-700 dark:bg-cyan-950/30 dark:border-cyan-800/50 dark:text-cyan-200'
                        }`}>
                        Group By On
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid">


                <StudioToolWrapper open={studioPanels.merge}>
                  <div className="studio-card-wrapper">
                    <div className="studio-card studio-card-merge rounded-none border p-4">
                      <button
                        type="button"
                        onClick={() => toggleStudioPanel('merge')}
                        aria-expanded={studioPanels.merge}
                        className="studio-card-head w-full flex items-center justify-between gap-2"
                      >
                        <span className="studio-head-main inline-flex items-center gap-2">
                          <span className="studio-icon-wrap">
                            <Layers size={16} className={isRTheme ? 'text-cyan-200' : 'text-sky-700 dark:text-sky-300'} />
                          </span>
                          <span className="min-w-0">
                            <span className={`studio-head-title block font-bold ${isRTheme ? 'text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>Merge Columns (Vertical)</span>
                            <span className={`studio-head-subtitle block ${isRTheme ? 'text-slate-300/75' : 'text-slate-500 dark:text-slate-400'}`}>Stack values into one research-ready variable</span>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className={`studio-status-pill ${studioPanels.merge ? 'studio-status-pill-open' : ''}`}>
                            {studioPanels.merge ? 'Open' : 'Closed'}
                          </span>
                          <ChevronDown size={16} className={`studio-toggle-chevron ${studioPanels.merge ? 'is-open' : ''} ${isRTheme ? 'text-cyan-200' : 'text-slate-500'}`} />
                        </span>
                      </button>
                    </div>
                    <StudioPanelCollapse open={studioPanels.merge} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <AyuSelect isRTheme={isRTheme} value={mergeColumnA} onChange={setMergeColumnA} options={[{ label: 'Col A', value: '' }, ...columns.map(c => ({ label: c, value: c }))]} />
                        <AyuSelect isRTheme={isRTheme} value={mergeColumnB} onChange={setMergeColumnB} options={[{ label: 'Col B', value: '' }, ...columns.map(c => ({ label: c, value: c }))]} />
                      </div>
                      <AyuSelect isRTheme={isRTheme} value={mergeMode} onChange={setMergeMode} options={[{ label: 'Prefer A then B (row-wise)', value: 'stack_ab' }, { label: 'Prefer B then A (row-wise)', value: 'stack_ba' }]} />
                      <input className="input-std studio-var-control" placeholder="New Column Name" value={mergeColumnName} onChange={(e) => setMergeColumnName(e.target.value)} />
                      <p className={`text-[10px] ${isRTheme ? 'text-slate-300/80' : 'text-slate-500 dark:text-slate-400'}`}>
                        Creates a new column by taking the first non-empty value from the preferred column, then filling from the other column.
                      </p>
                      <button
                        onClick={handleMergeColumns}
                        disabled={isApplyingDplyrTidyr}
                        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isApplyingDplyrTidyr ? 'Running...' : 'Merge'}
                      </button>                                </StudioPanelCollapse>
                  </div>
                </StudioToolWrapper>

                <StudioToolWrapper open={studioPanels.reshape}>
                  <div className="studio-card-wrapper">
                    <div className="studio-card studio-card-reshape rounded-none border p-4">
                      <button
                        type="button"
                        onClick={() => toggleStudioPanel('reshape')}
                        aria-expanded={studioPanels.reshape}
                        className="studio-card-head w-full flex items-center justify-between gap-2"
                      >
                        <span className="studio-head-main inline-flex items-center gap-2">
                          <span className="studio-icon-wrap">
                            <LayoutGrid size={16} className={isRTheme ? 'text-cyan-200' : 'text-emerald-700 dark:text-emerald-300'} />
                          </span>
                          <span className="min-w-0">
                            <span className={`studio-head-title block font-bold ${isRTheme ? 'text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>Reshape (Wide → Long)</span>
                            <span className={`studio-head-subtitle block ${isRTheme ? 'text-slate-300/75' : 'text-slate-500 dark:text-slate-400'}`}>Prepare repeated-measures and tidy structures</span>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className={`studio-status-pill ${studioPanels.reshape ? 'studio-status-pill-open' : ''}`}>
                            {studioPanels.reshape ? 'Open' : 'Closed'}
                          </span>
                          <ChevronDown size={16} className={`studio-toggle-chevron ${studioPanels.reshape ? 'is-open' : ''} ${isRTheme ? 'text-cyan-200' : 'text-slate-500'}`} />
                        </span>
                      </button>
                    </div>
                    <StudioPanelCollapse open={studioPanels.reshape} className="space-y-3">
                      <AyuSelect isRTheme={isRTheme} value={reshapeIdColumn} onChange={setReshapeIdColumn} options={[{ label: 'ID Column', value: '' }, ...columns.map(c => ({ label: c, value: c }))]} />
                      <input className="input-std studio-var-control" placeholder="Prefix (optional)" value={reshapePrefix} onChange={(e) => setReshapePrefix(e.target.value)} />
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input-std studio-var-control" placeholder="Factor Name" value={reshapeFactorName} onChange={(e) => setReshapeFactorName(e.target.value)} />
                        <input className="input-std studio-var-control" placeholder="Value Name" value={reshapeValueName} onChange={(e) => setReshapeValueName(e.target.value)} />
                      </div>
                      <button
                        onClick={handleReshapeWideToLong}
                        disabled={isApplyingDplyrTidyr}
                        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isApplyingDplyrTidyr ? 'Running...' : 'Reshape'}
                      </button>                                </StudioPanelCollapse>
                  </div>
                </StudioToolWrapper>

                <StudioToolWrapper open={studioPanels.separate}>
                  <div className="studio-card-wrapper">
                    <div className="studio-card studio-card-separate rounded-none border p-4">
                      <button
                        type="button"
                        onClick={() => toggleStudioPanel('separate')}
                        aria-expanded={studioPanels.separate}
                        className="studio-card-head w-full flex items-center justify-between gap-2"
                      >
                        <span className="studio-head-main inline-flex items-center gap-2">
                          <span className="studio-icon-wrap">
                            <FileText size={16} className={isRTheme ? 'text-cyan-200' : 'text-teal-700 dark:text-teal-300'} />
                          </span>
                          <span className="min-w-0">
                            <span className={`studio-head-title block font-bold ${isRTheme ? 'text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>Separate Column</span>
                            <span className={`studio-head-subtitle block ${isRTheme ? 'text-slate-300/75' : 'text-slate-500 dark:text-slate-400'}`}>Split one column into two or more named columns</span>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className={`studio-status-pill ${studioPanels.separate ? 'studio-status-pill-open' : ''}`}>
                            {studioPanels.separate ? 'Open' : 'Closed'}
                          </span>
                          <ChevronDown size={16} className={`studio-toggle-chevron ${studioPanels.separate ? 'is-open' : ''} ${isRTheme ? 'text-cyan-200' : 'text-slate-500'}`} />
                        </span>
                      </button>
                    </div>
                    <StudioPanelCollapse open={studioPanels.separate} className="space-y-3">
                      <AyuSelect
                        isRTheme={isRTheme}
                        value={separateSourceColumn}
                        onChange={setSeparateSourceColumn}
                        options={[{ label: 'Column to split', value: '' }, ...columns.map((c) => ({ label: c, value: c }))]}
                      />
                      <div className={`rounded-lg border px-3 py-2 text-[11px] ${isRTheme ? 'border-cyan-900/45 bg-[#0b1324] text-cyan-100/85' : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span>Values in selected column</span>
                          <span className="font-semibold">{separateSourceStats.nonEmptyCount}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 opacity-80">
                          <span>Unique values</span>
                          <span>{separateSourceStats.uniqueCount}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 opacity-70">
                          <span>Total rows</span>
                          <span>{separateSourceStats.totalRows}</span>
                        </div>
                      </div>
                      <label className={`flex flex-col gap-1 text-[11px] font-semibold ${isRTheme ? 'text-slate-300/85' : 'text-slate-600 dark:text-slate-400'}`}>
                        <span>Number of new columns</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => syncSeparateOutputs(separateResolvedOutputCount - 1)}
                            disabled={separateResolvedOutputCount <= 2}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isRTheme ? 'border-cyan-900/45 bg-[#0b1324] text-cyan-100 hover:bg-[#12203a]' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}`}
                            aria-label="Decrease output columns"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min={2}
                            max={12}
                            className="input-std studio-var-control text-center"
                            value={separateResolvedOutputCount}
                            onChange={(e) => syncSeparateOutputs(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => syncSeparateOutputs(separateResolvedOutputCount + 1)}
                            disabled={separateResolvedOutputCount >= 12}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isRTheme ? 'border-cyan-900/45 bg-[#0b1324] text-cyan-100 hover:bg-[#12203a]' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}`}
                            aria-label="Increase output columns"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {separateOutputNameFields.map((name, index) => (
                          <label
                            key={`separate-output-name-${index}`}
                            className={`flex flex-col gap-1 text-[11px] font-semibold ${isRTheme ? 'text-slate-300/85' : 'text-slate-600 dark:text-slate-400'}`}
                          >
                            <span>New column {index + 1}</span>
                            <input
                              className="input-std studio-var-control"
                              placeholder={`part_${index + 1}`}
                              value={name}
                              onChange={(e) => handleSeparateOutputNameChange(index, e.target.value)}
                            />
                          </label>
                        ))}
                      </div>
                      <label className={`flex flex-col gap-1 text-[11px] font-semibold ${isRTheme ? 'text-slate-300/85' : 'text-slate-600 dark:text-slate-400'}`}>
                        <span>Separator</span>
                        <input
                          className="input-std studio-var-control"
                          placeholder=" "
                          value={separateSeparator}
                          onChange={(e) => setSeparateSeparator(e.target.value)}
                        />
                      </label>
                      <label className={`flex items-center gap-2 text-[11px] font-semibold ${isRTheme ? 'text-slate-300/85' : 'text-slate-600 dark:text-slate-400'}`}>
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={Boolean(separateRemoveOriginal)}
                          onChange={(e) => setSeparateRemoveOriginal(e.target.checked)}
                        />
                        Remove original source column
                      </label>
                      <button
                        onClick={() => handleSeparateColumn?.()}
                        disabled={isApplyingDplyrTidyr}
                        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isApplyingDplyrTidyr ? 'Running...' : 'Separate'}
                      </button>                                </StudioPanelCollapse>
                  </div>
                </StudioToolWrapper>

                <StudioToolWrapper open={studioPanels.filter}>
                  <div className="studio-card-wrapper">
                    <div className="studio-card studio-card-filter rounded-none border p-4">
                      <button
                        type="button"
                        onClick={() => toggleStudioPanel('filter')}
                        aria-expanded={studioPanels.filter}
                        className="studio-card-head w-full flex items-center justify-between gap-2"
                      >
                        <span className="studio-head-main inline-flex items-center gap-2">
                          <span className="studio-icon-wrap">
                            <Filter size={16} className={isRTheme ? 'text-cyan-200' : 'text-amber-700 dark:text-amber-300'} />
                          </span>
                          <span className="min-w-0">
                            <span className={`studio-head-title block font-bold ${isRTheme ? 'text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>Filter Rows</span>
                            <span className={`studio-head-subtitle block ${isRTheme ? 'text-slate-300/75' : 'text-slate-500 dark:text-slate-400'}`}>Filter by names, values, or numeric intervals</span>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className={`studio-status-pill ${studioPanels.filter ? 'studio-status-pill-open' : ''}`}>
                            {studioPanels.filter ? 'Open' : 'Closed'}
                          </span>
                          <ChevronDown size={16} className={`studio-toggle-chevron ${studioPanels.filter ? 'is-open' : ''} ${isRTheme ? 'text-cyan-200' : 'text-slate-500'}`} />
                        </span>
                      </button>
                    </div>
                    <StudioPanelCollapse open={studioPanels.filter} className="space-y-3">
                      <AyuSelect isRTheme={isRTheme} value={filterColumn} onChange={setFilterColumn} options={[{ label: 'Column to Filter', value: '' }, ...columns.map(c => ({ label: c, value: c }))]} />
                      <AyuSelect isRTheme={isRTheme} value={filterOperator} onChange={setFilterOperator} options={filterOperatorOptions} />
                      {filterNeedsValue && (
                        <input
                          className="input-std studio-var-control"
                          type={isFilterNumeric ? 'number' : 'text'}
                          placeholder={isFilterNumeric ? 'Value' : 'Value or text'}
                          value={filterValue}
                          onChange={(e) => setFilterValue(e.target.value)}
                        />
                      )}
                      {filterNeedsSecondValue && (
                        <input
                          className="input-std studio-var-control"
                          type="number"
                          placeholder="Upper bound"
                          value={filterValue2}
                          onChange={(e) => setFilterValue2(e.target.value)}
                        />
                      )}
                      {!isFilterNumeric && filterValueOptions.length > 0 && (
                        <div className="space-y-2">
                          <p className={`text-[10px] font-semibold ${isRTheme ? 'text-slate-300/80' : 'text-slate-500 dark:text-slate-400'}`}>
                            Quick values (click to add/remove)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {filterValueOptions.map((value) => {
                              const active = selectedFilterValues.includes(value);
                              return (
                                <button
                                  key={`filter-value-${value}`}
                                  type="button"
                                  onClick={() => toggleFilterValue(value)}
                                  className={`text-[10px] px-2 py-1 rounded-full border font-semibold transition-colors ${active
                                    ? (isRTheme
                                      ? 'bg-cyan-500/20 border-cyan-400/70 text-cyan-100'
                                      : 'bg-blue-100 border-blue-300 text-blue-700')
                                    : (isRTheme
                                      ? 'bg-[#0b1220] border-cyan-900/40 text-slate-200 hover:border-cyan-600/60'
                                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')
                                    }`}
                                >
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <p className={`text-[10px] ${isRTheme ? 'text-slate-300/80' : 'text-slate-500 dark:text-slate-400'}`}>
                        {isFilterNumeric
                          ? 'Numeric columns support ranges and comparison operators.'
                          : 'Text columns support contains, starts/ends, and comma-separated lists.'}
                      </p>
                      <button
                        onClick={handleFilterRows}
                        disabled={isApplyingDplyrTidyr}
                        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isApplyingDplyrTidyr ? 'Running...' : 'Apply Filter'}
                      </button>                                </StudioPanelCollapse>
                  </div>
                </StudioToolWrapper>

                <StudioToolWrapper open={studioPanels.select}>
                  <div className="studio-card-wrapper">
                    <div className="studio-card studio-card-select rounded-none border p-4">
                      <button
                        type="button"
                        onClick={() => toggleStudioPanel('select')}
                        aria-expanded={studioPanels.select}
                        className="studio-card-head w-full flex items-center justify-between gap-2"
                      >
                        <span className="studio-head-main inline-flex items-center gap-2">
                          <span className="studio-icon-wrap">
                            <Columns size={16} className={isRTheme ? 'text-cyan-200' : 'text-indigo-700 dark:text-indigo-300'} />
                          </span>
                          <span className="min-w-0">
                            <span className={`studio-head-title block font-bold ${isRTheme ? 'text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>Keep / Drop Columns</span>
                            <span className={`studio-head-subtitle block ${isRTheme ? 'text-slate-300/75' : 'text-slate-500 dark:text-slate-400'}`}>Use the current selection as a tidy subset</span>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className={`studio-status-pill ${studioPanels.select ? 'studio-status-pill-open' : ''}`}>
                            {studioPanels.select ? 'Open' : 'Closed'}
                          </span>
                          <ChevronDown size={16} className={`studio-toggle-chevron ${studioPanels.select ? 'is-open' : ''} ${isRTheme ? 'text-cyan-200' : 'text-slate-500'}`} />
                        </span>
                      </button>
                    </div>
                    <StudioPanelCollapse open={studioPanels.select} className="space-y-3">
                      <div className="studio-drop-panel">
                        <div className="studio-drop-header">
                          <span className={`studio-drop-title ${isRTheme ? 'text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}>
                            Selected columns: {selectedColumns.length}/{columns.length}
                          </span>
                          <div className="studio-segment">
                            <button
                              onClick={selectAllColumns}
                              disabled={isApplyingDplyrTidyr}
                              className="studio-segment-btn"
                            >
                              Select All
                            </button>
                            <button
                              onClick={deselectAllColumns}
                              disabled={isApplyingDplyrTidyr}
                              className="studio-segment-btn"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="studio-drop-actions">
                          <button
                            onClick={handleKeepSelectedColumns}
                            disabled={isApplyingDplyrTidyr || selectedColumns.length === 0}
                            className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Keep Selected
                          </button>
                          <button
                            onClick={handleDeleteSelectedVariables}
                            disabled={isApplyingDplyrTidyr || selectedColumns.length === 0 || selectedColumns.length >= columns.length}
                            className="btn-danger w-full disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Drop Selected
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddRow?.({})}
                            disabled={isApplyingDplyrTidyr || columns.length === 0}
                            className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Add Row
                          </button>
                        </div>
                      </div>                                </StudioPanelCollapse>
                  </div>
                </StudioToolWrapper>

                <StudioToolWrapper open={studioPanels.renameLevels}>
                  <div className="studio-card-wrapper">
                    <div className="studio-card rounded-none border p-4">
                      <button
                        type="button"
                        onClick={() => toggleStudioPanel('renameLevels')}
                        aria-expanded={studioPanels.renameLevels}
                        className="studio-card-head w-full flex items-center justify-between gap-2"
                      >
                        <span className="studio-head-main inline-flex items-center gap-2">
                          <span className="studio-icon-wrap">
                            <PencilLine size={16} className={isRTheme ? 'text-cyan-200' : 'text-slate-700 dark:text-slate-300'} />
                          </span>
                          <span className="min-w-0">
                            <span className={`studio-head-title block font-bold ${isRTheme ? 'text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>Rename Group Levels</span>
                            <span className={`studio-head-subtitle block ${isRTheme ? 'text-slate-300/75' : 'text-slate-500 dark:text-slate-400'}`}>Rename selected groups directly in the dataset</span>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className={`studio-status-pill ${studioPanels.renameLevels ? 'studio-status-pill-open' : ''}`}>
                            {studioPanels.renameLevels ? 'Open' : 'Closed'}
                          </span>
                          <ChevronDown size={16} className={`studio-toggle-chevron ${studioPanels.renameLevels ? 'is-open' : ''} ${isRTheme ? 'text-cyan-200' : 'text-slate-500'}`} />
                        </span>
                      </button>
                    </div>
                    <StudioPanelCollapse open={studioPanels.renameLevels} className="space-y-3">
                      <div className="studio-drop-panel">
                        <AyuSelect
                          isRTheme={isRTheme}
                          value={groupVar}
                          onChange={(val) => {
                            if (typeof setGroupVar === 'function') setGroupVar(val);
                            if (typeof setSelectedRowsForGroups === 'function') setSelectedRowsForGroups([]);
                            setGroupLevelRenameValue('');
                          }}
                          options={[
                            { label: 'Group column', value: '' },
                            ...groupCandidateColumns.map((columnName) => ({ label: columnName, value: columnName }))
                          ]}
                        />
                        {!groupVar && (
                          <span className="group-controls-hint">Choose a group column to enable level renaming.</span>
                        )}
                        {groupVar && groupLevelsInEditor.length === 0 && (
                          <span className="group-controls-hint">No groups were found in this column.</span>
                        )}
                        {groupVar && groupLevelsInEditor.length > 0 && (
                          <>
                            <span className={`studio-drop-title ${isRTheme ? 'text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}>
                              Select one or more groups, then apply rename.
                            </span>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                              <input
                                id="studio-group-level-rename-limit-input"
                                type="number"
                                min={1}
                                step={1}
                                value={groupLevelRenameLimit}
                                onChange={(event) => {
                                  const parsed = Number.parseInt(String(event.target.value || ''), 10);
                                  const safeLimit = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
                                  setGroupLevelRenameLimit(safeLimit);
                                }}
                                className="input-std studio-var-control text-center"
                                placeholder="N levels"
                                title="How many selected levels can be renamed in one apply"
                              />
                              <input
                                type="text"
                                value={groupLevelRenameValue}
                                onChange={(event) => setGroupLevelRenameValue(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key !== 'Enter') return;
                                  event.preventDefault();
                                  applyGroupLevelRename();
                                }}
                                placeholder="New level name"
                                className="input-std studio-var-control sm:col-span-2"
                              />
                              <button
                                type="button"
                                onClick={applyGroupLevelRename}
                                disabled={
                                  typeof handleRenameGroupLevels !== 'function'
                                  || isRenamingGroupLevels
                                  || renameTargetLevels.length === 0
                                  || String(groupLevelRenameValue || '').trim() === ''
                                }
                                className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {isRenamingGroupLevels ? 'Renaming...' : 'Apply Rename'}
                              </button>
                            </div>
                            <span className="group-controls-hint">
                              Rename targets from selected groups: {renameTargetLevels.length} (limit {Math.max(1, Number(groupLevelRenameLimit) || 1)}).
                            </span>
                            <div className="group-levels">
                              {groupLevelsInEditor.map((level) => {
                                const active = selectedGroupLevelSet.has(String(level));
                                return (
                                  <button
                                    key={`studio-group-level-${level}`}
                                    type="button"
                                    onClick={() => {
                                      if (typeof toggleInferentialGroupLevel === 'function') {
                                        toggleInferentialGroupLevel(level);
                                      } else if (setSelectedRowsForGroups) {
                                        const nextSet = new Set(selectedGroupLevelSet);
                                        const normalizedLevel = String(level);
                                        if (nextSet.has(normalizedLevel)) {
                                          nextSet.delete(normalizedLevel);
                                        } else {
                                          nextSet.add(normalizedLevel);
                                        }
                                        setSelectedRowsForGroups(Array.from(nextSet));
                                      }
                                    }}
                                    className={`group-chip ${active ? 'group-chip-active' : ''}`}
                                    title={`Toggle ${level}`}
                                  >
                                    {level}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>                                </StudioPanelCollapse>
                  </div>
                </StudioToolWrapper>

                <StudioToolWrapper open={studioPanels.arrange}>
                  <div className="studio-card-wrapper">
                    <div className="studio-card studio-card-arrange rounded-none border p-4">
                      <button
                        type="button"
                        onClick={() => toggleStudioPanel('arrange')}
                        aria-expanded={studioPanels.arrange}
                        className="studio-card-head w-full flex items-center justify-between gap-2"
                      >
                        <span className="studio-head-main inline-flex items-center gap-2">
                          <span className="studio-icon-wrap">
                            <ArrowUpDown size={16} className={isRTheme ? 'text-cyan-200' : 'text-sky-700 dark:text-sky-300'} />
                          </span>
                          <span className="min-w-0">
                            <span className={`studio-head-title block font-bold ${isRTheme ? 'text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>Arrange (Sort Rows)</span>
                            <span className={`studio-head-subtitle block ${isRTheme ? 'text-slate-300/75' : 'text-slate-500 dark:text-slate-400'}`}>Order rows by one column</span>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className={`studio-status-pill ${studioPanels.arrange ? 'studio-status-pill-open' : ''}`}>
                            {studioPanels.arrange ? 'Open' : 'Closed'}
                          </span>
                          <ChevronDown size={16} className={`studio-toggle-chevron ${studioPanels.arrange ? 'is-open' : ''} ${isRTheme ? 'text-cyan-200' : 'text-slate-500'}`} />
                        </span>
                      </button>
                    </div>
                    <StudioPanelCollapse open={studioPanels.arrange} className="space-y-3">
                      <AyuSelect isRTheme={isRTheme} value={sortColumn} onChange={setSortColumn} options={[{ label: 'Column to sort', value: '' }, ...columns.map(c => ({ label: c, value: c }))]} />
                      <div className="grid grid-cols-2 gap-2">
                        <AyuSelect isRTheme={isRTheme} value={sortDirection} onChange={setSortDirection} options={[{ label: 'Ascending', value: 'asc' }, { label: 'Descending', value: 'desc' }]} />
                        <AyuSelect isRTheme={isRTheme} value={sortMode} onChange={setSortMode} options={[{ label: 'Auto type', value: 'auto' }, { label: 'Numeric', value: 'numeric' }, { label: 'Text', value: 'text' }]} />
                      </div>
                      {selectGroupByEnabled && resolvedGroupByColumns.length === 1 && (
                        <p className={`text-[10px] ${isRTheme ? 'text-cyan-200/85' : 'text-cyan-700 dark:text-cyan-300'}`}>
                          Group By is ON: Arrange will auto-create one column per level of "{resolvedGroupByColumns[0]}".
                        </p>
                      )}
                      {selectGroupByEnabled && resolvedGroupByColumns.length > 1 && (
                        <p className={`text-[10px] ${isRTheme ? 'text-cyan-200/85' : 'text-cyan-700 dark:text-cyan-300'}`}>
                          Group By is ON with multiple variables: Arrange sorts within groups.
                        </p>
                      )}
                      <button
                        onClick={handleSortRows}
                        disabled={isApplyingDplyrTidyr}
                        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isApplyingDplyrTidyr ? 'Running...' : 'Sort Rows'}
                      </button>                                </StudioPanelCollapse>
                  </div>
                </StudioToolWrapper>

                <StudioToolWrapper open={studioPanels.summarize}>
                  <div className="studio-card-wrapper">
                    <div className="studio-card studio-card-summarize rounded-none border p-4">
                      <button
                        type="button"
                        onClick={() => toggleStudioPanel('summarize')}
                        aria-expanded={studioPanels.summarize}
                        className="studio-card-head w-full flex items-center justify-between gap-2"
                      >
                        <span className="studio-head-main inline-flex items-center gap-2">
                          <span className="studio-icon-wrap">
                            <Database size={16} className={isRTheme ? 'text-cyan-200' : 'text-indigo-700 dark:text-indigo-300'} />
                          </span>
                          <span className="min-w-0">
                            <span className={`studio-head-title block font-bold ${isRTheme ? 'text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>Summarize</span>
                            <span className={`studio-head-subtitle block ${isRTheme ? 'text-slate-300/75' : 'text-slate-500 dark:text-slate-400'}`}>Mean, median, and total by Group By levels</span>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className={`studio-status-pill ${studioPanels.summarize ? 'studio-status-pill-open' : ''}`}>
                            {studioPanels.summarize ? 'Open' : 'Closed'}
                          </span>
                          <ChevronDown size={16} className={`studio-toggle-chevron ${studioPanels.summarize ? 'is-open' : ''} ${isRTheme ? 'text-cyan-200' : 'text-slate-500'}`} />
                        </span>
                      </button>
                    </div>
                    <StudioPanelCollapse open={studioPanels.summarize} className="space-y-3">
                      {(!selectGroupByEnabled || resolvedGroupByColumns.length === 0) && (
                        <p className={`text-[11px] ${isRTheme ? 'text-amber-200/85' : 'text-amber-700 dark:text-amber-300'}`}>
                          Enable Group By from the header and choose a group variable first.
                        </p>
                      )}
                      {selectGroupByEnabled && resolvedGroupByColumns.length > 0 && (
                        <p className={`text-[11px] ${isRTheme ? 'text-cyan-200/85' : 'text-cyan-700 dark:text-cyan-300'}`}>
                          Grouping by: {resolvedGroupByColumns.join(', ')}
                        </p>
                      )}
                      <AyuSelect
                        isRTheme={isRTheme}
                        value={groupBySummaryFn}
                        onChange={(value) => setGroupBySummaryFn?.(String(value || 'mean'))}
                        options={[
                          { label: 'Mean', value: 'mean' },
                          { label: 'Median', value: 'median' },
                          { label: 'Total (sum)', value: 'sum' },
                          { label: 'Count rows', value: 'count' }
                        ]}
                      />
                      {groupByNeedsSummaryColumn && (
                        <AyuSelect
                          isRTheme={isRTheme}
                          value={groupBySummaryColumn}
                          onChange={setGroupBySummaryColumn}
                          options={[{ label: 'Summary column', value: '' }, ...columns.map((c) => ({ label: c, value: c }))]}
                        />
                      )}
                      <input
                        className="input-std studio-var-control"
                        placeholder="Result name (optional)"
                        value={groupByResultName}
                        onChange={(e) => setGroupByResultName?.(e.target.value)}
                      />
                      <AyuSelect
                        isRTheme={isRTheme}
                        value={groupBySortDirection}
                        onChange={(value) => setGroupBySortDirection?.(String(value || 'desc'))}
                        options={[
                          { label: 'Sort by result (desc)', value: 'desc' },
                          { label: 'Sort by result (asc)', value: 'asc' }
                        ]}
                      />
                      <button
                        onClick={() => {
                          setGroupByOutputMode?.('summary_rows');
                          handleGroupBySummarise?.({ outputMode: 'summary_rows' });
                        }}
                        disabled={isApplyingDplyrTidyr || !selectGroupByEnabled || resolvedGroupByColumns.length === 0}
                        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isApplyingDplyrTidyr ? 'Running...' : 'Summarize Groups'}
                      </button>                                </StudioPanelCollapse>
                  </div>
                </StudioToolWrapper>

                <StudioToolWrapper open={studioPanels.distinct}>
                  <div className="studio-card-wrapper">
                    <div className="studio-card studio-card-distinct rounded-none border p-4">
                      <button
                        type="button"
                        onClick={() => toggleStudioPanel('distinct')}
                        aria-expanded={studioPanels.distinct}
                        className="studio-card-head w-full flex items-center justify-between gap-2"
                      >
                        <span className="studio-head-main inline-flex items-center gap-2">
                          <span className="studio-icon-wrap">
                            <Copy size={16} className={isRTheme ? 'text-cyan-200' : 'text-violet-700 dark:text-violet-300'} />
                          </span>
                          <span className="min-w-0">
                            <span className={`studio-head-title block font-bold ${isRTheme ? 'text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>Distinct (Remove Duplicates)</span>
                            <span className={`studio-head-subtitle block ${isRTheme ? 'text-slate-300/75' : 'text-slate-500 dark:text-slate-400'}`}>Deduplicate using selected columns</span>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className={`studio-status-pill ${studioPanels.distinct ? 'studio-status-pill-open' : ''}`}>
                            {studioPanels.distinct ? 'Open' : 'Closed'}
                          </span>
                          <ChevronDown size={16} className={`studio-toggle-chevron ${studioPanels.distinct ? 'is-open' : ''} ${isRTheme ? 'text-cyan-200' : 'text-slate-500'}`} />
                        </span>
                      </button>
                    </div>
                    <StudioPanelCollapse open={studioPanels.distinct} className="space-y-3">
                      <label className={`flex items-center gap-2 text-[11px] font-semibold ${isRTheme ? 'text-slate-300/85' : 'text-slate-600 dark:text-slate-400'}`}>
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={distinctUseSelected}
                          onChange={(e) => setDistinctUseSelected(e.target.checked)}
                        />
                        Use selected columns ({selectedColumns.length})
                      </label>
                      <label className={`flex items-center gap-2 text-[11px] font-semibold ${isRTheme ? 'text-slate-300/85' : 'text-slate-600 dark:text-slate-400'} ${!distinctUseSelected ? 'opacity-50' : ''}`}>
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={distinctKeepAll}
                          onChange={(e) => setDistinctKeepAll(e.target.checked)}
                          disabled={!distinctUseSelected}
                        />
                        Keep all columns
                      </label>
                      <button
                        onClick={handleDistinctRows}
                        disabled={isApplyingDplyrTidyr}
                        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isApplyingDplyrTidyr ? 'Running...' : 'Remove Duplicates'}
                      </button>                                </StudioPanelCollapse>
                  </div>
                </StudioToolWrapper>
              </div>

              <div className={`studio-bottom-shell rounded-none border px-4 py-3 flex flex-wrap items-center justify-start gap-3 ${isRTheme
                ? 'border-cyan-900/40 bg-[#0c162a]/85'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40'
                }`}>
                <p className={`text-xs font-semibold ${isRTheme ? 'text-slate-300/85' : 'text-slate-500 dark:text-slate-400'}`}>
                  Separate, grouped operations, rename levels, select, sort, deduplicate, merge, reshape, and filter run directly in the background.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {cellContextMenu && typeof document !== 'undefined' && createPortal(
        <div
          ref={cellContextMenuRef}
          className="fixed z-[10000] w-[264px] overflow-visible rounded-xl border border-zinc-700/80 bg-[#161616] p-1.5 text-zinc-200 shadow-2xl"
          style={{ left: `${cellContextMenu.left}px`, top: `${cellContextMenu.top}px` }}
          role="menu"
          aria-label="Cell actions"
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="relative overflow-visible">
            <div className="w-full">
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                onClick={() => {
                  if (cellContextView === 'txt') {
                    setCellContextView('main');
                    setContextDropdown(null);
                  } else {
                    setContextMenuTab('font');
                    setContextDropdown(null);
                    setCellContextView('txt');
                  }
                }}
              >
                <PencilLine size={14} /> TXT
              </button>

              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                onClick={() => void runCellContextAction('copy')}
              >
                <Copy size={14} /> Copy
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                onClick={() => void runCellContextAction('paste')}
              >
                <ClipboardPaste size={14} /> Paste
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                onClick={() => void runCellContextAction('cut')}
              >
                <Scissors size={14} /> Cut
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-zinc-300 transition-colors hover:bg-rose-950/50 hover:text-rose-200"
                onClick={() => void runCellContextAction('delete')}
              >
                <Trash2 size={14} /> Delete selection
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                onClick={() => void runCellContextAction('select-all')}
              >
                <CheckSquare size={14} /> Select all
              </button>

              <div className="my-1 border-t border-zinc-800" />

              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                onClick={() => void runCellContextAction('total-column')}
              >
                <Calculator size={14} /> Total column (Y)
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                onClick={() => void runCellContextAction('total-row')}
              >
                <Calculator size={14} /> Total row (X)
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                onClick={() => void runCellContextAction('color')}
              >
                <Brush size={14} /> Cell color
              </button>

              <div className="my-1 border-t border-zinc-800" />

            </div>

            {/* TXT Format Panel Subpanel */}
            <div
              ref={cellContextSubpanelRef}
              className={`absolute left-[calc(100%+8px)] top-0 z-10 w-[264px] rounded-xl border border-zinc-700/80 bg-[#161616] p-1.5 text-zinc-200 shadow-2xl backdrop-blur-md transition-all duration-200 ease-out ${cellContextView === 'txt' || cellContextView === 'color'
                ? 'translate-x-0 opacity-100'
                : '-translate-x-3 pointer-events-none opacity-0'
                }`}
            >
              <div className="px-1 py-1">

                {cellContextView === 'color' ? (
                  <div className="space-y-2.5">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Cell Color</span>
                    <div className="grid grid-cols-6 gap-1">
                      <button
                        type="button"
                        className="flex h-6 items-center justify-center rounded border border-zinc-700 bg-zinc-800 text-[9px] font-semibold text-zinc-300 transition-colors hover:bg-zinc-700"
                        onClick={clearCellColorForTarget}
                        title="Clear cell background color"
                      >
                        Auto
                      </button>
                      {CELL_COLOR_SWATCHES.map((color) => (
                        <button
                          key={`ctx-cell-color-${color}`}
                          type="button"
                          className="h-6 rounded border border-zinc-700/60 transition-all hover:scale-105 hover:border-zinc-400"
                          style={{ backgroundColor: color }}
                          onClick={() => applyCellColor(color)}
                          title={color}
                        />
                      ))}
                    </div>
                    {customCellColorSwatches.length > 0 && (
                      <div className="border-t border-zinc-800 pt-2">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Custom Colors</span>
                        <div className="grid grid-cols-6 gap-1">
                          {customCellColorSwatches.map((color) => (
                            <button
                              key={`ctx-custom-cell-color-${color}`}
                              type="button"
                              className="h-6 rounded border border-zinc-700/60 transition-all hover:scale-105 hover:border-zinc-400"
                              style={{ backgroundColor: color }}
                              onClick={() => applyCellColor(color)}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      className="flex w-full items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        openCustomCellColorPicker();
                      }}
                    >
                      Custom color
                    </button>
                  </div>
                ) : (
                  <>

                    {/* Format Segment Tabs: Font | Color | Align */}
                    <div className="mb-2 grid grid-cols-3 gap-1 rounded-lg bg-zinc-900/90 p-1 border border-zinc-800/80">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setContextMenuTab('font'); setContextDropdown(null); }}
                        className={`flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-semibold transition-all ${contextMenuTab === 'font'
                          ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/80'
                          : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                          }`}
                      >
                        <span>Font</span>
                        {contextMenuTab === 'font' && <span className="h-1 w-1 rounded-full bg-zinc-300 shadow-[0_0_4px_rgba(212,212,216,0.6)]" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setContextMenuTab('color'); setContextDropdown(null); }}
                        className={`flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-semibold transition-all ${contextMenuTab === 'color'
                          ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/80'
                          : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                          }`}
                      >
                        <span>Color</span>
                        {contextMenuTab === 'color' && <span className="h-1 w-1 rounded-full bg-zinc-300 shadow-[0_0_4px_rgba(212,212,216,0.6)]" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setContextMenuTab('align'); setContextDropdown(null); }}
                        className={`flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-semibold transition-all ${contextMenuTab === 'align'
                          ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/80'
                          : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                          }`}
                      >
                        <span>Align</span>
                        {contextMenuTab === 'align' && <span className="h-1 w-1 rounded-full bg-zinc-300 shadow-[0_0_4px_rgba(212,212,216,0.6)]" />}
                      </button>
                    </div>

                    {/* Font Tab */}
                    {contextMenuTab === 'font' && (
                      <div className="space-y-2">
                        {/* Font Family */}
                        <div className={`relative ${contextDropdown === 'family' ? 'z-30' : 'z-20'}`}>
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Font Family</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleContextDropdown('family', e);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition-all ${contextDropdown === 'family'
                              ? 'border-zinc-500 bg-zinc-800 text-zinc-100 shadow-md'
                              : 'border-zinc-700/60 bg-zinc-900/80 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60'
                              }`}
                          >
                            <span className="truncate" style={{ fontFamily: activeCellFormatting.fontFamily || undefined }}>
                              {CELL_FONT_FAMILY_OPTIONS.find(o => isFontFamilyOptionSelected(activeCellFormatting.fontFamily, o.value))?.label || (activeCellFormatting.fontFamily || 'Default')}
                            </span>
                            <ChevronDown size={12} className={`ml-1 shrink-0 transition-transform duration-150 ${contextDropdown === 'family' ? 'rotate-180' : ''}`} />
                          </button>
                          {contextDropdown === 'family' && (
                            <div className={`absolute left-0 right-0 z-50 max-h-56 overflow-y-auto space-y-0.5 rounded-lg border border-zinc-700/90 bg-[#141416] p-1 shadow-2xl custom-scrollbar ${contextDropdownPlacement === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                              {[{ label: 'Default', value: '' }, ...CELL_FONT_FAMILY_OPTIONS].map((opt) => {
                                const isSelected = isFontFamilyOptionSelected(activeCellFormatting.fontFamily, opt.value);
                                return (
                                  <button
                                    key={`ctx-ff-${opt.value || 'def'}`}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      applyCellFontStyle('fontFamily', opt.value, true);
                                      setContextDropdown(null);
                                    }}
                                    className={`flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-xs font-semibold transition-all ${isSelected
                                      ? 'border-zinc-600 bg-zinc-800 text-zinc-100 shadow-sm'
                                      : 'border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                                      }`}
                                  >
                                    <span style={{ fontFamily: opt.value || undefined }}>{opt.label}</span>
                                    {isSelected && <span className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 shadow-[0_0_6px_rgba(212,212,216,0.6)]" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Font Size */}
                        <div className={`relative ${contextDropdown === 'size' ? 'z-30' : 'z-10'}`}>
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Font Size</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleContextDropdown('size', e);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition-all ${contextDropdown === 'size'
                              ? 'border-zinc-500 bg-zinc-800 text-zinc-100 shadow-md'
                              : 'border-zinc-700/60 bg-zinc-900/80 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60'
                              }`}
                          >
                            <span>
                              {CELL_FONT_SIZE_OPTIONS.find(o => o.value === activeCellFormatting.fontSize)?.label || (activeCellFormatting.fontSize || 'Default (13 px)')}
                            </span>
                            <ChevronDown size={12} className={`ml-1 shrink-0 transition-transform duration-150 ${contextDropdown === 'size' ? 'rotate-180' : ''}`} />
                          </button>
                          {contextDropdown === 'size' && (
                            <div className={`absolute left-0 right-0 z-50 max-h-56 overflow-y-auto space-y-0.5 rounded-lg border border-zinc-700/90 bg-[#141416] p-1 shadow-2xl custom-scrollbar ${contextDropdownPlacement === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                              {[{ label: 'Default (13 px)', value: '' }, ...CELL_FONT_SIZE_OPTIONS].map((opt) => {
                                const isSelected = opt.value
                                  ? activeCellFormatting.fontSize === opt.value
                                  : (!activeCellFormatting.fontSize || activeCellFormatting.fontSize === '13px');
                                return (
                                  <button
                                    key={`ctx-fs-${opt.value || 'def'}`}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      applyCellFontStyle('fontSize', opt.value, true);
                                      setContextDropdown(null);
                                    }}
                                    className={`flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-xs font-semibold transition-all ${isSelected
                                      ? 'border-zinc-600 bg-zinc-800 text-zinc-100 shadow-sm'
                                      : 'border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                                      }`}
                                  >
                                    <span>{opt.label}</span>
                                    {isSelected && <span className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 shadow-[0_0_6px_rgba(212,212,216,0.6)]" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {contextMenuTab === 'color' && (
                      <div className="space-y-2.5">
                        <div>
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Text Color</span>
                          <div className="grid grid-cols-6 gap-1">
                            <button
                              type="button"
                              className={`flex h-6 items-center justify-center rounded border text-[9px] font-semibold transition-colors ${!activeCellFormatting.color
                                ? 'border-zinc-500 bg-zinc-700 text-zinc-100 ring-1 ring-zinc-400'
                                : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                applyCellTextStyle('color', '', true);
                              }}
                              title="Default text color"
                            >
                              Auto
                            </button>
                            {CELL_TEXT_COLOR_SWATCHES.map((color) => {
                              const isSelected = activeCellFormatting.color?.toLowerCase() === color.toLowerCase();
                              return (
                                <button
                                  key={`ctx-text-color-${color}`}
                                  type="button"
                                  className={`h-6 rounded border transition-all hover:scale-105 ${isSelected ? 'border-white ring-2 ring-white/50 scale-105' : 'border-zinc-700/60 hover:border-zinc-400'
                                    }`}
                                  style={{ backgroundColor: color }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    applyCellTextStyle('color', color, true);
                                  }}
                                  title={`Text color ${color}`}
                                />
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    )}

                    {contextMenuTab === 'align' && (
                      <div className="space-y-1">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Text Alignment</span>
                        {CELL_TEXT_ALIGN_OPTIONS.map(({ label, value, Icon }) => {
                          const isSelected = (activeCellFormatting.textAlign || 'left') === value;
                          return (
                            <button
                              key={`ctx-align-${value}`}
                              type="button"
                              className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${isSelected
                                ? 'border-zinc-600 bg-zinc-800 text-zinc-100 shadow-sm'
                                : 'border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                                }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                applyCellTextStyle('textAlign', value, true);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Icon size={13} />
                                <span>{label}</span>
                              </div>
                              {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 shadow-[0_0_6px_rgba(212,212,216,0.6)]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {cellColorPalette && typeof document !== 'undefined' && createPortal(
        <div
          ref={cellColorPaletteRef}
          className={`cell-color-popover ${isRTheme ? 'is-r-theme' : ''} ${isAyuTheme ? 'is-ayu-theme' : ''}`}
          style={{ left: `${cellColorPalette.left}px`, top: `${cellColorPalette.top}px` }}
          role="dialog"
          aria-label="Cell color palette"
        >
          <div className="cell-color-popover-grid">
            {CELL_COLOR_SWATCHES.map((color) => {
              const targetColor = activeCellColorTarget?.key
                ? (cellColors?.[activeCellColorTarget.key] || columnColors?.[activeCellColorTarget.columnName] || '')
                : '';
              const isActiveColor = String(targetColor).toLowerCase() === String(color).toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  className={`cell-color-swatch ${isActiveColor ? 'is-active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => applyCellColor(color)}
                  title={color}
                  aria-label={`Set cell color ${color}`}
                />
              );
            })}
          </div>
          {customCellColorSwatches.length > 0 && (
            <div className="cell-color-popover-custom">
              <span className="cell-color-popover-custom-label">Custom Colors</span>
              <div className="cell-color-popover-custom-grid">
                {customCellColorSwatches.map((color) => {
                  const targetColor = activeCellColorTarget?.key
                    ? (cellColors?.[activeCellColorTarget.key] || columnColors?.[activeCellColorTarget.columnName] || '')
                    : '';
                  const isActiveColor = String(targetColor).toLowerCase() === String(color).toLowerCase();
                  return (
                    <button
                      key={`custom-cell-color-${color}`}
                      type="button"
                      className={`cell-color-swatch ${isActiveColor ? 'is-active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => applyCellColor(color)}
                      title={color}
                      aria-label={`Set custom cell color ${color}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
          <div className="cell-color-popover-actions">
            <button
              type="button"
              className="cell-color-popover-btn"
              onClick={clearCellColorForTarget}
            >
              Clear
            </button>
            <button
              type="button"
              className="cell-color-popover-btn"
              onClick={openCustomCellColorPicker}
            >
              Custom
            </button>
          </div>
        </div>,
        document.body
      )}

      <input
        ref={cellColorPickerInputRef}
        type="color"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={applyCellColorFromPicker}
      />

      <style>{`
        @keyframes explorer-fade-up {
          0% { opacity: 0; transform: translateY(10px) scale(0.99); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes explorer-sheen {
          0% { transform: translateX(-30%); opacity: 0; }
          15% { opacity: 0.4; }
          50% { opacity: 0.2; }
          100% { transform: translateX(130%); opacity: 0; }
        }
        .data-explorer-shell {
          position: relative;
          isolation: isolate;
          animation: explorer-fade-up 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
          font-family: "Segoe UI Variable Text", "SF Pro Text", "Segoe UI", system-ui, sans-serif;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .cell-color-popover {
          position: fixed;
          z-index: 1700;
          width: 238px;
          max-width: calc(100vw - 16px);
          padding: 0.62rem;
          border-radius: 0.88rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(15, 23, 42, 0.96);
          box-shadow: 0 22px 38px rgba(2, 6, 23, 0.55);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0.55rem;
        }
        .cell-color-popover-grid {
          order: 1;
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 0.38rem;
        }
        .cell-color-popover-custom {
          order: 2;
          margin-top: 0;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(148, 163, 184, 0.28);
        }
        .cell-color-popover-custom-label {
          display: block;
          margin-bottom: 0.35rem;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(191, 219, 254, 0.8);
        }
        .cell-color-popover-custom-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 0.38rem;
        }
        .cell-color-swatch {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 0.46rem;
          border: 1px solid rgba(15, 23, 42, 0.36);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.42);
          transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
        }
        .cell-color-swatch:hover {
          transform: translateY(-1px);
        }
        .cell-color-swatch.is-active {
          border-color: #38bdf8;
          box-shadow:
            0 0 0 2px rgba(56, 189, 248, 0.35),
            inset 0 0 0 1px rgba(255, 255, 255, 0.62);
        }
        .cell-color-popover-actions {
          order: 3;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.42rem;
          margin-top: 0;
        }
        .cell-color-popover-btn {
          min-height: 30px;
          border-radius: 0.56rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(30, 41, 59, 0.92);
          color: #e2e8f0;
          font-size: 0.75rem;
          font-weight: 700;
          transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
        }
        .cell-color-popover-btn:hover {
          background: rgba(51, 65, 85, 0.95);
          border-color: rgba(125, 211, 252, 0.62);
          color: #f8fafc;
        }
        .cell-color-popover.is-r-theme {
          border-color: rgba(8, 145, 178, 0.45);
          background: rgba(2, 14, 30, 0.97);
        }
        .cell-color-popover.is-r-theme .cell-color-popover-btn {
          border-color: rgba(8, 145, 178, 0.36);
          background: rgba(8, 47, 73, 0.7);
          color: #cffafe;
        }
        .cell-color-popover.is-r-theme .cell-color-popover-btn:hover {
          border-color: rgba(103, 232, 249, 0.65);
          background: rgba(12, 74, 110, 0.86);
          color: #ecfeff;
        }
        .cell-color-popover.is-ayu-theme {
          border-color: rgba(15, 23, 42, 0.45);
          background: rgba(248, 250, 252, 0.97);
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.2);
        }
        .cell-color-popover.is-ayu-theme .cell-color-swatch {
          border-color: rgba(51, 65, 85, 0.25);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.72);
        }
        .cell-color-popover.is-ayu-theme .cell-color-popover-custom {
          border-top-color: rgba(51, 65, 85, 0.2);
        }
        .cell-color-popover.is-ayu-theme .cell-color-popover-custom-label {
          color: rgba(30, 41, 59, 0.78);
        }
        .cell-color-popover.is-ayu-theme .cell-color-popover-btn {
          border-color: rgba(148, 163, 184, 0.4);
          background: rgba(241, 245, 249, 0.98);
          color: #0f172a;
        }
        .cell-color-popover.is-ayu-theme .cell-color-popover-btn:hover {
          border-color: rgba(59, 130, 246, 0.5);
          background: rgba(219, 234, 254, 0.98);
          color: #0f172a;
        }
        .studio-window-shell {
          animation: none;
          background: transparent !important;
          box-shadow: none !important;
          border: 0 !important;
          border-radius: 0 !important;
        }
        .studio-window-shell::before {
          display: none;
        }
        .data-explorer-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(140% 120% at 100% 0%, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0) 55%),
            radial-gradient(120% 120% at 0% 100%, rgba(16, 185, 129, 0.06), rgba(16, 185, 129, 0) 50%);
          pointer-events: none;
          z-index: 0;
        }
        .data-explorer-shell > * {
          position: relative;
          z-index: 1;
        }
        .studio-window-content {
          scrollbar-gutter: stable both-edges;
          overscroll-behavior: contain;
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.7) rgba(15, 23, 42, 0.3);
        }
        .studio-window-scroll::-webkit-scrollbar {
          width: 9px;
        }
        .studio-window-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 9999px;
        }
        .studio-window-scroll::-webkit-scrollbar-thumb {
          background: rgba(127, 146, 168, 0.42);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .studio-window-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(79, 193, 255, 0.52);
          background-clip: padding-box;
        }
        .data-explorer-topbar {
          position: relative;
          z-index: 100;
          overflow: visible;
          backdrop-filter: blur(18px);
          padding: 0.78rem 0.9rem 0.82rem;
        }
        .data-explorer-topbar::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 40%;
          background: linear-gradient(110deg, transparent, rgba(255, 255, 255, 0.28), transparent);
          opacity: 0;
          pointer-events: none;
          z-index: 0;
          animation: explorer-sheen 9s ease-in-out infinite;
        }
        .data-explorer-toolbar {
          gap: 0.85rem;
          padding: 0.4rem 0.48rem;
          align-items: flex-start;
          flex-wrap: wrap;
          overflow: visible;
          position: relative;
          z-index: 1;
        }
        .data-explorer-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
          padding: 0 0.1rem 0.45rem;
        }
        .data-explorer-file-pill {
          min-width: 0;
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          max-width: min(100%, 820px);
          padding: 0.85rem 1rem;
          border-radius: 1.1rem;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: linear-gradient(180deg, rgba(17, 27, 46, 0.82), rgba(10, 17, 31, 0.9));
          color: #edf4ff;
          font-size: 0.92rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 20px 36px -28px rgba(2, 6, 23, 0.96);
        }
        .data-explorer-file-sheet {
          display: inline-flex;
          align-items: center;
          padding: 0.18rem 0.45rem;
          border-radius: 9999px;
          background: rgba(56, 189, 248, 0.12);
          color: #c7f1ff;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .data-explorer-meta-actions {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .data-explorer-meta-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.45rem 0.75rem;
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(15, 23, 42, 0.6);
          color: rgba(226, 232, 240, 0.82);
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .data-explorer-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: linear-gradient(180deg, rgba(17, 27, 46, 0.78), rgba(10, 17, 31, 0.88));
          color: #dbe4f1;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }
        .data-explorer-icon-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(56, 189, 248, 0.35);
          background: rgba(56, 189, 248, 0.12);
        }
        .data-explorer-heading-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.95rem;
          padding: 0 0.1rem 0.55rem;
          margin-top: -0.18rem;
        }
        .data-explorer-heading-main {
          min-width: 0;
          display: flex;
          align-items: flex-start;
          gap: 0.95rem;
          margin-top: -0.62rem;
        }
        .data-explorer-title-copy {
          margin-top: 0;
          padding-top: 0.05rem;
        }
        .data-explorer-r-logo {
          flex-shrink: 0;
          align-self: flex-start;
          margin-top: -2.35rem;
          filter: drop-shadow(0 10px 18px rgba(15, 23, 42, 0.28));
        }
        .data-explorer-r-logo-image {
          display: block;
          width: 7.9rem;
          height: 7.9rem;
          object-fit: contain;
        }
        .data-explorer-heading-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .data-explorer-command-surface {
          border-radius: 0;
          border: 0;
          background: linear-gradient(180deg, rgba(8, 13, 26, 0.95), rgba(4, 8, 18, 0.98));
          box-shadow: none;
          overflow: visible;
          padding: 0.2rem;
        }
        .data-explorer-title {
          gap: 0.6rem;
        }
        .data-explorer-open-btn {
          min-height: 44px;
          border-radius: 1rem;
          padding: 0.72rem 1.1rem;
          font-size: 0.86rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          box-shadow: 0 18px 30px -24px rgba(2, 6, 23, 0.9);
        }
        .data-explorer-stat-chip {
          border-radius: 9999px;
          padding: 0.48rem 0.86rem;
          backdrop-filter: blur(10px);
        }
        .data-explorer-tabs {
          border-radius: 1rem;
          padding: 0.2rem;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 12px 22px -20px rgba(2, 6, 23, 0.82);
        }
        .data-explorer-tab-btn {
          min-height: 36px;
          padding: 0.48rem 0.98rem;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .data-explorer-tab-btn:hover {
          transform: translateY(-1px);
        }
        .data-explorer-tab-btn:active {
          transform: translateY(0);
        }
        .viewer-notice {
          font-size: 0.78rem;
          padding-top: 0.62rem;
          padding-bottom: 0.62rem;
          box-shadow: 0 18px 32px -30px rgba(2, 6, 23, 0.9);
          backdrop-filter: blur(12px);
        }
        .viewer-notice-compact {
          font-size: 0.75rem;
          border-radius: 0.95rem;
          box-shadow: none;
          backdrop-filter: blur(10px);
        }
        .data-explorer-header-tools {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          padding-top: 0.45rem;
        }
        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          flex: 1 1 auto;
          min-width: 0;
        }
        .toolbar-center {
          display: none;
        }
        .toolbar-right {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          justify-content: flex-end;
          flex-shrink: 0;
        }
        .data-explorer-floating-layer {
          position: absolute;
          inset: 0;
          z-index: 48;
          pointer-events: none;
          overflow: hidden;
        }
        .toolbar-status {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.35);
          background: rgba(251, 191, 36, 0.12);
        }
        .toolbar-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #fbbf24;
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.6);
        }
        .toolbar-menu {
          position: relative;
        }
        .toolbar-menu-left .toolbar-menu-panel {
          left: 0;
          right: auto;
        }
        .toolbar-menu summary::-webkit-details-marker {
          display: none;
        }
        .toolbar-menu summary::marker {
          content: '';
        }
        .toolbar-menu-trigger {
          list-style: none;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          min-height: 44px;
          padding: 0.68rem 1.05rem;
          border-radius: 0.75rem;
          border: none;
          background: #141414;
          color: #a1a1aa;
          font-size: 0.84rem;
          font-weight: 600;
          font-family: inherit;
          letter-spacing: 0.01em;
          box-shadow: none;
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease;
        }
        .toolbar-menu-trigger:hover {
          background: #1e1e1e;
          border: none;
          color: #f4f4f5;
        }
        .toolbar-floating-trigger {
          position: relative;
        }
        .toolbar-menu-trigger-icon {
          width: 42px;
          min-width: 42px;
          justify-content: center;
          padding: 0;
        }
        .toolbar-menu-trigger:focus-visible {
          outline: 2px solid #383838;
          outline-offset: 2px;
        }
        .toolbar-floating-trigger-caret {
          transition: transform 0.18s ease, opacity 0.18s ease;
          opacity: 0.78;
        }
        .toolbar-menu[open] .toolbar-menu-trigger {
          border: none;
          background: #242424;
          color: #ffffff;
          box-shadow: none;
        }
        .toolbar-floating-trigger.is-open {
          border: none;
          background: #242424;
          color: #ffffff;
          box-shadow: none;
        }
        .toolbar-floating-trigger.is-open .toolbar-floating-trigger-caret {
          transform: rotate(180deg);
          opacity: 1;
        }
        .toolbar-menu-panel {
          position: absolute;
          right: 0;
          top: calc(100% + 0.7rem);
          min-width: 240px;
          padding: 0.75rem;
          border-radius: 1.15rem;
          border: 1px solid rgba(56, 189, 248, 0.24);
          background: linear-gradient(180deg, rgba(13, 21, 38, 0.98), rgba(8, 14, 28, 0.98));
          box-shadow: 0 32px 54px -38px rgba(2, 6, 23, 0.96);
          overflow: visible;
          z-index: 9999;
        }
        .toolbar-menu-panel-wide {
          min-width: 252px;
        }
        .toolbar-menu-section + .toolbar-menu-section {
          margin-top: 0.7rem;
          padding-top: 0.7rem;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
        }
        .toolbar-menu-label {
          display: block;
          font-size: 0.66rem;
          font-weight: 700;
          font-family: 'Montserrat', 'Inter', 'Segoe UI', system-ui, sans-serif;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(191, 219, 254, 0.82);
          margin-bottom: 0.45rem;
        }
        .toolbar-menu-item {
          width: 100%;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.78rem 0.88rem;
          border-radius: 0.85rem;
          border: 1px solid rgba(148, 163, 184, 0.12);
          background: rgba(15, 23, 42, 0.82);
          color: #f1f5f9;
          font-size: 0.86rem;
          font-weight: 700;
          line-height: 1.3;
          text-align: left;
          transition: border-color 0.16s ease, background 0.16s ease;
        }
        .toolbar-menu-item:hover {
          border-color: rgba(56, 189, 248, 0.35);
          background: rgba(56, 189, 248, 0.16);
          color: #e0f2fe;
        }
        .toolbar-menu-item-active {
          border-color: rgba(56, 189, 248, 0.42);
          background: rgba(56, 189, 248, 0.18);
          color: #e0f2fe;
        }
        .toolbar-menu-item-danger {
          color: #fda4af;
        }
        .toolbar-menu-item-danger:hover {
          border-color: rgba(248, 113, 113, 0.36);
          background: rgba(248, 113, 113, 0.12);
          color: #ffe4e6;
        }
        .toolbar-menu-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .floating-tool-window {
          --floating-window-bg: #1F1F22;
          --floating-window-bg-strong: #181818;
          --floating-window-section: #18181B;
          --floating-window-border: rgba(255, 255, 255, 0.08);
          --floating-window-border-strong: rgba(255, 255, 255, 0.16);
          --floating-window-text: #f1f1f4;
          --floating-window-muted: #a1a1aa;
          --floating-window-accent: #38bdf8;
          --floating-window-accent-soft: rgba(56, 189, 248, 0.15);
          --floating-window-hover: #28282D;
          --floating-window-active: #323238;
          position: absolute;
          top: 0;
          left: 0;
          display: flex;
          flex-direction: column;
          max-width: calc(100% - 24px);
          max-height: calc(100% - 24px);
          border-radius: 0.95rem;
          border: 1px solid var(--floating-window-border);
          background: #1F1F22;
          will-change: transform;
          transform-origin: top left;
          transform: translateZ(0);
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease, opacity 0.22s ease;
          box-shadow:
            0 32px 68px -34px rgba(0, 0, 0, 0.82),
            0 12px 26px -16px rgba(15, 23, 42, 0.64);
          backdrop-filter: none;
          pointer-events: auto;
          overflow: hidden;
          text-shadow: none;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .floating-tool-window[data-dragging="true"] {
          transition: none;
          box-shadow:
            0 36px 72px -32px rgba(0, 0, 0, 0.86),
            0 18px 32px -18px rgba(15, 23, 42, 0.72);
        }
        .floating-tool-window[data-resizing="true"] {
          transition: none;
          box-shadow:
            0 38px 74px -30px rgba(0, 0, 0, 0.88),
            0 18px 32px -16px rgba(15, 23, 42, 0.74);
        }
        .floating-tool-window::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          border: 1px solid rgba(255, 255, 255, 0.04);
          pointer-events: none;
        }
        .floating-tool-window::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.16), transparent);
          pointer-events: none;
        }
        .floating-tool-window > * {
          position: relative;
          z-index: 1;
        }
        .floating-tool-window svg {
          opacity: 1;
          shape-rendering: geometricPrecision;
        }
        .floating-tool-window.is-r-theme {
          --floating-window-bg: #1F1F22;
          --floating-window-bg-strong: #181818;
          --floating-window-section: #18181B;
          --floating-window-border: rgba(255, 255, 255, 0.08);
          --floating-window-border-strong: rgba(255, 255, 255, 0.16);
          --floating-window-text: #f1f1f4;
          --floating-window-muted: #a1a1aa;
          --floating-window-accent: #38bdf8;
          --floating-window-accent-soft: rgba(56, 189, 248, 0.15);
          --floating-window-hover: #28282D;
          --floating-window-active: #323238;
        }
        .floating-tool-window-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.82rem 0.9rem 0.78rem;
          border-bottom: 1px solid var(--floating-window-border);
          background: #181818;
          cursor: grab;
          user-select: none;
          touch-action: none;
        }
        .floating-tool-window-header:active {
          cursor: grabbing;
        }
        .floating-tool-window.is-r-theme .floating-tool-window-header {
          border-bottom-color: var(--floating-window-border);
          background: #181818;
        }
        .floating-tool-window-heading {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex: 1 1 auto;
          overflow: hidden;
        }
        .floating-tool-window-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 0.45rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: var(--floating-window-accent);
          flex-shrink: 0;
        }
        .floating-tool-window-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.12rem;
        }
        .floating-tool-window-copy strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--floating-window-text);
          font-size: 0.9rem;
          font-weight: 700;
          font-family: 'Montserrat', 'Inter', 'Segoe UI', system-ui, sans-serif;
          letter-spacing: 0.01em;
        }
        .floating-tool-window-copy span {
          color: var(--floating-window-muted);
          font-size: 0.74rem;
          line-height: 1.35;
        }
        .floating-tool-window-actions {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .floating-tool-window-grip {
          width: 24px;
          height: 10px;
          border-radius: 9999px;
          background:
            radial-gradient(circle at 4px 5px, rgba(243, 246, 251, 0.76) 0 1.2px, transparent 1.3px),
            radial-gradient(circle at 12px 5px, rgba(243, 246, 251, 0.76) 0 1.2px, transparent 1.3px),
            radial-gradient(circle at 20px 5px, rgba(243, 246, 251, 0.76) 0 1.2px, transparent 1.3px);
          opacity: 0.52;
        }
        .floating-tool-window-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 0.42rem;
          border: 1px solid var(--floating-window-border);
          background: rgba(255, 255, 255, 0.03);
          color: var(--floating-window-text);
          transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease, transform 0.16s ease;
        }
        .floating-tool-window-close:hover {
          border-color: var(--floating-window-border-strong);
          background: var(--floating-window-hover);
          color: #ffffff;
          transform: translateY(-1px);
        }
        .floating-tool-window-resize {
          position: absolute;
          right: 0.18rem;
          bottom: 0.18rem;
          width: 18px;
          height: 18px;
          border: 0;
          border-radius: 0 0 0.8rem 0;
          background: transparent;
          cursor: nwse-resize;
          touch-action: none;
          opacity: 0.72;
        }
        .floating-tool-window-resize::before {
          content: "";
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 11px;
          height: 11px;
          background:
            linear-gradient(135deg, transparent 0 40%, rgba(243, 246, 251, 0.78) 40% 48%, transparent 48% 60%, rgba(243, 246, 251, 0.62) 60% 68%, transparent 68% 100%);
          pointer-events: none;
        }
        .floating-tool-window-resize:hover,
        .floating-tool-window[data-resizing="true"] .floating-tool-window-resize {
          opacity: 1;
        }
        .floating-tool-window-resize:focus-visible {
          outline: 2px solid var(--floating-window-accent);
          outline-offset: 1px;
        }
        .floating-tool-window-body {
          flex: 1 1 auto;
          min-height: 0;
          padding: 0.88rem;
          overflow: auto;
          background: #1F1F22;
        }
        .floating-tool-window-body::-webkit-scrollbar {
          width: 9px;
          height: 9px;
        }
        .floating-tool-window-body::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .floating-tool-window-body::-webkit-scrollbar-thumb {
          border-radius: 9999px;
          border: 2px solid transparent;
          background: rgba(127, 146, 168, 0.5);
          background-clip: padding-box;
        }
        .ayu-select-chevron {
          opacity: 0.78;
          transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), color 180ms ease, opacity 180ms ease;
        }
        .ayu-select-chevron.is-open {
          transform: rotate(180deg);
          opacity: 1;
        }
        .ayu-select-panel {
          opacity: 0;
          transform: translateY(-8px) scale(0.985);
          transform-origin: top center;
          pointer-events: none;
          transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease;
        }
        .ayu-select-panel.is-open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .ayu-select-panel-secondary {
          margin-top: 0;
          transform-origin: top left;
          transform: translate3d(-10px, 0, 0) scale(0.985);
        }
        .ayu-select-panel-secondary.is-open {
          transform: translate3d(0, 0, 0) scale(1);
        }
        .ayu-select-panel-secondary-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: -2px -2px 0.28rem;
          padding: 0.44rem 0.58rem 0.38rem;
          border-bottom: 1px solid var(--floating-window-border, rgba(148, 163, 184, 0.28));
        }
        .ayu-select-panel-secondary-title {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--floating-window-muted, rgba(148, 163, 184, 0.8));
        }
        .floating-tool-window .toolbar-menu-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.82rem;
          border-radius: 0.7rem;
          border: 1px solid var(--floating-window-border);
          background: var(--floating-window-section);
        }
        .floating-tool-window .toolbar-menu-section + .toolbar-menu-section {
          margin-top: 0.68rem;
          padding-top: 0.82rem;
          border-top: 1px solid var(--floating-window-border);
        }
        .floating-tool-window-selection .floating-tool-window-body {
          display: grid;
          grid-template-columns: minmax(210px, 0.72fr) minmax(0, 1.28fr);
          gap: 0.58rem;
          padding: 0.62rem;
          background: #151518;
          align-items: start;
        }
        .floating-tool-window-selection .floating-tool-window-header {
          padding: 0.66rem 0.74rem 0.62rem;
        }
        .floating-tool-window-selection .floating-tool-window-icon {
          width: 25px;
          height: 25px;
        }
        .floating-tool-window-selection .floating-tool-window-copy strong {
          font-size: 0.82rem;
        }
        .floating-tool-window-selection .floating-tool-window-copy span {
          font-size: 0.68rem;
        }
        .floating-tool-window-selection .toolbar-menu-section {
          min-width: 0;
          padding: 0.62rem;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 0.68rem;
          background: #1b1b1f;
        }
        .floating-tool-window-selection .toolbar-menu-section + .toolbar-menu-section {
          margin-top: 0;
          padding-top: 0.62rem;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
        }
        .floating-tool-window-selection .toolbar-menu-label {
          margin-bottom: 0.34rem;
          color: #a1a1aa;
          font-size: 0.58rem;
          letter-spacing: 0.12em;
        }
        .floating-tool-window-selection .toolbar-menu-copy {
          margin-bottom: 0.52rem;
          color: #8f8f98;
          font-size: 0.68rem;
          line-height: 1.35;
        }
        .floating-tool-window-rows .floating-tool-window-body {
          display: grid;
          grid-template-columns: minmax(280px, 0.9fr) minmax(420px, 1.1fr);
          grid-template-rows: auto minmax(0, 1fr);
          grid-template-areas:
            "dataset missing"
            "quality missing";
          gap: 0.72rem;
          align-items: stretch;
        }
        .floating-tool-window-rows .toolbar-menu-section + .toolbar-menu-section {
          margin-top: 0;
          padding-top: 0;
          border-top: none;
        }
        .floating-tool-window-rows .toolbar-menu-section {
          height: auto;
        }
        .floating-tool-window-rows .rows-dataset-section {
          grid-area: dataset;
          align-self: start;
        }
        .floating-tool-window-rows .rows-quality-section {
          grid-area: quality;
          align-self: start;
        }
        .floating-tool-window-rows .rows-missing-section {
          grid-area: missing;
          min-height: 0;
          height: 100%;
        }
        .floating-tool-window-clean .floating-tool-window-body {
          display: grid;
          grid-template-columns: minmax(280px, 1fr) minmax(240px, 0.82fr);
          gap: 0.72rem;
          align-items: stretch;
        }
        .floating-tool-window.floating-tool-window-text {
          overflow: visible !important;
        }
        .floating-tool-window-text .floating-tool-window-body {
          overflow: visible !important;
          padding: 0 !important;
          background: #18181b;
          border-bottom-left-radius: 0.95rem;
          border-bottom-right-radius: 0.95rem;
        }
        .clean-floating-layout {
          display: contents;
        }
        .clean-panel-rows,
        .clean-panel-actions {
          min-height: 0;
        }
        .clean-panel-actions {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }
        .clean-panel-actions .clean-actions-run-btn {
          margin-top: auto;
          width: 100%;
          justify-content: center;
        }
        .clean-panel-actions .clean-actions-run-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .clean-actions-title {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 0.18rem;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--floating-window-muted);
        }
        .floating-tool-window-selection .toolbar-menu-section + .toolbar-menu-section {
          margin-top: 0;
          padding-top: 0.82rem;
          border-top: none;
        }
        .floating-tool-window-selection .toolbar-floating-stack {
          flex-direction: row;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.46rem;
        }
        .floating-tool-window-selection .toolbar-menu-copy,
        .floating-tool-window-selection .group-controls-hint,
        .floating-tool-window-selection .selection-summary,
        .floating-tool-window-selection .group-levels,
        .floating-tool-window-selection .group-column-compact-list {
          flex: 1 0 100%;
        }
        .floating-tool-window-selection .group-select-compact {
          min-width: 0;
          max-width: none;
          width: 100%;
          min-height: 30px;
          padding-top: 0.38rem;
          padding-bottom: 0.38rem;
          font-size: 0.74rem;
        }
        .floating-tool-window-selection .control-row-group {
          flex-wrap: wrap;
          gap: 0.38rem;
        }
        .floating-tool-window-selection .control-row-group .group-select-compact {
          flex: 1 1 150px;
        }
        .floating-tool-window-selection .control-btn {
          min-height: 30px;
          padding: 0.42rem 0.62rem;
          border-radius: 0.5rem;
          font-size: 0.72rem;
        }
        .floating-tool-window-selection .segmented-group {
          padding: 0.14rem;
        }
        .floating-tool-window-selection .segmented-group .control-btn {
          min-height: 29px;
          padding: 0.38rem 0.62rem;
        }
        .floating-tool-window-selection .selection-input {
          width: 44px;
          min-height: 29px;
          font-size: 0.76rem;
        }
        .floating-tool-window-selection .selection-summary {
          font-size: 0.68rem;
        }
        .floating-tool-window-selection .group-controls-hint {
          color: #7d7d86;
          font-size: 0.62rem;
          line-height: 1.35;
        }
        .group-selection-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 0.62rem;
          width: 100%;
          align-items: start;
        }
        .group-selection-main {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          min-width: 0;
        }
        .group-level-panels {
          display: flex;
          flex-direction: row;
          gap: 0.6rem;
          overflow-x: auto;
          padding-bottom: 0.2rem;
          scrollbar-width: thin;
        }
        .group-level-panel {
          flex: 0 0 min(340px, 100%);
          min-width: 260px;
        }
        .floating-tool-window .toolbar-menu-item {
          min-height: 38px;
          padding: 0.62rem 0.78rem;
          border-radius: 0.55rem;
          border: 1px solid var(--floating-window-border);
          background: #222933;
          color: var(--floating-window-text);
          font-size: 0.82rem;
          font-weight: 600;
          box-shadow: none;
        }
        .floating-tool-window .toolbar-menu-item:hover {
          border-color: var(--floating-window-border-strong);
          background: var(--floating-window-hover);
          box-shadow: none;
        }
        .floating-tool-window .toolbar-menu-item-active,
        .floating-tool-window .toolbar-menu-item-active:hover {
          background: var(--floating-window-active);
          border-color: var(--floating-window-accent);
          color: #ffffff;
        }
        .floating-tool-window .toolbar-menu-item-danger,
        .floating-tool-window .toolbar-menu-item-danger:hover {
          color: #f48771;
        }
        .floating-tool-window .toolbar-menu-item svg {
          opacity: 1;
        }
        .floating-tool-window-columns .columns-flyout-grid {
          gap: 0.62rem;
        }
        .floating-tool-window-columns .columns-quick-panel {
          border-radius: 0.7rem;
          border: 1px solid var(--floating-window-border);
          background: #222933;
          box-shadow: none;
        }
        .floating-tool-window .toolbar-menu-label {
          margin-bottom: 0.28rem;
          color: var(--floating-window-muted);
          font-size: 0.68rem;
          letter-spacing: 0.12em;
        }
        .floating-tool-window .toolbar-menu-copy {
          margin-bottom: 0.38rem;
          color: var(--floating-window-muted);
          font-size: 0.78rem;
        }
        .floating-tool-window .control-btn,
        .floating-tool-window .columns-flyout-link,
        .floating-tool-window .columns-quick-btn,
        .floating-tool-window .group-chip {
          min-height: 36px;
          padding: 0.56rem 0.82rem;
          border-radius: 0.55rem;
          border: 1px solid var(--floating-window-border);
          background: #222933;
          color: var(--floating-window-text);
          font-size: 0.8rem;
          font-weight: 600;
          box-shadow: none;
        }
        .floating-tool-window .control-btn:hover,
        .floating-tool-window .columns-flyout-link:hover,
        .floating-tool-window .columns-quick-btn:hover,
        .floating-tool-window .group-chip:hover {
          border-color: var(--floating-window-border-strong);
          background: var(--floating-window-hover);
          color: #ffffff;
          transform: none;
        }
        .floating-tool-window .control-btn.is-active,
        .floating-tool-window .group-chip-active {
          border-color: var(--floating-window-accent);
          background: var(--floating-window-active);
          color: #ffffff;
        }
        .floating-tool-window .control-btn-danger,
        .floating-tool-window .control-btn-danger:hover {
          border-color: rgba(244, 135, 113, 0.32);
          background: rgba(244, 135, 113, 0.12);
          color: #f48771;
        }
        .floating-tool-window .clean-panel-actions .clean-actions-run-btn {
          min-height: 32px;
          padding: 0.45rem 0.72rem;
          font-size: 0.76rem;
        }
        .floating-tool-window .segmented-group {
          padding: 0.18rem;
          border-radius: 0.62rem;
          border-color: var(--floating-window-border);
          background: #1d232c;
        }
        .floating-tool-window .segmented-group .control-btn {
          min-height: 32px;
          padding: 0.48rem 0.76rem;
          border: none;
          background: transparent;
        }
        .floating-tool-window .segmented-group .control-btn.is-active {
          background: var(--floating-window-active);
        }
        .floating-tool-window .segmented-label,
        .floating-tool-window .selection-summary,
        .floating-tool-window .columns-flyout-meta {
          color: var(--floating-window-muted);
          font-size: 0.74rem;
        }
        .floating-tool-window .selection-summary {
          font-weight: 600;
        }
        .floating-tool-window .selection-summary-strong {
          color: var(--floating-window-accent);
        }
        .floating-tool-window.floating-tool-window-selection .toolbar-menu-section + .toolbar-menu-section {
          margin-top: 0;
          padding-top: 0.62rem;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
        }
        .floating-tool-window.floating-tool-window-selection .toolbar-menu-label {
          margin-bottom: 0.34rem;
          color: #a1a1aa;
          font-size: 0.58rem;
          letter-spacing: 0.12em;
        }
        .floating-tool-window.floating-tool-window-selection .toolbar-menu-copy {
          margin-bottom: 0.52rem;
          color: #8f8f98;
          font-size: 0.68rem;
          line-height: 1.35;
        }
        .floating-tool-window.floating-tool-window-selection .toolbar-floating-stack {
          gap: 0.46rem;
        }
        .floating-tool-window.floating-tool-window-selection .group-select-compact {
          min-width: 0;
          max-width: none;
          width: 100%;
          min-height: 30px;
          padding-top: 0.38rem;
          padding-bottom: 0.38rem;
          font-size: 0.74rem;
        }
        .floating-tool-window.floating-tool-window-selection .control-row-group {
          flex-wrap: wrap;
          gap: 0.38rem;
        }
        .floating-tool-window.floating-tool-window-selection .control-row-group .group-select-compact {
          flex: 1 1 150px;
        }
        .floating-tool-window.floating-tool-window-selection .control-btn {
          min-height: 30px;
          padding: 0.42rem 0.62rem;
          border-radius: 0.5rem;
          background: #232327;
          font-size: 0.72rem;
        }
        .floating-tool-window.floating-tool-window-selection .control-btn:hover {
          background: #2b2b30;
        }
        .floating-tool-window.floating-tool-window-selection .segmented-group {
          padding: 0.14rem;
          background: #202024;
        }
        .floating-tool-window.floating-tool-window-selection .segmented-group .control-btn {
          min-height: 29px;
          padding: 0.38rem 0.62rem;
          background: transparent;
        }
        .floating-tool-window.floating-tool-window-selection .selection-input {
          width: 44px;
          min-height: 29px;
          font-size: 0.76rem;
        }
        .floating-tool-window.floating-tool-window-selection .selection-summary {
          font-size: 0.68rem;
        }
        .floating-tool-window.floating-tool-window-selection .group-controls-hint {
          color: #7d7d86;
          font-size: 0.62rem;
          line-height: 1.35;
        }
        .data-grid-data-cell-highlighted {
          box-shadow: inset 0 0 0 2px rgba(15, 23, 42, 0.72);
          background-image: linear-gradient(0deg, rgba(15, 23, 42, 0.12), rgba(15, 23, 42, 0.12));
        }
        .data-grid-range-selected {
          position: relative;
          background-image: linear-gradient(0deg, rgba(15, 23, 42, 0.12), rgba(15, 23, 42, 0.12));
        }
        .data-grid-range-selected::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-style: solid;
          border-color: rgba(15, 23, 42, 0.78);
          border-width: 0;
        }
        .data-grid-range-selected.data-grid-range-top::after { border-top-width: 2px; }
        .data-grid-range-selected.data-grid-range-bottom::after { border-bottom-width: 2px; }
        .data-grid-range-selected.data-grid-range-left::after { border-left-width: 2px; }
        .data-grid-range-selected.data-grid-range-right::after { border-right-width: 2px; }
        .data-grid-data-cell-highlighted.data-grid-range-selected {
          box-shadow: inset 0 0 0 2px rgba(15, 23, 42, 0.85);
        }
        .floating-tool-window .selection-input,
        .floating-tool-window .columns-quick-input,
        .floating-tool-window .columns-quick-select,
        .floating-tool-window .group-select-compact {
          border-radius: 0.55rem;
          border: 1px solid var(--floating-window-border);
          background: #1b2027;
          color: var(--floating-window-text);
          font-size: 0.82rem;
          font-weight: 600;
          box-shadow: none;
        }
        .floating-tool-window .selection-input {
          min-height: 32px;
        }
        .floating-tool-window .columns-quick-input:focus,
        .floating-tool-window .columns-quick-select:focus,
        .floating-tool-window .group-select-compact:focus {
          border-color: var(--floating-window-accent);
          box-shadow: 0 0 0 2px var(--floating-window-accent-soft);
        }
        .floating-tool-window .columns-flyout-chip {
          border-radius: 0.55rem;
          border-color: var(--floating-window-border);
          background: #222933;
          padding: 0.58rem 0.68rem;
        }
        .floating-tool-window .columns-flyout-chip:hover {
          border-color: var(--floating-window-border-strong);
          background: var(--floating-window-hover);
        }
        .floating-tool-window .columns-flyout-chip.is-selected {
          border-color: var(--floating-window-accent);
          background: var(--floating-window-active);
        }
        .floating-tool-window .columns-flyout-chip-label {
          color: var(--floating-window-text);
          font-size: 0.8rem;
          font-weight: 600;
        }
        .floating-tool-window .toolbar-stat-card {
          border-color: var(--floating-window-border);
          background: #222933;
          color: var(--floating-window-text);
        }
        .floating-tool-window .toolbar-stat-card strong {
          color: #ffffff;
        }
        .floating-tool-window .toolbar-stat-label {
          color: var(--floating-window-muted);
        }
        .floating-tool-window-columns .floating-tool-window-body {
          padding-bottom: 1rem;
        }
        .toolbar-menu-panel-stats {
          min-width: 320px;
        }
        .toolbar-dataset-mini-table-wrap {
          width: 100%;
          overflow-x: auto;
        }
        .toolbar-dataset-mini-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 0.8rem;
        }
        .toolbar-dataset-mini-table th,
        .toolbar-dataset-mini-table td {
          border: 1px solid rgba(148, 163, 184, 0.24);
          padding: 0.46rem 0.56rem;
          text-align: left;
          color: var(--floating-window-text);
        }
        .toolbar-dataset-mini-table thead th {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--floating-window-muted);
          background: rgba(15, 23, 42, 0.35);
        }
        .toolbar-dataset-mini-table tbody th {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--floating-window-muted);
          background: rgba(15, 23, 42, 0.2);
        }
        .toolbar-dataset-mini-table tbody td {
          font-size: 0.86rem;
          font-weight: 700;
          white-space: nowrap;
          background: rgba(15, 23, 42, 0.5);
        }
        .toolbar-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.55rem;
        }
        .floating-tool-window-rows .toolbar-stats-grid-rows-dataset {
          grid-template-columns: minmax(0, 1fr);
        }
        .floating-tool-window-rows .toolbar-stats-grid-rows-dataset .toolbar-stat-card {
          padding: 0.8rem 0.88rem;
        }
        .floating-tool-window-rows .toolbar-stats-grid-rows-dataset .toolbar-stat-label {
          font-size: 0.8rem;
          letter-spacing: 0.06em;
        }
        .floating-tool-window-rows .toolbar-stats-grid-rows-dataset .toolbar-stat-split {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.24rem;
        }
        .floating-tool-window-rows .toolbar-stats-grid-rows-dataset .toolbar-stat-divider {
          width: 100%;
          height: 1px;
          align-self: stretch;
        }
        .floating-tool-window-rows .toolbar-stats-grid-rows-dataset .toolbar-stat-split strong {
          font-size: 1.1rem;
          line-height: 1.15;
          white-space: normal;
          word-break: break-word;
        }
        .toolbar-stat-card {
          display: flex;
          flex-direction: column;
          gap: 0.28rem;
          padding: 0.92rem 0.98rem;
          border-radius: 0.95rem;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(15, 23, 42, 0.82);
          color: #f1f5f9;
        }
        .toolbar-stat-card strong {
          font-size: 1.14rem;
          line-height: 1.1;
        }
        .toolbar-stat-split {
          display: flex;
          align-items: center;
          gap: 0.58rem;
          min-width: 0;
        }
        .toolbar-stat-split strong {
          font-size: 0.95rem;
          line-height: 1.2;
          white-space: nowrap;
        }
        .toolbar-stat-divider {
          width: 1px;
          align-self: stretch;
          background: rgba(148, 163, 184, 0.42);
        }
        .toolbar-stat-meta {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--floating-window-muted);
          white-space: nowrap;
        }
        .toolbar-stat-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(191, 219, 254, 0.78);
        }
        .toolbar-stats-grid-compact {
          margin-top: 0.75rem;
        }
        .toolbar-quality-meter {
          position: relative;
          height: 0.7rem;
          width: 100%;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.58);
          border: 1px solid rgba(148, 163, 184, 0.16);
        }
        .toolbar-quality-meter-complete {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #22c55e 0%, #10b981 100%);
        }
        .toolbar-quality-legend {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          margin-top: 0.55rem;
          font-size: 0.8rem;
          color: rgba(226, 232, 240, 0.84);
        }
        .toolbar-quality-legend strong {
          color: #ffffff;
        }
        .toolbar-quality-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.85rem;
        }
        .toolbar-quality-panel {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }
        .toolbar-quality-list {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .floating-tool-window-rows .toolbar-quality-list-horizontal-flow {
          display: block;
          column-width: 280px;
          column-gap: 0.62rem;
          height: min(48vh, 360px);
          overflow-x: auto;
          overflow-y: hidden;
          padding-right: 0.12rem;
        }
        .floating-tool-window-rows .toolbar-quality-list-horizontal-flow .toolbar-quality-item {
          display: inline-flex;
          width: 100%;
          margin: 0 0 0.55rem;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .toolbar-quality-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.75rem 0.85rem;
          border-radius: 0.85rem;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(15, 23, 42, 0.5);
        }
        .toolbar-quality-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .toolbar-quality-copy strong {
          color: #f8fafc;
          font-size: 0.84rem;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .floating-tool-window-rows .toolbar-quality-copy strong {
          white-space: normal;
          overflow-wrap: anywhere;
        }
        .toolbar-quality-copy span {
          color: rgba(191, 219, 254, 0.74);
          font-size: 0.74rem;
          line-height: 1.25;
        }
        .toolbar-quality-badge {
          flex-shrink: 0;
          padding: 0.32rem 0.55rem;
          border-radius: 999px;
          border: 1px solid rgba(34, 197, 94, 0.24);
          background: rgba(34, 197, 94, 0.12);
          color: #d1fae5;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .toolbar-quality-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.42rem;
        }
        .toolbar-quality-jump {
          flex-shrink: 0;
          min-height: 28px;
          padding: 0.38rem 0.62rem;
          border-radius: 0.65rem;
          border: 1px solid rgba(96, 165, 250, 0.26);
          background: rgba(59, 130, 246, 0.12);
          color: #dbeafe;
          font-size: 0.72rem;
          font-weight: 700;
          transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
        }
        .toolbar-quality-jump:hover {
          border-color: rgba(96, 165, 250, 0.42);
          background: rgba(59, 130, 246, 0.2);
          color: #ffffff;
        }
        .toolbar-quality-empty {
          padding: 0.85rem 0.95rem;
          border-radius: 0.85rem;
          border: 1px dashed rgba(148, 163, 184, 0.2);
          background: rgba(15, 23, 42, 0.32);
          color: rgba(191, 219, 254, 0.76);
          font-size: 0.78rem;
          line-height: 1.45;
        }
        .toolbar-menu-panel-selection {
          min-width: 300px;
        }
        .toolbar-menu-panel-clean {
          min-width: 250px;
        }
        .toolbar-menu-panel-columns {
          min-width: min(820px, calc(100vw - 48px));
          max-width: min(820px, calc(100vw - 48px));
        }
        .toolbar-menu-panel-group {
          min-width: 360px;
        }
        .toolbar-floating-stack {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }
        .toolbar-menu-copy {
          font-size: 0.78rem;
          line-height: 1.4;
          color: rgba(191, 219, 254, 0.8);
          margin-bottom: 0.75rem;
        }
        .toolbar-menu-action {
          width: 100%;
          justify-content: center;
        }
        .row-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          gap: 1rem;
          padding: 0.95rem 1rem;
          box-shadow: 0 24px 38px -32px rgba(2, 6, 23, 0.92);
          backdrop-filter: blur(14px);
        }
        .row-controls-compact {
          gap: 0.8rem;
          padding: 0.65rem 0.8rem;
          box-shadow: 0 18px 30px -30px rgba(2, 6, 23, 0.86);
        }
        .control-group {
          display: flex;
          flex-direction: column;
          gap: 0.42rem;
          min-width: 0;
        }
        .control-group-summary {
          margin-left: auto;
          align-items: flex-end;
        }
        .control-group-group {
          min-width: 0;
        }
        .control-label {
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.7);
        }
        .control-row {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          flex-wrap: wrap;
        }
        .row-count-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.5rem 0.8rem;
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          font-size: 0.76rem;
          font-weight: 600;
        }
        .control-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          min-height: 38px;
          padding: 0.62rem 0.96rem;
          border-radius: 0.95rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(15, 23, 42, 0.76);
          color: #f1f5f9;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
        }
        .control-btn:focus-visible {
          outline: 2px solid rgba(56, 189, 248, 0.6);
          outline-offset: 2px;
        }
        .control-btn:hover {
          border-color: rgba(56, 189, 248, 0.4);
          background: rgba(56, 189, 248, 0.14);
          transform: translateY(-1px);
        }
        .control-btn.is-active {
          border-color: rgba(56, 189, 248, 0.55);
          background: rgba(56, 189, 248, 0.22);
          color: #e0f2fe;
        }
        .control-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }
        .control-btn-danger {
          border-color: rgba(248, 113, 113, 0.4);
          background: rgba(248, 113, 113, 0.15);
          color: #fee2e2;
        }
        .control-btn-danger:hover {
          border-color: rgba(248, 113, 113, 0.6);
          background: rgba(248, 113, 113, 0.25);
        }
        .segmented-group {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          padding: 0.2rem;
          border-radius: 1rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(2, 6, 23, 0.55);
        }
        .segmented-group .control-btn {
          border: none;
          background: transparent;
          min-height: 32px;
          padding: 0.48rem 0.84rem;
          box-shadow: none;
        }
        .segmented-group .control-btn:hover {
          transform: none;
        }
        .segmented-group .control-btn.is-active {
          background: rgba(56, 189, 248, 0.22);
          color: #e0f2fe;
        }
        .segmented-label {
          font-size: 0.64rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.8);
          padding: 0 0.3rem 0 0.4rem;
        }
        .selection-input {
          width: 54px;
          border: none;
          background: transparent;
          color: #f8fafc;
          text-align: center;
          font-size: 0.86rem;
          font-weight: 700;
          outline: none;
        }
        .selection-input::-webkit-outer-spin-button,
        .selection-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .selection-input[type=\"number\"] {
          -moz-appearance: textfield;
        }
        .control-count {
          font-size: 0.6rem;
          font-weight: 700;
          color: rgba(226, 232, 240, 0.7);
        }
        .columns-quick-shell {
          padding: 0.8rem 1rem 0.95rem;
          box-shadow: 0 22px 38px -34px rgba(2, 6, 23, 0.95);
          backdrop-filter: blur(14px);
        }
        .columns-popover {
          position: relative;
        }
        .columns-flyout {
          position: absolute;
          top: calc(100% + 0.55rem);
          left: 0;
          z-index: 55;
          width: min(840px, calc(100vw - 64px));
          padding: 0.75rem;
          border-radius: 1.1rem;
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 0 32px 60px -42px rgba(2, 6, 23, 0.98);
          backdrop-filter: blur(18px);
        }
        .columns-flyout-top {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          margin-bottom: 0.75rem;
        }
        .columns-quick-panel-inline {
          padding: 0;
          border: none;
          background: transparent;
        }
        .columns-flyout-actions {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          flex-wrap: wrap;
        }
        .columns-flyout-link {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          padding: 0.5rem 0.8rem;
          border-radius: 0.8rem;
          border: 1px solid transparent;
          font-size: 0.8rem;
          font-weight: 700;
          transition: background 0.16s ease, border-color 0.16s ease;
        }
        .columns-flyout-meta {
          margin-left: auto;
          font-size: 0.76rem;
          font-weight: 700;
        }
        .columns-flyout-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(176px, 1fr));
          gap: 0.5rem;
        }
        .columns-flyout-chip {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.66rem 0.78rem;
          border-radius: 0.82rem;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(15, 23, 42, 0.78);
          cursor: pointer;
          transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
        }
        .columns-flyout-chip:hover {
          border-color: rgba(148, 163, 184, 0.32);
          background: rgba(30, 41, 59, 0.92);
          transform: translateY(-1px);
        }
        .columns-flyout-chip-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: 0.01em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .columns-quick-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.7rem;
          flex-wrap: wrap;
        }
        .columns-quick-panel {
          display: flex;
          align-items: stretch;
          gap: 0.6rem;
          padding: 0.55rem;
          border-radius: 1rem;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(2, 6, 23, 0.46);
          flex-wrap: wrap;
        }
        .columns-quick-input,
        .columns-quick-select {
          flex: 1 1 170px;
          min-width: 0;
          height: 42px;
          border-radius: 0.9rem;
          border-width: 1px;
          padding: 0 0.95rem;
          font-size: 0.86rem;
          font-weight: 600;
          line-height: 1.2;
          outline: none;
          transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
        }
        .columns-quick-input:focus,
        .columns-quick-select:focus {
          box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.16);
        }
        .columns-quick-btn {
          flex: 0 0 auto;
          min-height: 42px;
          padding: 0.7rem 1rem;
          border-radius: 0.9rem;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
        }
        .columns-quick-btn:hover {
          transform: translateY(-1px);
        }
        .control-row-group {
          gap: 0.45rem;
        }
        .group-select-compact {
          min-width: 180px;
          max-width: 220px;
          width: auto;
          padding-top: 0.48rem;
          padding-bottom: 0.48rem;
          font-size: 0.86rem;
          font-weight: 600;
        }
        .search-field {
          position: relative;
          width: 220px;
        }
        .toolbar-search-field {
          width: clamp(220px, 24vw, 300px);
        }
        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: rgba(0, 0, 0, 0.68);
        }
        .search-input {
          width: 100%;
          min-height: 44px;
          padding: 0.65rem 2rem 0.65rem 2.15rem;
          border-radius: 1rem;
          border: 1px solid rgba(203, 213, 225, 0.96);
          background: #ffffff !important;
          background-image: none !important;
          color: #000000;
          font-size: 0.88rem;
          font-weight: 600;
          box-shadow: none;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          transition: border-color 0.16s ease, box-shadow 0.16s ease;
        }
        .search-input:focus {
          border-color: rgba(148, 163, 184, 0.96);
          box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.18);
        }
        .search-input::placeholder {
          color: rgba(0, 0, 0, 0.58);
        }
        .search-clear {
          position: absolute;
          right: 0.55rem;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(0, 0, 0, 0.58);
          cursor: pointer;
          transition: color 0.16s ease;
        }
        .search-clear:hover {
          color: rgba(0, 0, 0, 0.88);
        }
        .selection-summary {
          font-size: 0.76rem;
          font-weight: 600;
          color: rgba(226, 232, 240, 0.84);
        }
        .selection-summary-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.55rem 0.85rem;
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(15, 23, 42, 0.62);
        }
        .selection-summary-strong {
          color: #38bdf8;
          font-weight: 700;
        }
        .group-controls-row {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          box-shadow: 0 18px 30px -30px rgba(2, 6, 23, 0.9);
          backdrop-filter: blur(10px);
        }
        .group-controls-row-compact {
          padding: 0.55rem 0.75rem;
          box-shadow: 0 14px 24px -24px rgba(2, 6, 23, 0.9);
        }
        .group-controls-main {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .group-controls-label {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.7);
        }
        .group-controls-hint {
          font-size: 0.55rem;
          color: rgba(148, 163, 184, 0.7);
        }
        .group-select {
          min-width: 220px;
          max-width: 320px;
        }
        .group-controls-actions {
          display: inline-flex;
          gap: 0.4rem;
        }
        .group-levels {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .clean-missing-row-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          max-height: 220px;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 0.1rem;
        }
        .clean-row-selection-toolbar {
          display: inline-flex;
          align-items: center;
          gap: 0.42rem;
          flex-wrap: wrap;
        }
        .clean-row-selection-summary {
          font-size: 0.64rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.78);
        }
        .clean-missing-row-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
          min-width: 0;
          padding: 0.42rem 0.55rem;
          border-radius: 0.72rem;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(15, 23, 42, 0.56);
        }
        .clean-row-picker {
          width: 100%;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.16s ease, background 0.16s ease;
        }
        .clean-row-picker:hover {
          border-color: rgba(56, 189, 248, 0.42);
          background: rgba(30, 41, 59, 0.76);
        }
        .clean-row-picker.is-selected {
          border-color: rgba(56, 189, 248, 0.66);
          background: rgba(56, 189, 248, 0.2);
        }
        .clean-missing-row-name {
          font-size: 0.72rem;
          font-weight: 700;
          color: #e2e8f0;
        }
        .clean-missing-row-meta {
          flex-shrink: 0;
          font-size: 0.64rem;
          color: rgba(191, 219, 254, 0.76);
        }
        .group-column-compact-list {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .group-column-compact-item {
          display: flex;
          flex-direction: column;
          gap: 0.36rem;
          width: 100%;
          padding: 0.42rem 0.5rem;
          border-radius: 0.82rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(15, 23, 42, 0.52);
        }
        .group-column-compact-head {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
        }
        .group-column-compact-name {
          max-width: 190px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.7rem;
          font-weight: 700;
          color: #e2e8f0;
          padding-inline: 0.12rem;
        }
        .group-column-compact-meta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 20px;
          padding: 0 0.38rem;
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(15, 23, 42, 0.62);
          color: rgba(226, 232, 240, 0.88);
          font-size: 0.62rem;
          font-weight: 700;
          line-height: 1;
        }
        .group-column-compact-meta-numeric {
          border-color: rgba(16, 185, 129, 0.36);
          background: rgba(16, 185, 129, 0.16);
          color: #d1fae5;
        }
        .group-column-compact-meta-icon {
          width: 22px;
          min-width: 22px;
          min-height: 22px;
          padding: 0;
        }
        .group-column-compact-actions {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .group-column-levels-inline {
          display: flex;
          flex-wrap: wrap;
          gap: 0.28rem;
        }
        .group-column-levels-inline .group-chip {
          min-height: 30px;
          padding: 0.28rem 0.56rem;
          border-radius: 9999px;
          font-size: 0.67rem;
          line-height: 1.1;
        }
        .group-column-icon-btn {
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.36);
          background: rgba(30, 41, 59, 0.76);
          color: #dbeafe;
          transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
        }
        .group-column-icon-btn:hover {
          border-color: rgba(56, 189, 248, 0.6);
          background: rgba(56, 189, 248, 0.18);
          color: #f0f9ff;
        }
        .group-column-icon-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .group-chip {
          padding: 0.42rem 0.78rem;
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(15, 23, 42, 0.7);
          color: #e2e8f0;
          font-size: 0.72rem;
          font-weight: 700;
          transition: border-color 0.16s ease, background 0.16s ease;
        }
        .group-chip-active {
          border-color: rgba(56, 189, 248, 0.6);
          background: rgba(56, 189, 248, 0.22);
          color: #e0f2fe;
        }
        .data-explorer-r-theme .toolbar-menu-trigger {
          border-color: rgba(34, 211, 238, 0.45);
          background: rgba(6, 182, 212, 0.15);
          color: #e0f2fe;
        }
        .data-explorer-r-theme .toolbar-floating-trigger.is-open {
          border-color: rgba(34, 211, 238, 0.62);
          background: rgba(34, 211, 238, 0.2);
          color: #ecfeff;
        }
        .data-explorer-r-theme .data-explorer-file-pill,
        .data-explorer-r-theme .data-explorer-meta-chip,
        .data-explorer-r-theme .data-explorer-icon-btn,
        .data-explorer-r-theme .data-explorer-command-surface {
          border-color: rgba(34, 211, 238, 0.22);
        }
        .data-explorer-r-theme .data-explorer-file-pill,
        .data-explorer-r-theme .data-explorer-meta-chip,
        .data-explorer-r-theme .data-explorer-icon-btn {
          background: rgba(6, 182, 212, 0.1);
          color: #dffcff;
        }
        .data-explorer-r-theme .data-explorer-file-sheet {
          background: rgba(34, 211, 238, 0.18);
          color: #ecfeff;
        }
        .data-explorer-r-theme .data-explorer-command-surface {
          background: linear-gradient(180deg, rgba(7, 22, 40, 0.9), rgba(3, 10, 20, 0.94));
        }
        .data-explorer-r-theme .floating-tool-window-icon {
          border-color: rgba(34, 211, 238, 0.22);
          background: rgba(34, 211, 238, 0.08);
          color: #cffafe;
        }
        .data-explorer-r-theme .floating-tool-window .toolbar-menu-section {
          border-color: rgba(34, 211, 238, 0.08);
          background: linear-gradient(180deg, rgba(18, 38, 52, 0.8), rgba(14, 31, 43, 0.82));
        }
        .data-explorer-r-theme .floating-tool-window-close:hover {
          border-color: rgba(34, 211, 238, 0.14);
          background: rgba(34, 211, 238, 0.08);
          color: #ecfeff;
        }
        .data-explorer-r-theme .toolbar-menu-panel {
          border-color: rgba(34, 211, 238, 0.4);
        }
        .data-explorer-r-theme .toolbar-stat-card {
          border-color: rgba(34, 211, 238, 0.24);
          background: rgba(6, 182, 212, 0.12);
        }
        .data-explorer-r-theme .toolbar-quality-meter {
          border-color: rgba(34, 211, 238, 0.24);
          background: rgba(8, 47, 73, 0.6);
        }
        .data-explorer-r-theme .toolbar-quality-item,
        .data-explorer-r-theme .toolbar-quality-empty {
          border-color: rgba(34, 211, 238, 0.18);
          background: rgba(8, 47, 73, 0.42);
        }
        .data-explorer-r-theme .clean-missing-row-item {
          border-color: rgba(34, 211, 238, 0.2);
          background: rgba(8, 47, 73, 0.44);
        }
        .data-explorer-r-theme .clean-row-picker:hover {
          border-color: rgba(34, 211, 238, 0.52);
          background: rgba(8, 47, 73, 0.62);
        }
        .data-explorer-r-theme .clean-row-picker.is-selected {
          border-color: rgba(34, 211, 238, 0.7);
          background: rgba(34, 211, 238, 0.24);
        }
        .data-explorer-r-theme .clean-missing-row-name,
        .data-explorer-r-theme .clean-missing-row-meta {
          color: rgba(165, 243, 252, 0.9);
        }
        .data-explorer-r-theme .clean-row-selection-summary,
        .data-explorer-r-theme .clean-actions-title {
          color: rgba(165, 243, 252, 0.8);
        }
        .data-explorer-r-theme .toolbar-quality-badge {
          border-color: rgba(34, 211, 238, 0.24);
          background: rgba(6, 182, 212, 0.18);
          color: #cffafe;
        }
        .data-explorer-r-theme .toolbar-quality-jump {
          border-color: rgba(34, 211, 238, 0.24);
          background: rgba(6, 182, 212, 0.16);
          color: #cffafe;
        }
        .data-explorer-r-theme .toolbar-quality-jump:hover {
          border-color: rgba(34, 211, 238, 0.4);
          background: rgba(6, 182, 212, 0.24);
          color: #ecfeff;
        }
        .data-explorer-r-theme .toolbar-stat-label,
        .data-explorer-r-theme .toolbar-menu-copy {
          color: rgba(165, 243, 252, 0.75);
        }
        .data-explorer-r-theme .toolbar-menu-item-active {
          border-color: rgba(34, 211, 238, 0.46);
          background: rgba(34, 211, 238, 0.22);
          color: #ecfeff;
        }
        .data-explorer-r-theme .toolbar-menu-item:hover {
          border-color: rgba(34, 211, 238, 0.5);
          background: rgba(34, 211, 238, 0.18);
        }
        .data-explorer-r-theme .control-label,
        .data-explorer-r-theme .group-controls-label,
        .data-explorer-r-theme .group-controls-hint {
          color: rgba(165, 243, 252, 0.75);
        }
        .data-explorer-r-theme .control-btn,
        .data-explorer-r-theme .group-chip {
          border-color: rgba(34, 211, 238, 0.4);
          background: rgba(6, 182, 212, 0.12);
          color: #e0f2fe;
        }
        .data-explorer-r-theme .control-btn:hover,
        .data-explorer-r-theme .group-chip:hover {
          border-color: rgba(34, 211, 238, 0.6);
          background: rgba(34, 211, 238, 0.2);
        }
        .data-explorer-r-theme .control-btn.is-active,
        .data-explorer-r-theme .group-chip-active {
          border-color: rgba(34, 211, 238, 0.7);
          background: rgba(34, 211, 238, 0.3);
          color: #ecfeff;
        }
        .data-explorer-r-theme .segmented-group {
          border-color: rgba(34, 211, 238, 0.35);
          background: rgba(2, 6, 23, 0.7);
        }
        .data-explorer-r-theme .segmented-group .control-btn.is-active {
          background: rgba(34, 211, 238, 0.3);
          color: #ecfeff;
        }
        .data-explorer-r-theme .columns-quick-shell,
        .data-explorer-r-theme .selection-summary-pill {
          border-color: rgba(34, 211, 238, 0.28);
          background: rgba(6, 182, 212, 0.12);
        }
        .data-explorer-r-theme .columns-quick-panel {
          border-color: rgba(34, 211, 238, 0.26);
          background: rgba(2, 6, 23, 0.72);
        }
        .data-explorer-r-theme .search-input:focus {
          border-color: rgba(148, 163, 184, 0.96);
          box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.18);
        }
        .data-explorer-standard-theme .data-explorer-file-pill,
        .data-explorer-standard-theme .data-explorer-meta-chip,
        .data-explorer-standard-theme .data-explorer-icon-btn,
        .data-explorer-standard-theme .data-explorer-command-surface {
          border-color: rgba(56, 189, 248, 0.16);
        }
        .data-explorer-standard-theme .columns-quick-shell,
        .data-explorer-standard-theme .selection-summary-pill {
          border-color: rgba(56, 189, 248, 0.14);
        }
        .data-explorer-ayu-theme.data-explorer-shell {
          border-color: rgba(230, 180, 80, 0.18);
          box-shadow: 0 28px 54px -34px rgba(0, 0, 0, 0.88), 0 0 0 1px rgba(4, 9, 22, 0.97), 0 14px 30px -24px rgba(8, 10, 16, 0.85);
          background: #030812;
        }
        .data-explorer-ayu-theme::before {
          background:
            radial-gradient(140% 120% at 100% 0%, rgba(108, 117, 125, 0.12), rgba(108, 117, 125, 0) 56%),
            radial-gradient(120% 120% at 0% 100%, rgba(57, 186, 230, 0.1), rgba(57, 186, 230, 0) 52%);
        }
        .data-explorer-ayu-theme .data-explorer-topbar {
          border: none !important;
          background: rgba(5, 8, 13, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .data-explorer-ayu-theme .data-explorer-file-pill,
        .data-explorer-ayu-theme .data-explorer-meta-chip,
        .data-explorer-ayu-theme .data-explorer-icon-btn,
        .data-explorer-ayu-theme .data-explorer-command-surface {
          border-color: rgba(54, 63, 82, 0.84);
        }
        .data-explorer-ayu-theme .data-explorer-file-pill {
          background: linear-gradient(180deg, rgba(31, 36, 46, 0.98), rgba(21, 26, 33, 0.98));
          color: #f8eedb;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 18px 30px -24px rgba(0, 0, 0, 0.82);
        }
        .data-explorer-ayu-theme .data-explorer-file-sheet {
          background: rgba(108, 117, 125, 0.16);
          color: #adb5bd;
        }
        .data-explorer-ayu-theme .data-explorer-meta-chip {
          background: rgba(57, 186, 230, 0.1);
          color: #9fd4e5;
        }
        .data-explorer-ayu-theme .data-explorer-icon-btn {
          border: none !important;
          background: transparent !important;
          border-radius: 50% !important;
          color: #e6e1cf;
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1) !important;
        }
        .data-explorer-ayu-theme .data-explorer-icon-btn:hover {
          background: rgba(108, 117, 125, 0.16) !important;
          color: #f8f9fa;
          transform: scale(1.15) !important;
          box-shadow: 0 0 12px rgba(108, 117, 125, 0.25) !important;
        }
        .data-explorer-ayu-theme .data-explorer-main-close-btn {
          color: #ef4444 !important;
        }
        .data-explorer-ayu-theme .data-explorer-main-close-btn:hover {
          color: #fef2f2 !important;
          background: #b91c1c !important;
          box-shadow: 0 0 12px rgba(185, 28, 28, 0.45) !important;
        }
        .data-explorer-ayu-theme .data-explorer-title-badge {
          background: linear-gradient(135deg, rgba(108, 117, 125, 0.18), rgba(57, 186, 230, 0.08));
          border-color: rgba(108, 117, 125, 0.3);
        }
        .data-explorer-ayu-theme .data-explorer-title-icon {
          color: #f8f9fa;
        }
        .data-explorer-ayu-theme .data-explorer-title-heading {
          color: #f8eedb;
        }
        .data-explorer-ayu-theme .data-explorer-title-subheading {
          color: #b3b1ad;
        }
        .data-explorer-ayu-theme .data-explorer-tabs {
          background: rgba(17, 21, 29, 0.88);
          border-color: rgba(54, 63, 82, 0.84);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 10px 18px -16px rgba(0, 0, 0, 0.78);
        }
        .data-explorer-ayu-theme .data-explorer-tab-btn {
          background: transparent;
          border-color: transparent;
          color: #8a919f;
          box-shadow: none;
        }
        .data-explorer-ayu-theme .data-explorer-tab-btn[data-active="true"] {
          background: linear-gradient(180deg, rgba(108, 117, 125, 0.18), rgba(108, 117, 125, 0.08));
          border-color: rgba(108, 117, 125, 0.34);
          color: #adb5bd;
          box-shadow: 0 10px 18px -18px rgba(108, 117, 125, 0.56);
        }
        .data-explorer-ayu-theme .data-explorer-tab-btn[data-active="false"]:hover {
          color: #f8eedb;
        }
        .data-explorer-ayu-theme .data-explorer-stat-chip {
          background: rgba(31, 36, 46, 0.78);
          border-color: rgba(54, 63, 82, 0.82);
          color: #e6e1cf;
        }
        .data-explorer-ayu-theme .data-explorer-command-surface {
          background: linear-gradient(180deg, #030812 0%, #040c18 100%);
          border-bottom: 1px solid rgba(230, 180, 80, 0.12);
          box-shadow: 0 1px 0 rgba(230, 180, 80, 0.06);
        }
        .data-explorer-ayu-theme .toolbar-menu-trigger,
        .data-explorer-ayu-theme .control-btn,
        .data-explorer-ayu-theme .group-chip,
        .data-explorer-ayu-theme .columns-flyout-link,
        .data-explorer-ayu-theme .columns-quick-btn,
        .data-explorer-ayu-theme .columns-quick-shell {
          border-color: rgba(54, 63, 82, 0.84);
          background: rgba(31, 36, 46, 0.92);
          color: #e6e1cf;
        }
        .data-explorer-ayu-theme .selection-summary-pill,
        .data-explorer-ayu-theme .viewer-notice {
          display: none !important;
        }
        .data-explorer-ayu-theme .toolbar-menu-trigger:hover {
          border-color: transparent;
          background: rgba(0, 95, 115, 0.5);
          color: #f8eedb;
        }
        .data-explorer-ayu-theme .control-btn:hover,
        .data-explorer-ayu-theme .group-chip:hover,
        .data-explorer-ayu-theme .columns-flyout-link:hover,
        .data-explorer-ayu-theme .columns-quick-btn:hover {
          border-color: transparent;
          background: #475569;
          color: #ffffff;
        }
        .data-explorer-ayu-theme .toolbar-menu[open] .toolbar-menu-trigger,
        .data-explorer-ayu-theme .toolbar-floating-trigger.is-open {
          border-color: transparent !important;
          background: #005f73 !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .toolbar-floating-trigger {
          transition:
            transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
            background 220ms ease,
            color 220ms ease,
            border-color 220ms ease;
        }
        .data-explorer-ayu-theme .toolbar-floating-trigger-caret {
          transition:
            transform 280ms cubic-bezier(0.34, 1.2, 0.64, 1),
            color 200ms ease,
            opacity 200ms ease;
        }
        .data-explorer-ayu-theme .control-btn.is-active,
        .data-explorer-ayu-theme .group-chip-active,
        .data-explorer-ayu-theme .segmented-group .control-btn.is-active {
          border-color: transparent !important;
          background: #334155 !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .clean-tool-btn {
          color: #fca5a5 !important;
          border-color: rgba(153, 27, 27, 0.3) !important;
        }
        .data-explorer-ayu-theme .clean-tool-btn:hover {
          background: rgba(153, 27, 27, 0.25) !important;
          border-color: rgba(185, 28, 28, 0.6) !important;
          color: #fecaca !important;
        }
        .data-explorer-ayu-theme .clean-tool-btn.is-open {
          border-color: #7f1d1d !important;
          background: #991b1b !important;
          color: #ffffff !important;
          box-shadow: 0 0 0 1px rgba(185, 28, 28, 0.4), 0 2px 8px rgba(185, 28, 28, 0.3) !important;
        }
        .data-explorer-ayu-theme .floating-tool-window-clean .floating-tool-window-icon {
          color: #fca5a5 !important;
          background: rgba(153, 27, 27, 0.2) !important;
          border-color: rgba(153, 27, 27, 0.4) !important;
        }
        .data-explorer-ayu-theme .control-btn.control-btn-danger {
          color: #fca5a5 !important;
          border-color: rgba(153, 27, 27, 0.3) !important;
          background: rgba(153, 27, 27, 0.1) !important;
        }
        .data-explorer-ayu-theme .control-btn.control-btn-danger:hover {
          background: rgba(153, 27, 27, 0.3) !important;
          border-color: rgba(185, 28, 28, 0.6) !important;
          color: #fecaca !important;
        }
        .data-explorer-ayu-theme .clean-action-btn {
          background: #7f1d1d !important;
          color: #fef2f2 !important;
          border-color: #991b1b !important;
          box-shadow: 0 4px 12px rgba(153, 27, 27, 0.4) !important;
        }
        .data-explorer-ayu-theme .clean-action-btn:hover {
          background: #991b1b !important;
          border-color: #b91c1c !important;
          transform: translateY(-1px);
        }
        .data-explorer-ayu-theme .segmented-group {
          border-color: rgba(54, 63, 82, 0.84);
          background: rgba(17, 21, 29, 0.88);
        }
        .data-explorer-ayu-theme .segmented-label,
        .data-explorer-ayu-theme .control-label,
        .data-explorer-ayu-theme .selection-summary,
        .data-explorer-ayu-theme .toolbar-menu-copy,
        .data-explorer-ayu-theme .toolbar-menu-label,
        .data-explorer-ayu-theme .columns-flyout-meta,
        .data-explorer-ayu-theme .group-controls-hint,
        .data-explorer-ayu-theme .sheet-tabs-label {
          color: #8a919f;
        }
        .data-explorer-ayu-theme .toolbar-menu-panel,
        .data-explorer-ayu-theme .columns-flyout,
        .data-explorer-ayu-theme .floating-tool-window,
        .data-explorer-ayu-theme .floating-tool-window .toolbar-menu-section,
        .data-explorer-ayu-theme .floating-tool-window-columns .columns-quick-panel {
          border-color: rgba(54, 63, 82, 0.88);
        }
        .data-explorer-ayu-theme .toolbar-quality-meter {
          border-color: rgba(54, 63, 82, 0.88);
          background: rgba(32, 37, 47, 0.96);
        }
        .data-explorer-ayu-theme .toolbar-quality-item,
        .data-explorer-ayu-theme .toolbar-quality-empty {
          border-color: rgba(54, 63, 82, 0.88);
          background: rgba(32, 37, 47, 0.92);
        }
        .data-explorer-ayu-theme .clean-missing-row-item {
          border-color: rgba(54, 63, 82, 0.88);
          background: rgba(32, 37, 47, 0.92);
        }
        .data-explorer-ayu-theme .clean-row-picker:hover {
          border-color: #264653;
          background: #1e1e1e;
        }
        .data-explorer-ayu-theme .clean-row-picker.is-selected {
          border-color: #264653;
          background: rgba(38, 70, 83, 0.45);
        }
        .data-explorer-ayu-theme .clean-missing-row-name {
          color: #e6e1cf;
        }
        .data-explorer-ayu-theme .clean-missing-row-meta {
          color: #8a919f;
        }
        .data-explorer-ayu-theme .clean-row-selection-summary,
        .data-explorer-ayu-theme .clean-actions-title {
          color: #8a919f;
        }
        .data-explorer-ayu-theme .toolbar-quality-copy strong,
        .data-explorer-ayu-theme .toolbar-quality-legend strong {
          color: #e6e1cf;
        }
        .data-explorer-ayu-theme .toolbar-quality-copy span,
        .data-explorer-ayu-theme .toolbar-quality-legend,
        .data-explorer-ayu-theme .toolbar-quality-empty {
          color: #8a919f;
        }
        .data-explorer-ayu-theme .toolbar-quality-badge {
          border-color: rgba(108, 117, 125, 0.34);
          background: rgba(108, 117, 125, 0.14);
          color: #f8f9fa;
        }
        .data-explorer-ayu-theme .toolbar-quality-jump {
          border-color: rgba(108, 117, 125, 0.28);
          background: rgba(108, 117, 125, 0.12);
          color: #f8f9fa;
        }
        .data-explorer-ayu-theme .toolbar-quality-jump:hover {
          border-color: rgba(108, 117, 125, 0.42);
          background: rgba(108, 117, 125, 0.2);
          color: #dee2e6;
        }
        .data-explorer-ayu-theme .toolbar-menu-panel,
        .data-explorer-ayu-theme .columns-flyout {
          background: #171b24;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(108, 117, 125, 0.1) !important;
        }
        .data-explorer-ayu-theme .toolbar-menu-item {
          background: transparent;
          border-color: transparent;
          color: #e6e1cf;
        }
        .data-explorer-ayu-theme .toolbar-menu-item:hover {
          border-color: rgba(108, 117, 125, 0.34);
          background: rgba(108, 117, 125, 0.12);
          color: #f8f9fa;
        }
        .data-explorer-ayu-theme .toolbar-menu-item.toolbar-menu-item-active,
        .data-explorer-ayu-theme .toolbar-menu-item[aria-checked="true"] {
          border-color: #f8f9fa;
          background: rgba(108, 117, 125, 0.82);
          color: #000;
        }
        .data-explorer-ayu-theme .toolbar-menu-item.toolbar-menu-item-danger {
          color: #fca5a5;
        }
        .data-explorer-ayu-theme .toolbar-menu-item.toolbar-menu-item-danger:hover {
          background: rgba(153, 27, 27, 0.25);
          border-color: rgba(185, 28, 28, 0.6);
          color: #fecaca;
        }
        .data-explorer-ayu-theme .toolbar-menu-section + .toolbar-menu-section {
          border-top-color: rgba(54, 63, 82, 0.5) !important;
        }
        .data-explorer-ayu-theme .floating-tool-window {
          --floating-window-bg: #111620;
          --floating-window-bg-strong: #181e2a;
          --floating-window-section: #161c28;
          --floating-window-border: rgba(50, 60, 82, 0.88);
          --floating-window-border-strong: rgba(108, 117, 125, 0.42);
          --floating-window-text: #e6e1cf;
          --floating-window-muted: #8a919f;
          --floating-window-accent: #6c757d;
          --floating-window-accent-soft: rgba(108, 117, 125, 0.18);
          --floating-window-hover: #1e2635;
          --floating-window-active: rgba(108, 117, 125, 0.14);
          border-color: rgba(50, 60, 82, 0.88);
          background: linear-gradient(180deg, #181e2a 0%, #111620 100%);
          box-shadow:
            0 0 0 1px rgba(108, 117, 125, 0.06),
            0 32px 68px -34px rgba(0, 0, 0, 0.96),
            0 12px 26px -16px rgba(0, 0, 0, 0.72);
          transition:
            transform 110ms ease-out,
            box-shadow 220ms ease,
            opacity 200ms ease;
        }
        .data-explorer-ayu-theme .floating-tool-window-icon {
          border-color: rgba(108, 117, 125, 0.22);
          background: rgba(108, 117, 125, 0.1);
          color: #f8f9fa;
        }
        .data-explorer-ayu-theme .floating-tool-window-header {
          background: transparent;
          border-bottom: 1px solid rgba(50, 60, 82, 0.6);
        }
        .data-explorer-ayu-theme .floating-tool-window::after {
          background: linear-gradient(90deg, transparent, rgba(108, 117, 125, 0.18), transparent);
          top: 0;
          height: 1px;
        }
        .data-explorer-ayu-theme .floating-tool-window-body {
          background: transparent;
        }

        /* AyuSelect Premium Styling */
        .data-explorer-ayu-theme .ayu-select-trigger {
          background: var(--floating-window-bg-strong);
          border: 1px solid var(--floating-window-border);
          color: var(--floating-window-muted);
          border-radius: 8px;
          height: 34px;
          padding: 0 10px;
          transition:
            transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
            border-color 220ms ease,
            background 220ms ease,
            color 220ms ease,
            box-shadow 240ms ease;
        }
        .data-explorer-ayu-theme .ayu-select-trigger:hover {
          border-color: var(--floating-window-border-strong);
          background: var(--floating-window-hover);
          color: var(--floating-window-text);
          transform: translateY(-1px);
          box-shadow: 0 12px 24px -18px rgba(0, 0, 0, 0.66);
        }
        .data-explorer-ayu-theme .ayu-select-trigger.is-open {
          border-color: var(--floating-window-accent);
          background: var(--floating-window-hover);
          color: var(--floating-window-text);
          box-shadow: 0 0 0 2px var(--floating-window-accent-soft), 0 14px 28px -20px rgba(0, 0, 0, 0.72);
        }
        .data-explorer-ayu-theme .ayu-select-trigger:focus-visible {
          outline: 2px solid var(--floating-window-accent);
          outline-offset: 1px;
        }
        .data-explorer-ayu-theme .ayu-select-panel {
          background: var(--floating-window-bg-strong);
          border: 1px solid var(--floating-window-border);
          border-radius: 12px;
          padding: 6px;
          box-shadow: 
            0 4px 6px -1px rgba(0, 0, 0, 0.3),
            0 10px 24px -4px rgba(0, 0, 0, 0.7),
            0 0 0 1px rgba(255, 255, 255, 0.04);
          transition:
            transform 240ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 180ms ease,
            border-color 180ms ease;
          z-index: 1000;
        }
        .data-explorer-ayu-theme .ayu-select-panel-secondary-head {
          border-bottom-color: var(--floating-window-border);
        }
        .data-explorer-ayu-theme .ayu-select-panel-secondary-title {
          color: var(--floating-window-muted);
        }
        .data-explorer-ayu-theme .ayu-select-item {
          color: var(--floating-window-muted);
          border-radius: 6px;
          padding: 8px 10px;
          margin-bottom: 2px;
          font-weight: 500;
          font-size: 0.82rem;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .data-explorer-ayu-theme .ayu-select-item:last-child {
          margin-bottom: 0;
        }
        .data-explorer-ayu-theme .ayu-select-item:hover {
          background: var(--floating-window-hover);
          color: var(--floating-window-text);
        }
        .data-explorer-ayu-theme .ayu-select-item.is-active {
          background: var(--floating-window-active);
          color: var(--floating-window-accent);
          font-weight: 600;
        }
        .data-explorer-ayu-theme .floating-tool-window-close {
          width: 13px !important;
          height: 13px !important;
          min-width: 13px !important;
          min-height: 13px !important;
          border-radius: 50% !important;
          background-color: #ff5f56 !important;
          border: 1px solid #e0443e !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          margin: 0 4px !important;
          cursor: pointer !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .floating-tool-window-close svg {
          stroke: #4c0000 !important;
          opacity: 0 !important;
          transition: opacity 0.15s ease-in-out !important;
        }
        .data-explorer-ayu-theme .floating-tool-window-close:hover svg {
          opacity: 1 !important;
        }
        /* ── Ayu theme: inject floating-window token set onto the studio scope ── */
        .data-explorer-ayu-theme {
          --floating-window-bg: #1c2028;
          --floating-window-bg-strong: #242a34;
          --floating-window-section: #20262f;
          --floating-window-border: rgba(70, 81, 99, 0.78);
          --floating-window-border-strong: rgba(100, 114, 135, 0.9);
          --floating-window-text: #e6e1cf;
          --floating-window-muted: #8a919f;
          --floating-window-accent: #4fc1ff;
          --floating-window-accent-soft: rgba(79, 193, 255, 0.16);
          --floating-window-hover: #2c3340;
          --floating-window-active: #16384f;
        }
        .data-explorer-ayu-theme .studio-preview-panel,
        .data-explorer-ayu-theme .studio-preview-header,
        .data-explorer-ayu-theme .studio-surface,
        .data-explorer-ayu-theme .studio-banner,
        .data-explorer-ayu-theme .studio-card,
        .data-explorer-ayu-theme .studio-input-panel,
        .data-explorer-ayu-theme .studio-drop-panel,
        .data-explorer-ayu-theme .studio-var-control {
          border-color: var(--floating-window-border);
        }
        .data-explorer-ayu-theme .studio-var-control {
          background: var(--floating-window-bg-strong);
          color: var(--floating-window-text);
        }
        .data-explorer-ayu-theme .studio-var-control:focus,
        .data-explorer-ayu-theme .search-input:focus {
          border-color: var(--floating-window-accent) !important;
          box-shadow: 0 0 0 2px var(--floating-window-accent-soft) !important;
        }
        /* ── group-chip → floating window token style ── */
        .data-explorer-ayu-theme .group-chip {
          background: var(--floating-window-bg-strong);
          border-color: var(--floating-window-border);
          color: var(--floating-window-muted);
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
        }
        .data-explorer-ayu-theme .group-chip:hover {
          background: var(--floating-window-hover);
          border-color: var(--floating-window-border-strong);
          color: var(--floating-window-text);
        }
        .data-explorer-ayu-theme .studio-preview-panel {
          background:
            radial-gradient(140% 120% at 100% 0%, rgba(79, 193, 255, 0.06), rgba(79, 193, 255, 0) 55%),
            var(--floating-window-bg);
        }
        .data-explorer-ayu-theme .studio-preview-header {
          background: var(--floating-window-bg-strong);
          border-color: var(--floating-window-border);
        }
        /* ── studio-banner / studio-card → floating window depth ── */
        .data-explorer-ayu-theme .studio-banner {
          background: linear-gradient(180deg, var(--floating-window-bg-strong), var(--floating-window-bg));
          box-shadow:
            0 32px 56px -36px rgba(0, 0, 0, 0.86),
            0 12px 24px -16px rgba(15, 23, 42, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }
        .data-explorer-ayu-theme .studio-card {
          background: linear-gradient(180deg, var(--floating-window-bg-strong) 0%, var(--floating-window-bg) 100%);
          border-radius: 0.95rem;
          border-color: var(--floating-window-border);
          box-shadow:
            0 32px 64px -36px rgba(0, 0, 0, 0.82),
            0 12px 26px -16px rgba(15, 23, 42, 0.56),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
        }
        .data-explorer-ayu-theme .studio-card:hover {
          border-color: var(--floating-window-border-strong);
          box-shadow:
            0 36px 68px -34px rgba(0, 0, 0, 0.88),
            0 16px 30px -18px rgba(15, 23, 42, 0.65),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          transform: translateY(-1px);
        }
        /* Top edge highlight matching floating-tool-window::after */
        .data-explorer-ayu-theme .studio-card::after {
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.10), transparent);
          opacity: 1;
        }
        .data-explorer-ayu-theme .studio-card::before {
          background: linear-gradient(90deg, var(--floating-window-accent) 0%, rgba(79, 193, 255, 0.12) 60%, transparent 100%);
          opacity: 0.45;
        }
        .data-explorer-ayu-theme .studio-input-panel,
        .data-explorer-ayu-theme .studio-drop-panel {
          background: linear-gradient(180deg, var(--floating-window-section), var(--floating-window-bg));
          box-shadow: 0 14px 28px -18px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
        /* ── studio-card-head → gradient strip like floating-tool-window-header ── */
        .data-explorer-ayu-theme .studio-card-head {
          padding: 0.72rem 0.6rem;
          border-radius: 0.82rem;
          background: linear-gradient(180deg, var(--floating-window-bg-strong) 0%, transparent 100%);
          transition:
            transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
            background 200ms ease,
            color 200ms ease;
        }
        .data-explorer-ayu-theme .studio-card-head:hover {
          transform: translateY(-1px);
          background: linear-gradient(180deg, var(--floating-window-hover) 0%, transparent 100%);
        }
        /* ── studio-panel-collapse → matching floating window body bg + border ── */
        .data-explorer-ayu-theme .studio-panel-body {
          border-top: none;
        }
        .data-explorer-ayu-theme .studio-panel-collapse {
          background: linear-gradient(180deg, var(--floating-window-bg-strong), var(--floating-window-bg) 100%);
          border-color: var(--floating-window-border);
          border-radius: 0.95rem;
          box-shadow:
            0 32px 64px -36px rgba(0, 0, 0, 0.82),
            0 12px 26px -16px rgba(15, 23, 42, 0.56);
        }
        /* ── studio-icon-wrap → floating-tool-window-icon style ── */
        .data-explorer-ayu-theme .studio-icon-wrap {
          border-color: rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.04);
          box-shadow: none;
          color: var(--floating-window-accent);
        }
        /* ── studio-status-pill → floating window close-button style ── */
        .data-explorer-ayu-theme .studio-status-pill {
          border-color: var(--floating-window-border);
          background: rgba(255, 255, 255, 0.03);
          color: var(--floating-window-muted);
          transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
        }
        .data-explorer-ayu-theme .studio-status-pill-open {
          border-color: var(--floating-window-accent);
          background: var(--floating-window-accent-soft);
          color: var(--floating-window-accent);
          box-shadow: 0 4px 12px -8px rgba(79, 193, 255, 0.5);
        }
        /* ── All text tokens → floating window palette ── */
        .data-explorer-ayu-theme .studio-head-title,
        .data-explorer-ayu-theme .studio-drop-title,
        .data-explorer-ayu-theme .studio-section-title,
        .data-explorer-ayu-theme .studio-surface .text-slate-800,
        .data-explorer-ayu-theme .studio-surface .text-slate-700 {
          color: var(--floating-window-text) !important;
        }
        .data-explorer-ayu-theme .studio-head-subtitle,
        .data-explorer-ayu-theme .studio-field-label,
        .data-explorer-ayu-theme .studio-surface .text-slate-600,
        .data-explorer-ayu-theme .studio-surface .text-slate-500,
        .data-explorer-ayu-theme .studio-surface .text-slate-400,
        .data-explorer-ayu-theme .studio-preview-panel .text-slate-600,
        .data-explorer-ayu-theme .studio-preview-panel .text-slate-500,
        .data-explorer-ayu-theme .studio-preview-panel .text-slate-400 {
          color: var(--floating-window-muted) !important;
        }
        /* ── studio-input-panel → floating window section card ── */
        .data-explorer-ayu-theme .studio-input-panel {
          background: linear-gradient(180deg, var(--floating-window-section), var(--floating-window-bg));
          border-color: var(--floating-window-border);
          border-radius: 0.82rem;
          box-shadow:
            0 18px 36px -24px rgba(0, 0, 0, 0.72),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .data-explorer-ayu-theme .studio-input-panel:hover {
          border-color: var(--floating-window-border-strong);
          box-shadow:
            0 22px 40px -24px rgba(0, 0, 0, 0.78),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          transform: translateY(-1px);
        }
        /* ── studio-drop-panel → same section card with accent tint ── */
        .data-explorer-ayu-theme .studio-drop-panel {
          background: linear-gradient(160deg, rgba(79, 193, 255, 0.06), var(--floating-window-bg));
          border-color: var(--floating-window-border);
          border-radius: 0.82rem;
          box-shadow:
            0 18px 36px -24px rgba(0, 0, 0, 0.72),
            inset 0 1px 0 rgba(79, 193, 255, 0.08);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .data-explorer-ayu-theme .studio-drop-panel:hover {
          border-color: var(--floating-window-border-strong);
          box-shadow:
            0 22px 40px -24px rgba(0, 0, 0, 0.78),
            inset 0 1px 0 rgba(79, 193, 255, 0.12);
          transform: translateY(-1px);
        }
        /* ── studio-segment → pill styled to match floating window ── */
        .data-explorer-ayu-theme .studio-segment {
          background: var(--floating-window-bg-strong);
          border-color: var(--floating-window-border);
        }
        .data-explorer-ayu-theme .studio-segment-btn {
          color: var(--floating-window-muted);
        }
        .data-explorer-ayu-theme .studio-segment-btn:hover {
          background: var(--floating-window-hover);
          color: var(--floating-window-text);
        }
        .data-explorer-ayu-theme .studio-segment-btn[aria-pressed="true"],
        .data-explorer-ayu-theme .studio-segment-btn.is-active {
          background: var(--floating-window-accent-soft);
          color: var(--floating-window-accent);
        }
        /* ── studio-var-control → floating window input style ── */
        .data-explorer-ayu-theme .studio-var-control {
          background: var(--floating-window-bg-strong);
          border-color: var(--floating-window-border);
          color: var(--floating-window-text);
          border-radius: 0.75rem;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
        .data-explorer-ayu-theme .studio-var-control:focus {
          border-color: var(--floating-window-accent) !important;
          box-shadow: 0 0 0 2px var(--floating-window-accent-soft) !important;
        }
        /* ── studio-groupby-selector-shell → floating window close-btn style ── */
        .data-explorer-ayu-theme .studio-groupby-selector-shell {
          background: var(--floating-window-bg-strong);
          border-color: var(--floating-window-border);
        }
        .data-explorer-ayu-theme .studio-groupby-selector-label {
          color: var(--floating-window-muted);
        }
        /* ── studio-surface (sidebar bg) → unified dark bg ── */
        .data-explorer-ayu-theme .studio-surface {
          background: linear-gradient(180deg, var(--floating-window-bg), #14171e 100%);
        }
        /* ── studio-bottom-shell → floating window footer dept ── */
        .data-explorer-ayu-theme .studio-bottom-shell {
          background: linear-gradient(180deg, var(--floating-window-bg-strong), var(--floating-window-bg));
          border-color: var(--floating-window-border);
          box-shadow: 0 -18px 32px -24px rgba(0, 0, 0, 0.6);
        }
        /* ── studio-banner header ── */
        .data-explorer-ayu-theme .studio-banner h3 {
          color: var(--floating-window-text) !important;
        }
        .data-explorer-ayu-theme .studio-banner p {
          color: var(--floating-window-muted) !important;
        }
        .input-std,
        .select-std {
          width: 100%;
          padding: 0.6rem 0.85rem;
          font-size: 0.88rem;
          line-height: 1.35rem;
          border-radius: 0.9rem;
          border: 1px solid rgba(99, 102, 241, 0.18);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.92));
          color: #0f172a;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 10px 18px -16px rgba(15, 23, 42, 0.35);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
        }
        .input-std::placeholder,
        .select-std::placeholder {
          color: rgba(71, 85, 105, 0.78);
        }
        .input-std:focus,
        .select-std:focus {
          border-color: rgba(79, 70, 229, 0.7);
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.18), 0 12px 22px -18px rgba(79, 70, 229, 0.6);
          transform: translateY(-0.5px);
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.7rem 1.2rem;
          border-radius: 0.95rem;
          border: 1px solid rgba(30, 64, 175, 0.24);
          background: linear-gradient(130deg, #2563eb, #1d4ed8);
          color: #ffffff;
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          box-shadow: 0 16px 28px -20px rgba(29, 78, 216, 0.85);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .btn-primary:hover {
          transform: translateY(-1.5px);
          box-shadow: 0 18px 32px -20px rgba(29, 78, 216, 0.95);
          filter: brightness(1.03);
        }
        .btn-primary:active {
          transform: translateY(0);
        }
        .btn-danger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.7rem 1.2rem;
          border-radius: 0.95rem;
          border: 1px solid rgba(244, 63, 94, 0.28);
          background: linear-gradient(130deg, rgba(248, 113, 113, 0.95), rgba(239, 68, 68, 0.95));
          color: #ffffff;
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          box-shadow: 0 16px 28px -20px rgba(225, 29, 72, 0.78);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .btn-danger:hover {
          transform: translateY(-1.5px);
          box-shadow: 0 18px 32px -20px rgba(225, 29, 72, 0.95);
          filter: brightness(1.02);
        }
        .studio-input-panel {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 1rem;
          border: 1px solid rgba(148, 163, 184, 0.32);
          background: linear-gradient(140deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.9));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .studio-input-panel:hover {
          transform: translateY(-1px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 14px 24px -22px rgba(15, 23, 42, 0.45);
        }
        .data-explorer-standard-theme .studio-input-panel {
          border-color: rgba(56, 189, 248, 0.26);
          background:
            radial-gradient(120% 120% at 100% 0%, rgba(56, 189, 248, 0.12), rgba(56, 189, 248, 0) 52%),
            rgba(11, 18, 32, 0.96);
          box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.18);
        }
        .studio-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          min-width: 0;
        }
        .studio-field-label {
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #64748b;
        }
        .studio-action-row {
          display: flex;
          justify-content: flex-end;
        }
        .studio-drop-panel {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 1rem;
          border: 1px solid rgba(59, 130, 246, 0.24);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(15, 23, 42, 0.02));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .studio-drop-panel:hover {
          transform: translateY(-1px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 14px 24px -22px rgba(15, 23, 42, 0.45);
        }
        .data-explorer-standard-theme .studio-drop-panel {
          border-color: rgba(56, 189, 248, 0.28);
          background:
            radial-gradient(120% 120% at 100% 0%, rgba(56, 189, 248, 0.14), rgba(56, 189, 248, 0) 52%),
            rgba(11, 18, 32, 0.96);
          box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.18);
        }
        .studio-drop-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .studio-drop-title {
          font-size: 0.7rem;
          font-weight: 700;
        }
        .studio-segment {
          display: inline-flex;
          align-items: center;
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          background: rgba(248, 250, 252, 0.9);
          overflow: hidden;
        }
        .data-explorer-standard-theme .studio-segment {
          border-color: rgba(56, 189, 248, 0.3);
          background: rgba(2, 6, 23, 0.7);
        }
        .studio-segment-btn {
          padding: 0.4rem 0.85rem;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #475569;
          background: transparent;
          border: none;
          transition: background 0.16s ease, color 0.16s ease;
        }
        .data-explorer-standard-theme .studio-segment-btn {
          color: rgba(186, 230, 253, 0.9);
        }
        .studio-segment-btn:hover {
          background: rgba(59, 130, 246, 0.12);
          color: #1e3a8a;
        }
        .data-explorer-standard-theme .studio-segment-btn:hover {
          background: rgba(56, 189, 248, 0.18);
          color: #e0f2fe;
        }
        .studio-segment-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .studio-groupby-selector-shell {
          border-color: rgba(148, 163, 184, 0.45);
          background: rgba(248, 250, 252, 0.06);
        }
        .studio-groupby-selector-label {
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
          color: #64748b;
        }
        .studio-groupby-select {
          min-width: 170px;
          max-width: 230px;
        }
        .data-explorer-standard-theme .studio-groupby-selector-shell {
          border-color: rgba(56, 189, 248, 0.32);
          background: rgba(2, 6, 23, 0.52);
        }
        .data-explorer-standard-theme .studio-groupby-selector-label {
          color: rgba(186, 230, 253, 0.95);
        }
        .data-explorer-r-theme .studio-groupby-selector-shell {
          border-color: rgba(34, 211, 238, 0.35);
          background: rgba(8, 47, 73, 0.45);
        }
        .data-explorer-r-theme .studio-groupby-selector-label {
          color: rgba(165, 243, 252, 0.92);
        }
        .studio-drop-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 0.6rem;
        }
        .header-group-levels {
          scrollbar-width: none;
        }
        .header-group-levels::-webkit-scrollbar {
          display: none;
        }
        .header-group-select {
          width: 160px;
        }
        .columns-quick-panel {
          scrollbar-width: none;
        }
        .columns-quick-panel::-webkit-scrollbar {
          display: none;
        }
        .col-color-input {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid rgba(148, 163, 184, 0.6);
          background: rgba(15, 23, 42, 0.4);
          padding: 0;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
        }
        .col-color-input::-webkit-color-swatch-wrapper {
          padding: 0;
        }
        .col-color-input::-webkit-color-swatch {
          border: none;
          border-radius: 3px;
        }
        .col-color-input::-moz-color-swatch {
          border: none;
          border-radius: 3px;
        }
        .col-color-clear {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid rgba(148, 163, 184, 0.45);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.25);
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .col-color-clear:hover {
          background: rgba(148, 163, 184, 0.18);
          border-color: rgba(148, 163, 184, 0.7);
        }
        .dark .col-color-input {
          border-color: rgba(148, 163, 184, 0.5);
          background: rgba(15, 23, 42, 0.7);
        }
        .dark .col-color-clear {
          background: rgba(15, 23, 42, 0.6);
        }
        .data-explorer-r-theme .col-color-input {
          border-color: rgba(34, 211, 238, 0.4);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
        }
        .data-explorer-r-theme .col-color-clear {
          border-color: rgba(34, 211, 238, 0.4);
          background: rgba(6, 182, 212, 0.12);
        }
        .sheet-tabs-shell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .sheet-tabs-label {
          font-size: 0.62rem;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #64748b;
        }
        .sheet-tabs-scroll {
          flex: 1;
          overflow-x: auto;
          padding-bottom: 2px;
        }
        .sheet-tabs {
          display: inline-flex;
          align-items: flex-end;
          gap: 0.35rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.45);
          padding-bottom: 2px;
        }
        .sheet-tab {
          appearance: none;
          border: 1px solid transparent;
          border-bottom: none;
          padding: 0.35rem 0.95rem;
          font-size: 0.72rem;
          font-weight: 700;
          border-radius: 0.75rem 0.75rem 0 0;
          background: transparent;
          color: #475569;
          transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
          white-space: nowrap;
        }
        .sheet-tab:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .sheet-tab-active {
          background: #ffffff;
          border-color: rgba(148, 163, 184, 0.6);
          color: #0f172a;
          box-shadow: 0 -1px 0 #ffffff, 0 -6px 16px rgba(15, 23, 42, 0.12);
        }
        .sheet-tab-light {
          background: rgba(248, 250, 252, 0.7);
        }
        .sheet-tab-light:not(.sheet-tab-active):hover {
          background: rgba(226, 232, 240, 0.7);
        }
        .dark .sheet-tabs-label {
          color: #9ca3af;
        }
        .dark .sheet-tabs {
          border-bottom-color: rgba(63, 63, 70, 0.85);
        }
        .dark .sheet-tab {
          color: #d4d4d8;
          background: rgba(24, 24, 27, 0.85);
        }
        .dark .sheet-tab-active {
          background: #111111;
          border-color: rgba(82, 82, 91, 0.82);
          color: #ecfeff;
          box-shadow: 0 -1px 0 #111111, 0 -6px 16px rgba(0, 0, 0, 0.55);
        }
        .data-explorer-ayu-theme .sheet-tabs {
          border-bottom-color: #333333;
        }
        .data-explorer-ayu-theme .sheet-tab {
          color: #8a919f;
          border-color: transparent;
          background: #131313;
        }
        .data-explorer-ayu-theme .sheet-tab:hover:not(:disabled) {
          background: #1e1e1e;
          color: #d9d7ce;
        }
        .data-explorer-ayu-theme .sheet-tab-active {
          background: #1e1e1e;
          border-color: #4b5568;
          color: #00f5ff;
          box-shadow: 0 -1px 0 #1e1e1e, 0 -6px 14px rgba(0, 0, 0, 0.5);
        }
        .data-explorer-r-theme .sheet-tabs-label {
          color: rgba(165, 243, 252, 0.75);
        }
        .data-explorer-r-theme .sheet-tabs {
          border-bottom-color: rgba(34, 211, 238, 0.35);
        }
        .data-explorer-r-theme .sheet-tab {
          color: rgba(165, 243, 252, 0.85);
          background: rgba(2, 16, 28, 0.75);
        }
        .data-explorer-r-theme .sheet-tab-active {
          background: #0c1a2f;
          border-color: rgba(34, 211, 238, 0.45);
          color: #e0f2fe;
          box-shadow: 0 -1px 0 #0c1a2f, 0 -6px 16px rgba(2, 6, 23, 0.6);
        }
        .sheet-tab:disabled {
          opacity: 0.5;
        }
        .studio-surface {
          background:
            radial-gradient(circle at 92% -8%, rgba(14, 165, 233, 0.08), transparent 40%),
            radial-gradient(circle at 0% 110%, rgba(99, 102, 241, 0.07), transparent 42%);
        }
        .data-explorer-standard-theme .studio-preview-panel {
          border-color: rgba(56, 189, 248, 0.22);
          background:
            radial-gradient(120% 120% at 100% 0%, rgba(56, 189, 248, 0.12), rgba(56, 189, 248, 0) 52%),
            rgba(11, 18, 32, 0.96);
        }
        .data-explorer-standard-theme .studio-preview-header {
          border-color: rgba(56, 189, 248, 0.2);
          background: rgba(11, 18, 32, 0.9);
        }
        .data-explorer-standard-theme .studio-surface {
          background:
            radial-gradient(120% 120% at 100% 0%, rgba(56, 189, 248, 0.12), rgba(56, 189, 248, 0) 52%),
            rgba(11, 18, 32, 0.96);
        }
        .studio-banner {
          position: relative;
          overflow: hidden;
          border-radius: 1.35rem;
          backdrop-filter: blur(12px);
          box-shadow: 0 18px 30px -26px rgba(15, 23, 42, 0.7);
          animation: explorer-fade-up 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .studio-banner::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.12), transparent 45%);
          pointer-events: none;
        }
        .data-explorer-standard-theme .studio-banner {
          border-color: rgba(56, 189, 248, 0.22);
          background: linear-gradient(160deg, rgba(8, 24, 44, 0.96), rgba(11, 18, 32, 0.92));
          box-shadow: 0 18px 30px -26px rgba(2, 6, 23, 0.9);
        }
        .studio-card {
          --studio-accent: 14 165 233;
          position: relative;
          overflow: hidden;
          border-radius: 1.4rem;
          border-color: rgb(var(--studio-accent) / 0.24);
          background: linear-gradient(180deg, rgb(255 255 255 / 0.95), rgb(248 250 252 / 0.9));
          box-shadow: 0 34px 56px -38px rgb(2 6 23 / 0.72), inset 0 1px 0 rgb(255 255 255 / 0.56);
          backdrop-filter: blur(14px);
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
          animation: explorer-fade-up 560ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .studio-card::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 1px;
          background: linear-gradient(90deg, rgb(var(--studio-accent) / 0.86), rgb(var(--studio-accent) / 0.1));
        }
        .studio-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(130% 120% at 100% 0%, rgb(var(--studio-accent) / 0.14), transparent 58%);
          opacity: 0.16;
          transition: opacity 0.22s ease;
          pointer-events: none;
        }
        .studio-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 38px 64px -40px rgb(2 6 23 / 0.86), inset 0 1px 0 rgb(255 255 255 / 0.64);
        }
        .studio-card:hover::after {
          opacity: 0.42;
        }
        .data-explorer-standard-theme .studio-card {
          border-color: rgb(var(--studio-accent) / 0.28);
          background: linear-gradient(180deg, rgba(15, 24, 43, 0.92), rgba(8, 14, 28, 0.96));
          box-shadow: 0 34px 56px -38px rgba(2, 6, 23, 0.98), inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }
        .studio-card-merge {
          --studio-accent: 14 165 233;
        }
        .studio-card-reshape {
          --studio-accent: 16 185 129;
        }
        .studio-card-filter {
          --studio-accent: 245 158 11;
        }
        .studio-card-select {
          --studio-accent: 99 102 241;
        }
        .studio-card-arrange {
          --studio-accent: 56 189 248;
        }
        .studio-card-distinct {
          --studio-accent: 139 92 246;
        }
        .studio-card-head {
          text-align: left;
          transition: transform 0.2s ease, color 0.2s ease;
        }
        .studio-card-head:hover .studio-toggle-chevron {
          opacity: 1;
        }
        .studio-head-main {
          min-width: 0;
        }
        .studio-icon-wrap {
          width: 2rem;
          height: 2rem;
          border-radius: 0.65rem;
          border: 1px solid rgb(var(--studio-accent) / 0.36);
          background: rgb(var(--studio-accent) / 0.14);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.32);
        }
        .studio-head-title {
          font-size: 0.82rem;
          letter-spacing: 0.01em;
          line-height: 1.25;
        }
        .studio-head-subtitle {
          font-size: 0.64rem;
          line-height: 1.1rem;
        }
        .studio-status-pill {
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.45);
          padding: 0.2rem 0.5rem;
          font-size: 0.59rem;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #64748b;
          background: rgba(248, 250, 252, 0.88);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .studio-status-pill-open {
          border-color: rgb(var(--studio-accent) / 0.45);
          color: rgb(var(--studio-accent) / 0.95);
          background: rgb(var(--studio-accent) / 0.16);
          box-shadow: 0 8px 16px -12px rgb(var(--studio-accent) / 0.6);
        }
        .studio-toggle-chevron {
          flex-shrink: 0;
          opacity: 0.76;
          transform: rotate(-90deg);
          transition:
            transform 280ms cubic-bezier(0.34, 1.2, 0.64, 1),
            opacity 180ms ease,
            color 180ms ease;
        }
        .studio-toggle-chevron.is-open {
          transform: rotate(0deg);
          opacity: 1;
        }
        .studio-card-wrapper {
          position: relative;
        }
        .studio-panel-collapse {
          position: relative;
          left: auto;
          right: auto;
          top: auto;
          z-index: auto;
          display: block;
          margin-top: 0.5rem;
          opacity: 1;
          transform: none;
          border-radius: 1rem;
          border: 1px solid var(--studio-float-border, rgba(71, 85, 105, 0.55));
          background: var(--studio-float-bg, rgba(15, 23, 42, 0.96));
          box-shadow: 0 18px 30px -22px rgba(0, 0, 0, 0.86);
        }
        .studio-panel-collapse > .studio-panel-body {
          min-height: 0;
          overflow: visible;
        }
        .studio-panel-body {
          padding: 0.85rem;
        }
        .data-explorer-standard-theme .studio-panel-body {
          border-top-color: rgba(56, 189, 248, 0.22);
        }
        .studio-section-title {
          letter-spacing: 0.08em;
        }
        .studio-divider {
          opacity: 0.85;
        }
        .studio-var-control {
          border-color: rgba(148, 163, 184, 0.55);
          background: rgba(255, 255, 255, 0.96);
        }
        .data-explorer-standard-theme .studio-var-control {
          border-color: rgba(56, 189, 248, 0.3);
          background: linear-gradient(150deg, rgba(11, 18, 32, 0.96), rgba(2, 6, 23, 0.96));
          color: #e2e8f0;
        }
        .studio-bottom-shell {
          box-shadow: 0 16px 24px -24px rgba(15, 23, 42, 0.74);
        }
        .data-explorer-standard-theme .studio-head-title,
        .data-explorer-standard-theme .studio-head-subtitle,
        .data-explorer-standard-theme .studio-field-label,
        .data-explorer-standard-theme .studio-drop-title,
        .data-explorer-standard-theme .studio-section-title {
          color: #e2e8f0 !important;
        }
        .data-explorer-standard-theme .studio-head-subtitle {
          color: rgba(226, 232, 240, 0.68) !important;
        }
        .data-explorer-standard-theme .studio-status-pill {
          border-color: rgba(56, 189, 248, 0.35);
          color: rgba(186, 230, 253, 0.95);
          background: rgba(2, 6, 23, 0.6);
        }
        .data-explorer-standard-theme .studio-surface .text-slate-800,
        .data-explorer-standard-theme .studio-surface .text-slate-700 {
          color: #e2e8f0 !important;
        }
        .data-explorer-standard-theme .studio-surface .text-slate-600,
        .data-explorer-standard-theme .studio-surface .text-slate-500 {
          color: rgba(226, 232, 240, 0.75) !important;
        }
        .data-explorer-standard-theme .studio-surface .text-slate-400 {
          color: rgba(226, 232, 240, 0.6) !important;
        }
        .data-explorer-standard-theme .studio-preview-panel .text-slate-600,
        .data-explorer-standard-theme .studio-preview-panel .text-slate-500,
        .data-explorer-standard-theme .studio-preview-panel .text-slate-400 {
          color: rgba(226, 232, 240, 0.7) !important;
        }
        .data-explorer-standard-theme .studio-banner span {
          background: rgba(2, 6, 23, 0.7) !important;
          border-color: rgba(56, 189, 248, 0.35) !important;
          color: rgba(226, 232, 240, 0.92) !important;
        }
        .data-grid-white th,
        .data-grid-white td {
          border-right: 1px solid rgba(255, 255, 255, 0.22);
          border-bottom: 1px solid rgba(255, 255, 255, 0.14);
        }
        .data-grid-white th:last-child,
        .data-grid-white td:last-child {
          border-right: none;
        }
        .data-grid-white thead th {
          border-bottom: 1px solid rgba(255, 255, 255, 0.26);
        }
        .data-grid-white tbody tr:last-child td {
          border-bottom: none;
        }
        .dark .data-grid-white th,
        .dark .data-grid-white td {
          border-right-color: rgba(255, 255, 255, 0.2);
          border-bottom-color: rgba(255, 255, 255, 0.14);
        }
        .dark .data-grid-white thead th {
          border-bottom-color: rgba(255, 255, 255, 0.24);
        }
        .data-explorer-r-theme .data-grid-white th,
        .data-explorer-r-theme .data-grid-white td {
          border-right-color: rgba(255, 255, 255, 0.24);
          border-bottom-color: rgba(255, 255, 255, 0.16);
        }
        .data-explorer-r-theme .data-grid-white thead th {
          border-bottom-color: rgba(255, 255, 255, 0.3);
        }
        .column-resize-handle {
          position: absolute;
          top: 0;
          right: 0;
          width: 8px;
          height: 100%;
          cursor: col-resize;
          z-index: 5;
          touch-action: none;
        }
        .data-grid-table.is-column-resizing {
          will-change: width;
        }
        .data-grid-table.is-column-resizing col {
          transition: none !important;
        }
        .column-resize-handle::after {
          content: "";
          position: absolute;
          top: 20%;
          right: 2px;
          width: 2px;
          height: 60%;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.55);
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .data-grid-data-cell {
          position: relative;
        }
        .cell-resize-handle {
          position: absolute;
          top: 0;
          right: -3px;
          width: 8px;
          height: 100%;
          cursor: col-resize;
          z-index: 4;
          touch-action: none;
        }
        .cell-resize-handle::after {
          content: "";
          position: absolute;
          top: 20%;
          right: 2px;
          width: 2px;
          height: 60%;
          border-radius: 999px;
          background: rgba(100, 116, 139, 0.55);
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .cell-resize-handle:hover::after,
        .data-grid-data-cell:hover > .cell-resize-handle::after {
          opacity: 1;
        }
        .row-insert-btn {
          position: absolute;
          left: 50%;
          bottom: -8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          padding: 0;
          border: 1px solid rgba(148, 163, 184, 0.7);
          border-radius: 9999px;
          background: #ffffff;
          color: #2563eb;
          opacity: 0;
          pointer-events: none;
          transform: translateX(-50%);
          transition: opacity 0.14s ease, background 0.14s ease, color 0.14s ease;
          z-index: 12;
        }
        .data-grid-row:hover .row-insert-btn,
        .row-insert-btn:focus-visible {
          opacity: 1;
          pointer-events: auto;
        }
        .row-insert-btn:hover {
          background: #2563eb;
          color: #ffffff;
        }
        .data-explorer-r-theme .row-insert-btn {
          border-color: rgba(6, 182, 212, 0.7);
          background: #071220;
          color: #67e8f9;
        }
        .data-explorer-r-theme .row-insert-btn:hover {
          background: #0891b2;
          color: #ecfeff;
        }
        .column-insert-btn {
          position: absolute;
          top: 50%;
          right: -8px;
          transform: translateY(-50%) scale(0.8);
          width: 17px;
          height: 17px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0284c7;
          color: #ffffff;
          border: 1.5px solid #ffffff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease, transform 0.15s ease, background 0.15s ease;
          z-index: 25;
          cursor: pointer;
        }
        .data-grid-column-header-cell:hover .column-insert-btn,
        .data-grid-utility-header-cell:hover .column-insert-btn,
        .column-resize-handle:hover .column-insert-btn {
          opacity: 0.92;
          pointer-events: auto;
          transform: translateY(-50%) scale(1);
        }
        .column-insert-btn:hover {
          opacity: 1 !important;
          background: #0ea5e9 !important;
          transform: translateY(-50%) scale(1.18) !important;
          box-shadow: 0 2px 8px rgba(14, 165, 233, 0.6);
        }
        .data-explorer-ayu-theme .column-insert-btn,
        .data-grid-white .column-insert-btn {
          border-color: #0f172a;
        }
        .data-grid-column-header-inner {
          display: flex;
          align-items: center;
          width: 100%;
          min-height: 32px;
          padding: 0.18rem 0.55rem;
          border-radius: 0.82rem;
          border: 1px solid transparent;
          transition: background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
        }
        .data-grid-column-header-button {
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 700;
        }
        .data-grid-column-header-input {
          width: 100%;
          font-size: 0.82rem;
        }
        .data-explorer-ayu-theme .data-grid-header,
        .data-explorer-ayu-theme .data-grid-table thead {
          box-shadow: none;
        }
        .data-explorer-ayu-theme table.data-grid-white {
          border-top: 1px solid rgba(214, 188, 128, 0.56);
          border-left: 1px solid rgba(214, 188, 128, 0.56);
        }
        .data-explorer-ayu-theme .data-grid-white th,
        .data-explorer-ayu-theme .data-grid-white td {
          border-right: 1px solid rgba(224, 202, 160, 0.72);
          border-bottom: 1px solid rgba(232, 220, 198, 0.8);
        }
        .data-explorer-ayu-theme .data-grid-white thead th {
          border-bottom: 1px solid rgba(214, 188, 128, 0.9);
        }
        .data-explorer-ayu-theme .data-grid-utility-header-cell,
        .data-explorer-ayu-theme .data-grid-column-header-cell {
          background: transparent;
        }
        .data-explorer-ayu-theme .data-grid-column-header-inner {
          min-height: 0;
          padding: 0;
          border-radius: 0;
          border: 0;
          background: transparent;
          box-shadow: none;
        }
        .data-explorer-ayu-theme .data-grid-column-header-cell[data-colored-header="true"] .data-grid-column-header-inner {
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }
        .data-grid-column-header-button-colored {
          color: inherit;
          font-weight: 700;
        }
        .data-grid-column-header-button-colored:hover {
          color: inherit;
          opacity: 0.96;
        }
        th:hover .column-resize-handle::after {
          opacity: 1;
        }
        .code-editor-std {
          width: 100%;
          min-height: 180px;
          border-radius: 0.875rem;
          border: 1px solid rgba(71, 85, 105, 0.65);
          background: #020617;
          color: #e2e8f0;
          padding: 0.75rem;
          font-size: 0.82rem;
          line-height: 1.5;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .code-editor-std:focus {
          border-color: rgba(59, 130, 246, 0.74);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        .dark .input-std,
        .dark .select-std {
          border-color: rgba(59, 130, 246, 0.24);
          background: linear-gradient(150deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.94));
          color: #e2e8f0;
          box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.16), 0 14px 22px -20px rgba(2, 6, 23, 0.9);
        }
        .dark .input-std:focus,
        .dark .select-std:focus {
          border-color: rgba(56, 189, 248, 0.55);
          box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2), 0 14px 22px -20px rgba(8, 145, 178, 0.7);
        }
        .dark .studio-card {
          background: linear-gradient(160deg, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.9));
          box-shadow: 0 22px 34px -30px rgba(2, 6, 23, 0.95);
        }
        .dark .studio-status-pill {
          color: #94a3b8;
          border-color: rgba(71, 85, 105, 0.7);
          background: rgba(15, 23, 42, 0.85);
        }
        .dark .studio-panel-body {
          border-top: none;
        }
        .dark .studio-panel-collapse {
          background: #0a0a0a;
          border-color: rgba(30, 30, 30, 0.95);
          box-shadow: 0 24px 48px -20px rgba(0, 0, 0, 0.98), 0 8px 18px -10px rgba(0, 0, 0, 0.75);
          border-radius: 0;
        }
        .dark .studio-var-control {
          border-color: rgba(71, 85, 105, 0.8);
          background: rgba(15, 23, 42, 0.9);
          color: #e2e8f0;
        }
        .dark .studio-input-panel {
          border-color: rgba(71, 85, 105, 0.55);
          background: linear-gradient(160deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.92));
          box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.16);
        }
        .dark .studio-field-label {
          color: #94a3b8;
        }
        .dark .studio-drop-panel {
          border-color: rgba(56, 189, 248, 0.22);
          background: linear-gradient(135deg, rgba(30, 64, 175, 0.24), rgba(2, 6, 23, 0.86));
          box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.12);
        }
        .dark .studio-segment {
          border-color: rgba(71, 85, 105, 0.6);
          background: rgba(15, 23, 42, 0.9);
        }
        .dark .studio-segment-btn {
          color: #cbd5f5;
        }
        .dark .studio-segment-btn:hover {
          background: rgba(56, 189, 248, 0.2);
          color: #e0f2fe;
        }
        .data-explorer-ayu-theme .input-std,
        .data-explorer-ayu-theme .select-std,
        .data-explorer-ayu-theme .columns-quick-input,
        .data-explorer-ayu-theme .columns-quick-select,
        .data-explorer-ayu-theme .group-select-compact,
        .data-explorer-ayu-theme .code-editor-std {
          border-color: var(--floating-window-border);
          background: var(--floating-window-bg-strong);
          color: var(--floating-window-text);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
        .data-explorer-ayu-theme .search-input {
          border: 1px solid #d4d4d8 !important;
          border-radius: 0.75rem !important;
          background: #ffffff !important;
          color: #18181b !important;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05) !important;
        }
        .data-explorer-ayu-theme .search-input:focus {
          border-color: #a1a1aa !important;
          background: #ffffff !important;
          color: #18181b !important;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.08) !important;
        }
        .data-explorer-ayu-theme .search-input::placeholder {
          color: rgba(0, 0, 0, 0.48) !important;
          opacity: 1 !important;
        }
        .data-explorer-ayu-theme .search-icon,
        .data-explorer-ayu-theme .search-clear {
          color: rgba(0, 0, 0, 0.5) !important;
        }
        .data-explorer-ayu-theme .search-clear:hover {
          color: #000000 !important;
        }
        .data-explorer-ayu-theme .input-std:focus,
        .data-explorer-ayu-theme .select-std:focus,
        .data-explorer-ayu-theme .columns-quick-input:focus,
        .data-explorer-ayu-theme .columns-quick-select:focus,
        .data-explorer-ayu-theme .group-select-compact:focus,
        .data-explorer-ayu-theme .code-editor-std:focus {
          border-color: var(--floating-window-accent);
          box-shadow: 0 0 0 2px var(--floating-window-accent-soft);
        }
        /* ── btn-primary → liquid cyan accent matching floating window ── */
        .data-explorer-ayu-theme .btn-primary {
          background: linear-gradient(120deg, #0e7eaa, #0a6991);
          border-color: var(--floating-window-accent);
          color: #e0f6ff;
          box-shadow: 0 12px 24px -18px rgba(14, 126, 170, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        .data-explorer-ayu-theme .btn-primary:hover {
          background: linear-gradient(120deg, #1596c4, #0e7eaa);
          box-shadow: 0 14px 28px -18px rgba(21, 150, 196, 0.78), inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }
        /* ── btn-danger → warm rose, still inside the dark palette ── */
        .data-explorer-ayu-theme .btn-danger {
          background: linear-gradient(120deg, #c0424e, #a83540);
          border-color: rgba(240, 113, 120, 0.38);
          color: #ffe4e8;
          box-shadow: 0 12px 24px -18px rgba(192, 66, 78, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .data-explorer-ayu-theme .btn-danger:hover {
          background: linear-gradient(120deg, #d94e5b, #c0424e);
        }
        .data-explorer-r-theme .input-std,
        .data-explorer-r-theme .select-std {
          border-color: rgba(34, 211, 238, 0.3);
          background: linear-gradient(150deg, rgba(11, 18, 32, 0.98), rgba(2, 6, 23, 0.96));
          color: #e2e8f0;
          box-shadow: inset 0 1px 0 rgba(103, 232, 249, 0.14), 0 14px 22px -20px rgba(2, 6, 23, 0.92);
        }
        .data-explorer-r-theme .input-std:focus,
        .data-explorer-r-theme .select-std:focus {
          border-color: rgba(34, 211, 238, 0.75);
          box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.24), 0 14px 22px -20px rgba(14, 165, 233, 0.8);
        }
        .data-explorer-r-theme .btn-primary {
          background: linear-gradient(120deg, #0891b2, #0e7490);
          border: 1px solid rgba(34, 211, 238, 0.25);
          color: #e0f2fe;
          box-shadow: 0 12px 20px -16px rgba(14, 165, 233, 0.6);
        }
        .data-explorer-r-theme .btn-primary:hover {
          background: linear-gradient(120deg, #06b6d4, #0891b2);
        }
        .data-explorer-r-theme .btn-danger {
          background: linear-gradient(120deg, #be123c, #9f1239);
          border-color: rgba(248, 113, 113, 0.35);
          color: #ffe4e6;
          box-shadow: 0 12px 20px -16px rgba(159, 18, 57, 0.75);
        }
        .data-explorer-r-theme .btn-danger:hover {
          background: linear-gradient(120deg, #e11d48, #be123c);
        }
        .data-explorer-r-theme .studio-card {
          background: linear-gradient(160deg, rgba(11, 18, 32, 0.95), rgba(2, 6, 23, 0.93));
          border-color: rgb(var(--studio-accent) / 0.42);
          box-shadow: 0 22px 34px -30px rgba(2, 6, 23, 0.96);
        }
        .data-explorer-r-theme .studio-panel-body {
          border-top: none;
        }
        .data-explorer-r-theme .studio-panel-collapse {
          background: linear-gradient(180deg, rgba(11, 18, 32, 0.98), rgba(2, 6, 23, 0.96));
          border-color: rgba(8, 145, 178, 0.32);
          box-shadow: 0 24px 48px -20px rgba(2, 6, 23, 0.92), 0 8px 18px -10px rgba(2, 6, 23, 0.62);
        }
        .data-explorer-r-theme .studio-status-pill {
          border-color: rgba(14, 165, 233, 0.35);
          color: #a5f3fc;
          background: rgba(12, 74, 110, 0.35);
        }
        .data-explorer-r-theme .studio-var-control {
          border-color: rgba(14, 165, 233, 0.45);
          background: rgba(14, 55, 95, 0.45);
          color: #e2e8f0;
        }
        .data-explorer-r-theme .studio-input-panel {
          border-color: rgba(14, 165, 233, 0.35);
          background: linear-gradient(160deg, rgba(8, 47, 73, 0.6), rgba(2, 6, 23, 0.92));
          box-shadow: inset 0 1px 0 rgba(103, 232, 249, 0.16);
        }
        .data-explorer-r-theme .studio-field-label {
          color: rgba(165, 243, 252, 0.78);
        }
        .data-explorer-r-theme .studio-drop-panel {
          border-color: rgba(34, 211, 238, 0.32);
          background: linear-gradient(135deg, rgba(8, 145, 178, 0.22), rgba(2, 6, 23, 0.88));
          box-shadow: inset 0 1px 0 rgba(103, 232, 249, 0.16);
        }
        .data-explorer-r-theme .studio-segment {
          border-color: rgba(34, 211, 238, 0.35);
          background: rgba(2, 6, 23, 0.6);
        }
        .data-explorer-r-theme .studio-segment-btn {
          color: #a5f3fc;
        }
        .data-explorer-r-theme .studio-segment-btn:hover {
          background: rgba(34, 211, 238, 0.18);
          color: #ecfeff;
        }
        .data-explorer-r-theme .code-editor-std {
          border-color: rgba(8, 145, 178, 0.35);
          background: rgba(2, 6, 23, 0.92);
          color: #e2e8f0;
        }
        .data-explorer-r-theme .code-editor-std:focus {
          border-color: rgba(34, 211, 238, 0.72);
          box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.22);
        }
        .data-explorer-shell,
        .data-explorer-topbar,
        .data-explorer-command-surface,
        .data-explorer-file-pill,
        .data-explorer-meta-chip,
        .data-explorer-icon-btn,
        .viewer-notice,
        .viewer-notice-compact,
        .floating-tool-window,
        .floating-tool-window::before,
        .floating-tool-window-header,
        .floating-tool-window .toolbar-menu-section,
        .floating-tool-window-columns .columns-quick-panel,
        .studio-preview-panel,
        .studio-preview-header,
        .studio-banner,
        .studio-card,
        .studio-bottom-shell,
        .studio-input-panel,
        .studio-drop-panel,
        .studio-segment,
        .columns-quick-panel {
          border-color: transparent !important;
        }
        .studio-panel-body,
        .toolbar-menu-section + .toolbar-menu-section {
          border-top-color: transparent !important;
        }
        .data-explorer-ayu-theme.data-explorer-shell,
        .data-explorer-ayu-theme .data-explorer-topbar,
        .data-explorer-ayu-theme .data-explorer-command-surface,
        .data-explorer-ayu-theme .data-explorer-file-pill,
        .data-explorer-ayu-theme .data-explorer-meta-chip,
        .data-explorer-ayu-theme .data-explorer-icon-btn,
        .data-explorer-ayu-theme .floating-tool-window,
        .data-explorer-ayu-theme .floating-tool-window-header,
        .data-explorer-ayu-theme .floating-tool-window .toolbar-menu-section,
        .data-explorer-ayu-theme .floating-tool-window-columns .columns-quick-panel,
        .data-explorer-ayu-theme .studio-preview-panel,
        .data-explorer-ayu-theme .studio-preview-header,
        .data-explorer-ayu-theme .studio-banner,
        .data-explorer-ayu-theme .studio-card,
        .data-explorer-ayu-theme .studio-bottom-shell,
        .data-explorer-ayu-theme .studio-input-panel,
        .data-explorer-ayu-theme .studio-drop-panel,
        .data-explorer-ayu-theme .studio-segment,
        .data-explorer-ayu-theme .columns-quick-panel {
          border-color: var(--floating-window-border) !important;
        }
        .data-explorer-ayu-theme .floating-tool-window::before {
          border-color: rgba(255, 255, 255, 0.04) !important;
        }
        .data-explorer-ayu-theme .studio-card {
          border-color: var(--floating-window-border) !important;
        }
        .data-explorer-ayu-theme .studio-card:hover {
          border-color: var(--floating-window-border-strong) !important;
        }
        .data-explorer-ayu-theme .studio-panel-collapse {
          border-color: var(--floating-window-border) !important;
        }
        .data-explorer-ayu-theme .studio-panel-body,
        .data-explorer-ayu-theme .toolbar-menu-section + .toolbar-menu-section {
          border-top-color: var(--floating-window-border) !important;
        }
        .data-explorer-command-surface {
          box-shadow: 0 30px 54px -42px rgba(2, 6, 23, 0.88), 0 12px 24px -20px rgba(15, 23, 42, 0.34);
        }
        .floating-tool-window {
          box-shadow:
            0 28px 56px -36px rgba(0, 0, 0, 0.76),
            0 12px 24px -18px rgba(15, 23, 42, 0.46);
        }
        .studio-banner,
        .studio-card,
        .studio-bottom-shell {
          box-shadow: 0 20px 34px -28px rgba(2, 6, 23, 0.64);
        }
        .studio-surface {
          --studio-float-bg: #20242c;
          --studio-float-bg-strong: #2a303a;
          --studio-float-section: #252c36;
          --studio-float-border: #465163;
          --studio-float-border-strong: #5b6980;
          --studio-float-highlight: rgba(255, 255, 255, 0.16);
        }
        .data-explorer-r-theme .studio-surface {
          --studio-float-bg: #152028;
          --studio-float-bg-strong: #1c2b35;
          --studio-float-section: #1a2933;
          --studio-float-border: rgba(34, 211, 238, 0.26);
          --studio-float-border-strong: rgba(34, 211, 238, 0.4);
          --studio-float-highlight: rgba(190, 249, 255, 0.2);
        }
        .data-explorer-ayu-theme .studio-surface {
          --studio-float-bg: #252a35;
          --studio-float-bg-strong: #2e3440;
          --studio-float-section: #262c37;
          --studio-float-border: rgba(90, 101, 118, 0.88);
          --studio-float-border-strong: rgba(116, 128, 148, 0.95);
          --studio-float-highlight: rgba(255, 255, 255, 0.14);
        }
        .studio-banner,
        .studio-card,
        .studio-bottom-shell,
        .studio-drop-panel {
          border: 1px solid var(--studio-float-border) !important;
          background: linear-gradient(180deg, var(--studio-float-bg-strong) 0%, var(--studio-float-bg) 100%) !important;
          box-shadow:
            0 30px 62px -36px rgba(0, 0, 0, 0.82),
            0 12px 26px -16px rgba(15, 23, 42, 0.64) !important;
        }
        .studio-card::before {
          background: linear-gradient(90deg, transparent, var(--studio-float-highlight), transparent);
        }
        .studio-card::after {
          opacity: 0.22;
        }
        .studio-segment {
          border: 1px solid var(--studio-float-border) !important;
          background: rgba(255, 255, 255, 0.03) !important;
          box-shadow: none !important;
        }
        /* ══════════════════════════════════════════════════════════════
           Ayu Dark: full remaining DataExplorer element overrides
           using the same --floating-window-* token palette
        ══════════════════════════════════════════════════════════════ */
        /* ── Topbar & command surface ── */
        .data-explorer-ayu-theme .data-explorer-topbar {
          background: linear-gradient(180deg, var(--floating-window-bg-strong), var(--floating-window-bg));
          border-color: var(--floating-window-border);
        }
        .data-explorer-ayu-theme .data-explorer-command-surface {
          background: linear-gradient(180deg, var(--floating-window-bg-strong), var(--floating-window-bg));
          border-color: var(--floating-window-border);
          box-shadow:
            0 34px 56px -38px rgba(0, 0, 0, 0.88),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }
        /* ── Icon buttons in topbar ── */
        .data-explorer-ayu-theme .data-explorer-icon-btn {
          background: linear-gradient(180deg, var(--floating-window-bg-strong), var(--floating-window-bg));
          border-color: var(--floating-window-border);
          color: var(--floating-window-muted);
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
        }
        .data-explorer-ayu-theme .data-explorer-icon-btn:hover {
          border-color: var(--floating-window-accent);
          background: var(--floating-window-active);
          color: var(--floating-window-accent);
        }
        /* ── Meta chips ── */
        .data-explorer-ayu-theme .data-explorer-meta-chip {
          background: var(--floating-window-bg-strong);
          border-color: var(--floating-window-border);
          color: var(--floating-window-muted);
        }
        /* ── File pill ── */
        .data-explorer-ayu-theme .data-explorer-file-pill {
          background: linear-gradient(180deg, var(--floating-window-bg-strong), var(--floating-window-bg));
          border-color: var(--floating-window-border);
          color: var(--floating-window-text);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 20px 36px -28px rgba(2, 6, 23, 0.82);
        }
        /* ── Viewer notices ── */
        .data-explorer-ayu-theme .viewer-notice,
        .data-explorer-ayu-theme .viewer-notice-compact {
          background: linear-gradient(180deg, var(--floating-window-bg-strong), var(--floating-window-bg));
          border-color: var(--floating-window-border);
          color: var(--floating-window-muted);
        }
        /* ── Toolbar menu trigger ── */
        .data-explorer-ayu-theme .toolbar-menu-trigger,
        .data-explorer-ayu-theme .toolbar-floating-trigger {
          background: linear-gradient(180deg, var(--floating-window-bg-strong), var(--floating-window-bg));
          border-color: var(--floating-window-border);
          color: var(--floating-window-text);
        }
        .data-explorer-ayu-theme .toolbar-menu-trigger:hover,
        .data-explorer-ayu-theme .toolbar-floating-trigger:hover {
          border-color: var(--floating-window-border-strong);
          background: var(--floating-window-hover);
        }
        .data-explorer-ayu-theme .toolbar-menu[open] .toolbar-menu-trigger,
        .data-explorer-ayu-theme .toolbar-floating-trigger.is-open {
          border-color: var(--floating-window-accent);
          background: var(--floating-window-active);
          color: var(--floating-window-accent);
        }
        .data-explorer-ayu-theme .toolbar-menu-trigger:focus-visible {
          outline-color: var(--floating-window-accent);
        }
        /* ── Toolbar dropdown panel ── */
        .data-explorer-ayu-theme .toolbar-menu-panel {
          background: linear-gradient(180deg, var(--floating-window-bg-strong), var(--floating-window-bg));
          border-color: var(--floating-window-border);
          box-shadow:
            0 32px 54px -36px rgba(0, 0, 0, 0.88),
            0 12px 24px -16px rgba(15, 23, 42, 0.6),
            0 0 0 1px rgba(255, 255, 255, 0.04);
        }
        .data-explorer-ayu-theme .toolbar-menu-section + .toolbar-menu-section {
          border-top-color: var(--floating-window-border);
        }
        .data-explorer-ayu-theme .toolbar-menu-label {
          color: var(--floating-window-muted);
          opacity: 0.8;
        }
        /* ── Toolbar menu items ── */
        .data-explorer-ayu-theme .toolbar-menu-item {
          background: rgba(255, 255, 255, 0.03);
          border-color: transparent;
          color: var(--floating-window-text);
        }
        .data-explorer-ayu-theme .toolbar-menu-item:hover {
          border-color: var(--floating-window-border);
          background: var(--floating-window-hover);
          color: var(--floating-window-text);
        }
        .data-explorer-ayu-theme .toolbar-menu-item-active {
          border-color: var(--floating-window-accent);
          background: var(--floating-window-active);
          color: var(--floating-window-accent);
        }
        .data-explorer-ayu-theme .toolbar-menu-item-danger {
          color: #f07178;
        }
        .data-explorer-ayu-theme .toolbar-menu-item-danger:hover {
          border-color: rgba(240, 113, 120, 0.42);
          background: rgba(240, 113, 120, 0.12);
          color: #ffb3b8;
        }
        /* ── Tabs strip ── */
        .data-explorer-ayu-theme .data-explorer-tab-btn {
          color: var(--floating-window-muted);
        }
        .data-explorer-ayu-theme .data-explorer-tab-btn-active {
          color: var(--floating-window-accent);
          background: var(--floating-window-active);
          border-color: var(--floating-window-accent);
        }
        /* ── Column resize handle ── */
        .data-explorer-ayu-theme .column-resize-handle::after {
          background: var(--floating-window-border-strong);
        }
        /* ── Open button ── */
        .data-explorer-ayu-theme .data-explorer-open-btn {
          background: linear-gradient(120deg, #0e7eaa, #0a6991);
          border-color: var(--floating-window-accent);
          color: #e0f6ff;
          box-shadow: 0 18px 30px -24px rgba(14, 126, 170, 0.7);
        }
        .data-explorer-ayu-theme .data-explorer-open-btn:hover {
          background: linear-gradient(120deg, #1596c4, #0e7eaa);
        }
        @media (max-width: 900px) {
          .data-explorer-topbar {
            padding: 0.7rem 0.75rem 0.8rem;
          }
          .data-explorer-r-logo {
            margin-top: -1.6rem;
          }
          .data-explorer-r-logo-image {
            width: 6.1rem;
            height: 6.1rem;
          }
          .data-explorer-heading-main {
            margin-top: -0.36rem;
          }
          .data-explorer-title-copy {
            margin-top: 0;
          }
          .data-explorer-meta-row,
          .data-explorer-heading-row {
            flex-direction: column;
            align-items: stretch;
          }
          .data-explorer-heading-actions {
            justify-content: space-between;
          }
          .data-explorer-toolbar {
            flex-wrap: wrap;
          }
          .toolbar-left,
          .toolbar-center,
          .toolbar-right {
            width: 100%;
          }
          .toolbar-center {
            justify-content: flex-start;
          }
          .toolbar-right {
            margin-left: 0;
            justify-content: flex-start;
          }
          .floating-tool-window {
            max-width: calc(100% - 16px);
            max-height: calc(100% - 16px);
          }
          .ayu-select-panel-secondary {
            left: 0 !important;
            right: 0 !important;
            top: calc(100% + 0.45rem) !important;
            min-width: 0 !important;
          }
          .floating-tool-window-selection .floating-tool-window-body {
            display: flex;
            flex-direction: column;
          }
          .floating-tool-window-clean .floating-tool-window-body {
            display: flex;
            flex-direction: column;
          }
          .floating-tool-window-rows .floating-tool-window-body {
            display: flex;
            flex-direction: column;
          }
          .floating-tool-window-rows .toolbar-quality-list-horizontal-flow {
            display: flex;
            flex-direction: column;
            column-width: auto;
            column-gap: 0;
            height: auto;
            max-height: 320px;
            overflow-x: hidden;
            overflow-y: auto;
          }
          .floating-tool-window-rows .toolbar-quality-list-horizontal-flow .toolbar-quality-item {
            display: flex;
            margin: 0;
          }
          .floating-tool-window-selection .control-row-group {
            flex-wrap: wrap;
          }
          .studio-groupby-selector-shell {
            width: 100%;
            justify-content: space-between;
          }
          .studio-groupby-select {
            min-width: 0;
            max-width: none;
            width: 100%;
          }
          .toolbar-menu-panel-columns {
            min-width: min(calc(100vw - 34px), 620px);
            max-width: min(calc(100vw - 34px), 620px);
          }
          .toolbar-menu-panel-group,
          .toolbar-menu-panel-selection,
          .toolbar-menu-panel-stats,
          .toolbar-menu-panel-clean {
            min-width: min(calc(100vw - 34px), 360px);
          }
          .control-group-summary {
            margin-left: 0;
            align-items: flex-start;
          }
          .search-field,
          .toolbar-search-field {
            width: 100%;
          }
          .columns-flyout {
            position: static;
            width: 100%;
            margin-top: 0.55rem;
          }
          .columns-flyout-meta {
            margin-left: 0;
          }
          .columns-quick-panel {
            flex-direction: column;
          }
          .toolbar-quality-grid,
          .toolbar-stats-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .toolbar-quality-legend {
            flex-direction: column;
            align-items: flex-start;
          }
          .columns-quick-input,
          .columns-quick-select,
          .columns-quick-btn {
            width: 100%;
            flex-basis: auto;
          }
          .group-select-compact {
            width: 100%;
            max-width: none;
          }
          .group-controls-main {
            flex-direction: column;
            align-items: stretch;
          }
          .group-controls-actions {
            justify-content: flex-start;
          }
          .group-level-panels {
            flex-direction: column;
            overflow-x: visible;
          }
          .group-level-panel {
            min-width: 100%;
            flex-basis: auto;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .data-explorer-shell,
          .studio-card,
          .studio-banner,
          .studio-panel-body {
            animation: none !important;
          }
          .data-explorer-topbar::after {
            animation: none !important;
          }
          .studio-panel-collapse,
          .studio-toggle-chevron,
          .ayu-select-panel,
          .ayu-select-trigger,
          .ayu-select-chevron,
          .studio-card,
          .studio-input-panel,
          .studio-drop-panel,
          .btn-primary,
          .btn-danger,
          .data-explorer-tab-btn,
          .control-btn,
          .toolbar-menu-trigger,
          .floating-tool-window,
          .floating-tool-window-close {
            transition: none !important;
          }
        }

        /* ── Ayu Dark: complete white grid (column titles + data) ── */
        .data-explorer-ayu-theme .data-explorer-data-surface,
        .data-explorer-ayu-theme .data-grid-viewport {
          background-color: #ffffff !important;
          outline: 1px solid rgba(0,0,0,0.9);
        }
        .data-explorer-ayu-theme .data-grid-viewport > * {
          background-color: #ffffff !important;
        }
        /* Full 4-sided border on every cell via border-collapse separate */
        .data-explorer-ayu-theme table.data-grid-white {
          background-color: #ffffff !important;
          color: #000000 !important;
          border: none !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }
        /* thead/tbody/tr: white text color, but NO !important on background so colored cells can override */
        .data-explorer-ayu-theme table.data-grid-white thead,
        .data-explorer-ayu-theme table.data-grid-white tbody {
          background-color: #ffffff;
          color: #000000 !important;
        }
        .data-explorer-ayu-theme table.data-grid-white tr {
          background-color: transparent;
        }
        /* Every th and td draws all 4 borders — thin 0.5px lines for clean separation */
        .data-explorer-ayu-theme table.data-grid-white th,
        .data-explorer-ayu-theme table.data-grid-white td {
          border-top: 0.5px solid rgba(0,0,0,0.55) !important;
          border-left: 0.5px solid rgba(0,0,0,0.55) !important;
          border-right: 0.5px solid rgba(0,0,0,0.55) !important;
          border-bottom: 0.5px solid rgba(0,0,0,0.55) !important;
        }
        /* Column titles: slate gray surface with black active text. */
        .data-explorer-ayu-theme table.data-grid-white th {
          font-weight: 700 !important;
        }
        .data-explorer-ayu-theme table.data-grid-white .data-grid-column-header-cell:not([data-colored-header="true"]) {
          background-color: #C6CCD2 !important;
          color: #000000 !important;
          border: 0.5px solid rgba(0,0,0,0.55) !important;
        }
        .data-explorer-ayu-theme table.data-grid-white thead .data-grid-utility-header-cell {
          background-color: #C6CCD2 !important;
          color: #000000 !important;
          border: 0.5px solid rgba(0,0,0,0.55) !important;
        }
        .data-explorer-ayu-theme table.data-grid-white .data-grid-column-header-cell:not([data-colored-header="true"]) button,
        .data-explorer-ayu-theme table.data-grid-white .data-grid-column-header-cell:not([data-colored-header="true"]) svg {
          color: var(--data-grid-header-text, #000000) !important;
          font-weight: bold !important;
        }
        .data-explorer-ayu-theme table.data-grid-white .data-grid-column-header-cell:not([data-colored-header="true"]) input.data-grid-column-header-input {
          background: #131313 !important;
          color: #ffffff !important;
          border-color: #6C757D !important;
        }
        /* Data cells and index cells: white by default, inline cellTint overrides this */
        .data-explorer-ayu-theme table.data-grid-white td {
          background-color: #ffffff;
          color: #000000 !important;
        }
        .data-explorer-ayu-theme table.data-grid-white td[data-cell-custom-color="true"],
        .data-explorer-ayu-theme table.data-grid-white td[data-cell-custom-text="true"] {
          color: var(--data-grid-cell-text, #000000) !important;
        }
        /* The # (index) cell must be white, same as the data cells */
        .data-explorer-ayu-theme table.data-grid-white td.data-grid-row-index-cell,
        .data-explorer-ayu-theme table.data-grid-white td.data-grid-selection-cell {
          background-color: #ffffff !important;
          color: var(--data-grid-cell-text, #000000) !important;
        }
        /* Colored header titles: keep computed black/white text from the column color */
        .data-explorer-ayu-theme table.data-grid-white th[data-colored-header="true"] {
          color: var(--data-grid-header-text, inherit) !important;
        }
        .data-explorer-ayu-theme table.data-grid-white th[data-colored-header="true"] button,
        .data-explorer-ayu-theme table.data-grid-white th[data-colored-header="true"] svg,
        .data-explorer-ayu-theme table.data-grid-white th[data-colored-header="true"] input {
          color: var(--data-grid-header-text, inherit) !important;
          font-weight: 700 !important;
        }
        /* Hover and selection states */
        .data-explorer-ayu-theme table.data-grid-white tbody tr:hover td {
          background-color: #f0f0f0;
        }
        .data-explorer-ayu-theme table.data-grid-white tbody tr[data-row-selected="true"] td {
          background-color: #e5e5e5;
        }
        /* Keep normal data cells the same white as the unused grid area. */
        .data-explorer-ayu-theme table.data-grid-white tbody tr:hover td.data-grid-data-cell:not([data-cell-custom-color="true"]),
        .data-explorer-ayu-theme table.data-grid-white tbody tr[data-row-selected="true"] td.data-grid-data-cell:not([data-cell-custom-color="true"]) {
          background-color: #ffffff !important;
        }
        .data-explorer-ayu-theme table.data-grid-white tbody tr:hover td.data-grid-range-selected,
        .data-explorer-ayu-theme table.data-grid-white tbody tr[data-row-selected="true"] td.data-grid-range-selected {
          background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.12)) !important;
        }
        .data-explorer-ayu-theme table.data-grid-white td.data-grid-range-selected::after {
          border-color: rgba(0, 0, 0, 0.7);
        }
        .data-explorer-ayu-theme .data-grid-row-index-cell {
          color: var(--data-grid-cell-text, #000000) !important;
          background-color: #ffffff !important;
        }
        .data-explorer-ayu-theme .data-grid-empty {
          color: #000000 !important;
          background-color: #ffffff !important;
          border: none !important;
        }
        .data-explorer-ayu-theme .data-grid-empty-viewport-ayu,
        .data-explorer-ayu-theme .data-grid-empty-viewport-ayu > *,
        .data-explorer-ayu-theme .data-grid-empty-viewport-ayu .data-grid-empty-ayu {
          background-color: #131313 !important;
        }
        .data-explorer-ayu-theme .data-grid-empty-viewport-ayu .data-grid-empty-ayu {
          color: #d4d4d4 !important;
        }

        /* Unified Data Explorer Header: Ayu Dark aligned to R Console */
        .data-explorer-ayu-theme .data-explorer-topbar,
        .data-explorer-ayu-theme .data-explorer-command-surface {
          background: #131313 !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-command-surface {
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar > div:first-child:not(.data-explorer-meta-row) {
          display: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar::after {
          display: none !important;
          opacity: 0 !important;
          animation: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-title-heading {
          color: #e9feff !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-title-subheading {
          color: #666666 !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-tabs {
          background: #131313 !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-tab-icon-btn,
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-icon-btn,
        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-left .toolbar-floating-trigger {
          background-color: #000000 !important;
          background-image: none !important;
          border-color: #232323 !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-tabs .data-explorer-tab-icon-btn {
          background: #131313 !important;
          border: none !important;
          color: #9ca3af !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-tabs .data-explorer-tab-icon-btn:hover {
          background: #1e1e1e !important;
          border: none !important;
          color: #e9feff !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-tabs .data-explorer-tab-icon-btn[data-active="true"] {
          background: #1e1e1e !important;
          border: 1px solid #264653 !important;
          color: #264653 !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-tabs .data-explorer-tab-icon-btn[data-active="true"] svg {
          filter: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-file-pill,
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-meta-chip,
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-icon-btn {
          background: #131313 !important;
          border-color: transparent !important;
          color: #e9feff !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-icon-btn {
          border: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-icon-btn:hover {
          background: #1e1e1e !important;
          border: none !important;
          color: #264653 !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-topbar .data-explorer-icon-btn:hover svg {
          filter: none !important;
        }
        /* ══ Advanced Data Panel Aesthetic for DataExplorer Toolbar (Same size, compact dark style, borderless) ══ */
        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-menu-trigger,
        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-floating-trigger,
        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-left .toolbar-floating-trigger:not(.clean-tool-btn):not(:disabled),
        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-left .toolbar-floating-trigger.clean-tool-btn {
          min-height: 44px !important;
          padding: 0.68rem 1.05rem !important;
          border-radius: 0.75rem !important;
          border: none !important;
          background: #141414 !important;
          background-image: none !important;
          color: #a1a1aa !important;
          font-size: 0.84rem !important;
          font-weight: 600 !important;
          letter-spacing: 0.01em !important;
          box-shadow: none !important;
          transition: background-color 0.15s ease, color 0.15s ease !important;
        }

        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-menu-trigger:hover,
        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-floating-trigger:hover,
        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-left .toolbar-floating-trigger:not(.clean-tool-btn):not(:disabled):hover,
        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-floating-trigger.clean-tool-btn:hover {
          background: #1e1e1e !important;
          border: none !important;
          color: #f4f4f5 !important;
          box-shadow: none !important;
        }

        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-floating-trigger.is-open,
        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-menu[open] .toolbar-menu-trigger,
        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-left .toolbar-floating-trigger:not(.clean-tool-btn):not(:disabled).is-open {
          background: #242424 !important;
          border: none !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }

        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-floating-trigger.is-open svg,
        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-menu[open] .toolbar-menu-trigger svg {
          filter: none !important;
        }

        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-left .toolbar-floating-trigger:not(.clean-tool-btn):disabled,
        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-menu-trigger:disabled {
          background: #141414 !important;
          border: none !important;
          color: #52525b !important;
          box-shadow: none !important;
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }

        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-floating-trigger.clean-tool-btn.is-open {
          border-color: rgba(244, 63, 94, 0.35) !important;
          background: #261616 !important;
          color: #fca5a5 !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5) !important;
        }

        /* Floating tool panels: using same color of file area in file explorer (#1F1F22) */
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window,
        .floating-tool-window.is-r-theme,
        .data-explorer-ayu-theme .toolbar-menu-panel {
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 1rem !important;
          background: #1F1F22 !important;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.04) !important;
          backdrop-filter: blur(16px) !important;
          overflow: hidden !important;
          transition: transform 120ms ease-out, box-shadow 120ms ease-out, opacity 120ms ease-out !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-body {
          background: #1F1F22 !important;
          color: #f1f1f4 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window::before {
          border-color: rgba(255, 255, 255, 0.03) !important;
          border-radius: inherit !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window::after {
          background: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-header {
          background: #181818 !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          padding: 0.55rem 0.85rem !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-icon {
          background: #252529 !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #d4d4d8 !important;
          border-radius: 0.5rem !important;
          width: 26px !important;
          height: 26px !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-clean .floating-tool-window-icon {
          background: #291a1a !important;
          border: 1px solid rgba(244, 63, 94, 0.35) !important;
          color: #fca5a5 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-grip {
          opacity: 0.25 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-close {
          background: transparent !important;
          border: 1px solid transparent !important;
          color: #a1a1aa !important;
          border-radius: 0.5rem !important;
          width: 24px !important;
          height: 24px !important;
          box-shadow: none !important;
          transition: all 0.15s ease !important;
          cursor: pointer !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-close svg {
          stroke: currentColor !important;
          opacity: 1 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-close:hover {
          background: #28282D !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
          color: #f4f4f5 !important;
          transform: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-copy strong {
          color: #f1f1f4 !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
          font-family: inherit !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-copy span,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-menu-copy,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-menu-label,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .selection-summary,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .columns-flyout-meta,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .group-controls-hint {
          color: #a1a1aa !important;
          font-size: 10.5px !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-menu-section {
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 0.75rem !important;
          background: #18181B !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-menu-section + .toolbar-menu-section {
          border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window button,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .control-btn,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .columns-flyout-link,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .columns-quick-btn,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .group-chip,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .columns-flyout-chip,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .group-column-icon-btn,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .clean-row-picker,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-stat-card,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-quality-meter,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-quality-item,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-quality-empty,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .clean-missing-row-item,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .segmented-group {
          background: #252529 !important;
          border: none !important;
          outline: none !important;
          border-radius: 0.5rem !important;
          color: #e4e4e7 !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .clean-panel-actions .clean-actions-run-btn {
          background: #7f1d1d !important;
          border: none !important;
          outline: none !important;
          color: #fef2f2 !important;
          border-radius: 0.5rem !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .ayu-select-trigger,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .ayu-select-trigger-r {
          background: #141416 !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 0.5rem !important;
          color: #f1f1f4 !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .ayu-select-trigger:hover,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .ayu-select-trigger-r:hover,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .ayu-select-trigger.is-open,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .ayu-select-trigger-r.is-open {
          background: #1c1c1f !important;
          border-color: rgba(56, 189, 248, 0.45) !important;
          color: #ffffff !important;
          box-shadow: none !important;
          transform: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .ayu-select-chevron {
          color: #a1a1aa !important;
          opacity: 1 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .ayu-select-panel {
          background: #1F1F22 !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 0.75rem !important;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75) !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .ayu-select-panel-secondary-head {
          border-bottom-color: rgba(255, 255, 255, 0.08) !important;
          background: #181818 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .ayu-select-panel-secondary-title {
          color: #f1f1f4 !important;
          font-size: 11px !important;
          font-weight: 700 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .ayu-select-item {
          color: #d4d4d8 !important;
          border-radius: 0.375rem !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .ayu-select-item:hover {
          background: #28282D !important;
          color: #ffffff !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .ayu-select-item.is-active {
          background: #323238 !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window select,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window select option {
          background: #141416 !important;
          color: #f1f1f4 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-rows .toolbar-dataset-mini-table th {
          background: #18181B !important;
          color: #d4d4d8 !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-rows .toolbar-dataset-mini-table td {
          background: #1F1F22 !important;
          color: #f1f1f4 !important;
          border-color: rgba(255, 255, 255, 0.06) !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .columns-flyout-chip-label,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .clean-missing-row-name,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-stat-card strong,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-quality-copy strong,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-quality-legend strong {
          color: #f1f1f4 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .clean-missing-row-meta,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-stat-label,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-quality-copy span,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-quality-legend {
          color: #a1a1aa !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window button:hover,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .control-btn:hover,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .columns-flyout-link:hover,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .columns-quick-btn:hover,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .group-chip:hover,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .columns-flyout-chip:hover,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .group-column-icon-btn:hover,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .clean-row-picker:hover {
          background: #2E2E34 !important;
          border: none !important;
          outline: none !important;
          color: #f4f4f5 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .clean-panel-actions .clean-actions-run-btn:hover:not(:disabled) {
          background: #991b1b !important;
          border: none !important;
          color: #ffffff !important;
          box-shadow: none !important;
          transform: translateY(-1px) !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .clean-panel-actions .clean-actions-run-btn:active:not(:disabled) {
          background: #b91c1c !important;
          border: none !important;
          color: #ffffff !important;
          transform: translateY(0) !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window button:active,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window button:focus,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .control-btn.is-active,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .group-chip-active,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .columns-flyout-chip.is-selected,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .clean-row-picker.is-selected,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-menu-item-active,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window .toolbar-menu-item[aria-checked="true"] {
          background: #36363D !important;
          border: none !important;
          outline: none !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-selection .selection-stepper {
          background: #18181B !important;
          border: none !important;
          border-radius: 0.5rem !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-selection .selection-stepper .segmented-label {
          color: #a1a1aa !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-selection .selection-stepper .selection-input,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-selection .selection-stepper .control-btn {
          color: #f1f1f4 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-selection .selection-stepper .selection-input {
          background: #141416 !important;
          border: none !important;
          outline: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-selection .selection-stepper .control-btn {
          background: #252529 !important;
          border: none !important;
          outline: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-selection .selection-stepper .control-btn:hover {
          background: #2E2E34 !important;
          border: none !important;
          outline: none !important;
          color: #ffffff !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-selection .selection-stepper .control-btn.is-active,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-selection .selection-stepper .control-btn.is-active:hover {
          border: none !important;
          outline: none !important;
          background: #36363D !important;
          color: #ffffff !important;
        }
        /* Columns floating panel */
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-columns .toolbar-menu-label,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-columns .toolbar-menu-copy,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-columns .columns-flyout-meta {
          color: #a1a1aa !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-columns .columns-flyout-chip {
          border: none !important;
          outline: none !important;
          background: #252529 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-columns .columns-flyout-chip:hover {
          border: none !important;
          outline: none !important;
          background: #2E2E34 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-columns .columns-flyout-chip.is-selected {
          background: #36363D !important;
          border: none !important;
          outline: none !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-columns .columns-flyout-chip.is-selected:hover {
          background: #404049 !important;
          border: none !important;
          outline: none !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-columns .columns-flyout-chip > div:first-child,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-columns .columns-flyout-chip.is-selected > div:first-child {
          border: none !important;
          outline: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-columns .columns-flyout-chip.is-selected > div:first-child svg {
          color: #ffffff !important;
        }

        /* Studio panels and cards: Ayu Dark aligned to R Console */
        .data-explorer-ayu-theme .studio-surface {
          background: #131313 !important;
        }
        .data-explorer-ayu-theme .studio-card {
          border-color: rgba(255, 255, 255, 0.08) !important;
          background: #131313 !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .studio-card:hover {
          border-color: #00f5ff !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .studio-preview-header {
          background: #131313 !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .data-explorer-ayu-theme .studio-card-head {
          background: #131313 !important;
          border: none !important;
          border-radius: 0.82rem;
        }
        .data-explorer-ayu-theme .studio-status-pill {
          border-color: rgba(255, 255, 255, 0.08) !important;
          background: #131313 !important;
          color: #666666 !important;
        }
        .data-explorer-ayu-theme .studio-status-pill-open {
          border-color: #00f5ff !important;
          background: #00f5ff !important;
          color: #000000 !important;
        }
        .data-explorer-ayu-theme .studio-head-title,
        .data-explorer-ayu-theme .studio-surface .text-slate-800,
        .data-explorer-ayu-theme .studio-surface .text-slate-700 {
          color: #e9feff !important;
        }
        .data-explorer-ayu-theme .studio-head-subtitle,
        .data-explorer-ayu-theme .studio-field-label,
        .data-explorer-ayu-theme .studio-drop-title,
        .data-explorer-ayu-theme .studio-surface .text-slate-600,
        .data-explorer-ayu-theme .studio-surface .text-slate-500,
        .data-explorer-ayu-theme .studio-surface .text-slate-400 {
          color: #666666 !important;
        }
        .data-explorer-ayu-theme .studio-input-panel,
        .data-explorer-ayu-theme .studio-drop-panel,
        .data-explorer-ayu-theme .studio-var-control,
        .data-explorer-ayu-theme .studio-groupby-selector-shell,
        .data-explorer-ayu-theme .studio-segment,
        .data-explorer-ayu-theme .input-std,
        .data-explorer-ayu-theme .select-std {
          background: #131313 !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          color: #d4d4d4 !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .input-std::placeholder,
        .data-explorer-ayu-theme .select-std::placeholder,
        .data-explorer-ayu-theme .studio-groupby-selector-label {
          color: #666666 !important;
        }
        .data-explorer-ayu-theme .input-std:focus,
        .data-explorer-ayu-theme .select-std:focus,
        .data-explorer-ayu-theme .studio-var-control:focus {
          border-color: #00f5ff !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .studio-panel-collapse {
          border-color: rgba(255, 255, 255, 0.08) !important;
          background: #131313 !important;
          box-shadow: none !important;
          transform-origin: top right;
        }
        .data-explorer-ayu-theme .studio-panel-body {
          background: transparent !important;
        }

        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-menu-trigger:disabled,
        .data-explorer-ayu-theme .data-explorer-command-surface .toolbar-floating-trigger:disabled {
          background: #1e1e1e !important;
          border: none !important;
          color: #666666 !important;
          opacity: 1 !important;
          cursor: not-allowed !important;
          box-shadow: none !important;
        }

        /* Final Ayu override: never fall back to the retired R/blue-gray
           floating-window palette after a Columns or Selection rerender. */
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window {
          --floating-window-bg: #131313 !important;
          --floating-window-bg-strong: #131313 !important;
          --floating-window-section: #1c1d1e !important;
          --floating-window-border: rgba(255, 255, 255, 0.08) !important;
          --floating-window-border-strong: rgba(255, 255, 255, 0.16) !important;
          --floating-window-text: #d4d4d4 !important;
          --floating-window-muted: #9ca3af !important;
          --floating-window-accent: #00f5ff !important;
          --floating-window-accent-soft: rgba(0, 245, 255, 0.14) !important;
          --floating-window-hover: #1e1e1e !important;
          --floating-window-active: #264653 !important;
          background: #131313 !important;
          background-image: none !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-header,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-body {
          background: #131313 !important;
          background-image: none !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window::after {
          display: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-text,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-text .floating-tool-window-body,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-text .text-panel-root {
          background: #1f2021 !important;
          background-image: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-text {
          border: none !important;
          border-radius: 1rem !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-text::before,
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-text::after {
          display: none !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-text .floating-tool-window-header {
          background: #000000 !important;
          border-radius: 1rem 1rem 0 0 !important;
        }
        .data-explorer-ayu-theme .data-explorer-floating-layer .floating-tool-window-text .text-panel-root > div:first-child {
          background: #171819 !important;
          border-right-color: rgba(255, 255, 255, 0.08) !important;
        }
        /* End unified header override */
        /* ── Sheet toggle button ── */
        .sheet-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-left: 8px;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid #52525b;
          background: #242426;
          color: #d4d4d8;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.16s ease, color 0.16s ease;
        }
        .data-explorer-r-theme .sheet-toggle-btn {
          background: #242426;
          color: #d4d4d8;
        }
        .data-explorer-r-theme .sheet-toggle-btn:hover,
        .data-explorer-r-theme .sheet-toggle-btn.is-open {
          background: #2e2e31;
          color: #ffffff;
        }
        .data-explorer-standard-theme .sheet-toggle-btn {
          background: #242426;
          color: #d4d4d8;
        }
        .data-explorer-standard-theme .sheet-toggle-btn:hover,
        .data-explorer-standard-theme .sheet-toggle-btn.is-open {
          background: #2e2e31;
          color: #ffffff;
        }
        .data-explorer-ayu-theme .sheet-toggle-btn {
          background: #242426;
          color: #d4d4d8;
        }
        .data-explorer-ayu-theme .sheet-toggle-btn:hover,
        .data-explorer-ayu-theme .sheet-toggle-btn.is-open {
          background: #2e2e31;
          color: #ffffff;
        }
        .sheet-add-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          margin-left: 4px;
          border: 1px solid #52525b;
          border-radius: 4px;
          background: #242426;
          color: #d4d4d8;
          font-size: 16px;
          font-weight: 500;
          line-height: 1;
          cursor: pointer;
          transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease;
        }
        .sheet-add-btn:hover {
          border-color: #71717a;
          background: #2e2e31;
          color: #ffffff;
        }
        .sheet-toggle-chevron {
          transition: transform 0.22s ease;
        }
        .sheet-toggle-chevron.is-open {
          transform: rotate(180deg);
        }
        /* ── Sheet horizontal tab band ── */
        @keyframes sheet-tabs-slide-in {
          0% { transform: translateX(-40px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .sheet-tabs-band {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 3px;
          width: 240px;
          max-width: min(80vw, 280px);
          padding: 10px;
          border: none !important;
          border-radius: 0.9rem;
          background: #111111 !important;
          background-image: none !important;
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.45);
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          animation: none;
          overflow-x: auto;
          overflow-y: auto;
          max-height: min(60vh, 360px);
        }
        .sheet-dropdown-heading {
          padding: 1px 2px 8px;
          color: #f4f4f5;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }
        .sheet-dropdown-subtitle {
          display: none;
          padding: 0 2px 3px;
          color: #71717a;
          font-size: 10px;
        }
        .sheet-dropdown-divider {
          display: none;
        }
        .data-explorer-r-theme .sheet-tabs-band {
          background: #111111 !important;
          border: none !important;
        }
        .data-explorer-standard-theme .sheet-tabs-band {
          background: #111111 !important;
          border: none !important;
        }
        .data-explorer-ayu-theme .sheet-tabs-band {
          background: #111111 !important;
          border: none !important;
        }
        .data-explorer-standard-theme .sheet-dropdown-heading,
        .data-explorer-ayu-theme .sheet-dropdown-heading {
          color: #f4f4f5;
        }
        .data-explorer-standard-theme .sheet-dropdown-subtitle,
        .data-explorer-ayu-theme .sheet-dropdown-subtitle {
          color: #71717a;
        }
        .sheet-tab-btn {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: flex-start;
          flex-shrink: 0;
          min-height: 32px;
          padding: 6px 10px;
          border: none;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          white-space: nowrap;
          text-align: left;
          transition: background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
        }
        .sheet-option-row {
          display: flex;
          align-items: center;
          gap: 4px;
          width: 100%;
          min-height: 32px;
          padding: 0 4px;
          border: none;
          border-radius: 8px;
          transition: background 0.16s ease;
        }
        .sheet-option-row:hover {
          background: #242426;
        }
        .sheet-option-row.is-active {
          background: #2e2e31;
        }
        .sheet-option-row.is-active .sheet-tab-btn {
          color: #f4f4f5 !important;
        }
        .sheet-option-row .sheet-tab-btn {
          flex: 1 1 auto;
          width: auto;
          min-width: 0;
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }
        .sheet-edit-btn,
        .sheet-edit-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          border: 1px solid transparent;
          border-radius: 6px;
          background: transparent;
          color: #a1a1aa;
          cursor: pointer;
        }
        .sheet-edit-btn {
          width: 28px;
          min-height: 32px;
        }
        .sheet-edit-btn:hover,
        .sheet-edit-action:hover {
          background: #2e2e31;
          color: #ffffff;
        }
        .sheet-edit-btn:disabled,
        .sheet-edit-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .sheet-delete-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          min-height: 32px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #71717a;
          cursor: pointer;
        }
        .sheet-delete-btn:hover:not(:disabled) {
          background: #2e2e31;
          color: #fca5a5;
        }
        .sheet-delete-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .sheet-edit-row {
          display: flex;
          align-items: center;
          gap: 4px;
          width: 100%;
        }
        .sheet-edit-row input {
          min-width: 0;
          flex: 1 1 auto;
          height: 32px;
          padding: 5px 8px;
          border: none !important;
          border-radius: 6px;
          outline: none;
          background: #242426 !important;
          background-image: none !important;
          color: #f4f4f5;
          font-size: 10px;
          font-weight: 700;
        }
        .sheet-edit-row input:focus {
          border: none !important;
          outline: none !important;
          background: #242426 !important;
          background-image: none !important;
          box-shadow: none !important;
        }
        .sheet-edit-action {
          width: 26px;
          height: 32px;
          font-size: 16px;
          line-height: 1;
        }
        .sheet-edit-action.is-save {
          color: #86efac;
        }
        .data-explorer-r-theme .sheet-tab-btn {
          background: transparent;
          color: rgba(207, 250, 254, 0.7);
        }
        .data-explorer-r-theme .sheet-tab-btn:hover {
          background: rgba(34, 211, 238, 0.14);
          color: #ecfeff;
        }
        .data-explorer-r-theme .sheet-tab-btn.is-active {
          background: #242426 !important;
          border: none !important;
          color: #f4f4f5;
          box-shadow: none !important;
        }
        .data-explorer-standard-theme .sheet-tab-btn {
          background: #242426;
          color: #d4d4d8;
        }
        .data-explorer-standard-theme .sheet-tab-btn:hover {
          background: #2e2e31;
          color: #ffffff;
        }
        .data-explorer-standard-theme .sheet-tab-btn.is-active {
          background: #242426 !important;
          border: none !important;
          color: #ffffff;
          box-shadow: none !important;
        }
        .data-explorer-ayu-theme .sheet-tab-btn {
          background: transparent;
          color: #666666;
        }
        .data-explorer-ayu-theme .sheet-tab-btn:hover {
          background: #1e1e1e;
          color: #e9feff;
        }
        .data-explorer-ayu-theme .sheet-tab-btn.is-active {
          background: #242426 !important;
          border: none !important;
          color: #f4f4f5;
          box-shadow: none !important;
        }
        .sheet-tab-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        /* Header text controls reuse the AI provider panel's zinc surface and states. */
        .text-format-header-panel {
          background: #161616 !important;
          background-image: none !important;
          border: 1px solid rgba(63, 63, 70, 0.8) !important;
          border-radius: 0.75rem;
          padding: 0.75rem;
          color: #e4e4e7;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.55) !important;
          font-family: Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
          scrollbar-width: thin;
          scrollbar-color: #52525b #161616;
        }
        .text-format-header-panel::-webkit-scrollbar {
          width: 6px;
        }
        .text-format-header-panel::-webkit-scrollbar-track {
          background: #161616;
        }
        .text-format-header-panel::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #52525b;
        }
        .text-format-header-panel .toolbar-menu-label {
          display: block;
          margin-bottom: 0.375rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #d4d4d8;
        }
        .text-format-header-panel .toolbar-menu-section + .toolbar-menu-section {
          border-top-color: rgba(63, 63, 70, 0.8);
        }
        .text-format-header-panel .toolbar-menu-item {
          min-height: 0;
          padding: 0.625rem 0.75rem;
          border-radius: 0.5rem;
          border: none !important;
          background: transparent;
          color: #a1a1aa;
          font-size: 0.75rem;
          font-weight: 600;
          line-height: 1.35;
          box-shadow: none;
        }
        .text-format-header-panel .toolbar-menu-item:hover {
          border: none !important;
          background: #27272a;
          color: #e4e4e7;
        }
        .text-format-header-panel .toolbar-menu-item-active,
        .text-format-header-panel .toolbar-menu-item-active:hover {
          border: none !important;
          background: #27272a;
          color: #f4f4f5;
        }
        .text-format-symbol {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          font-size: 0.95rem;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.06em;
        }
        .text-format-header-controls {
          flex: 1 1 0;
          min-width: 260px;
          width: 100%;
        }
        .text-format-header-controls .toolbar-menu-trigger,
        .data-explorer-ayu-theme .data-explorer-command-surface .text-format-header-controls .toolbar-menu-trigger {
          flex: 1 1 0;
          width: auto;
          min-width: 48px;
          min-height: 44px !important;
          justify-content: center;
          padding: 0.68rem 0.75rem !important;
          border: none !important;
          border-radius: 0.75rem !important;
          background: #141414 !important;
          background-image: none !important;
          color: #a1a1aa !important;
          font-size: 0.84rem !important;
          font-weight: 600 !important;
          letter-spacing: 0.01em;
          box-shadow: none !important;
          transition: background-color 0.15s ease, color 0.15s ease !important;
        }
        .text-format-header-controls .toolbar-menu-trigger:hover,
        .data-explorer-ayu-theme .data-explorer-command-surface .text-format-header-controls .toolbar-menu-trigger:hover {
          border: none !important;
          background: #1e1e1e !important;
          color: #f4f4f5 !important;
          box-shadow: none !important;
        }
        .text-format-header-controls .toolbar-floating-trigger.is-open,
        .data-explorer-ayu-theme .data-explorer-command-surface .text-format-header-controls .toolbar-floating-trigger.is-open {
          border: none !important;
          background: #242424 !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }
        /* Group selectors stay visually light inside the compact Selection panel. */
        .data-explorer-floating-layer .floating-tool-window.floating-tool-window-selection .group-select-compact > .ayu-select-trigger,
        .data-explorer-floating-layer .floating-tool-window.floating-tool-window-selection .group-select-compact > .ayu-select-trigger-r {
          background: transparent !important;
          background-image: none !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          box-shadow: none !important;
        }
        .data-explorer-floating-layer .floating-tool-window.floating-tool-window-selection .group-select-compact {
          background: transparent !important;
          background-image: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        .data-explorer-floating-layer .floating-tool-window.floating-tool-window-selection .group-select-compact > .ayu-select-trigger:hover,
        .data-explorer-floating-layer .floating-tool-window.floating-tool-window-selection .group-select-compact > .ayu-select-trigger-r:hover,
        .data-explorer-floating-layer .floating-tool-window.floating-tool-window-selection .group-select-compact > .ayu-select-trigger.is-open,
        .data-explorer-floating-layer .floating-tool-window.floating-tool-window-selection .group-select-compact > .ayu-select-trigger-r.is-open {
          background: transparent !important;
          background-image: none !important;
          border-color: rgba(56, 189, 248, 0.5) !important;
          box-shadow: none !important;
          transform: none !important;
        }
      `}</style>

    </div>
  );
}
