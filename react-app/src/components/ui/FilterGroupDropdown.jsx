import React, { useEffect, useRef, useState } from 'react';
import {
  Filter,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  BarChart2,
  Sigma,
  Trash2,
  Check
} from 'lucide-react';

export default function FilterGroupDropdown({
  isRTheme = false,
  isAyuDarkTheme = false,
  onClearAll,
  onAddFilter,
  onOpenGroup,
  onOpenSummary
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterNa, setFilterNa] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const runAction = (callback) => {
    callback?.();
    setIsOpen(false);
  };

  return (
    <div className={`filter-group-root ${isRTheme ? 'is-r-theme' : ''} ${isAyuDarkTheme ? 'is-ayu-theme' : ''}`} ref={rootRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`filter-group-trigger ${isOpen ? 'is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="filter-group-trigger-main">
          <Filter size={16} strokeWidth={2.2} />
          <span>Filter &amp; Group</span>
        </span>
        <ChevronDown size={16} className={`filter-group-trigger-chevron ${isOpen ? 'is-open' : ''}`} strokeWidth={2.2} />
      </button>

      {isOpen && (
        <div className="filter-group-panel" role="menu">
          <div className="filter-group-panel-head">
            <span className="filter-group-panel-title">
              <Filter size={18} strokeWidth={2.2} />
              Filter &amp; Group
            </span>
            <ChevronDown size={18} className="filter-group-panel-chevron" strokeWidth={2.2} />
          </div>

          <div className="filter-group-section">
            <div className="filter-group-section-label">Filter Data</div>
            <button
              type="button"
              className="filter-group-item filter-group-item-emphasis"
              role="menuitem"
              onClick={() => runAction(onAddFilter)}
            >
              <span className="filter-group-item-main">
                <Filter size={17} strokeWidth={2.1} />
                <span>Add filter</span>
              </span>
              <ChevronRight size={16} strokeWidth={2.1} />
            </button>

            <button
              type="button"
              onClick={() => setFilterNa((prev) => !prev)}
              className="filter-group-item"
              role="menuitemcheckbox"
              aria-checked={filterNa}
            >
              <span className="filter-group-item-main">
                <AlertTriangle size={17} strokeWidth={2.1} />
                <span>Filter NA values</span>
              </span>
              <span className={`filter-group-check ${filterNa ? 'is-checked' : ''}`}>
                {filterNa && <Check size={13} strokeWidth={3} />}
              </span>
            </button>
          </div>

          <div className="filter-group-section">
            <div className="filter-group-section-label">Group Data</div>
            <button
              type="button"
              className="filter-group-item"
              role="menuitem"
              onClick={() => runAction(onOpenGroup)}
            >
              <span className="filter-group-item-main">
                <BarChart2 size={17} strokeWidth={2.1} />
                <span>Group by column</span>
              </span>
              <ChevronRight size={16} strokeWidth={2.1} />
            </button>

            <button
              type="button"
              className="filter-group-item"
              role="menuitem"
              onClick={() => runAction(onOpenSummary)}
            >
              <span className="filter-group-item-main">
                <Sigma size={17} strokeWidth={2.1} />
                <span>Summary Statistics</span>
              </span>
              <ChevronRight size={16} strokeWidth={2.1} />
            </button>
          </div>

          <div className="filter-group-footer">
            <button
              type="button"
              onClick={() => {
                setFilterNa(false);
                onClearAll?.();
                setIsOpen(false);
              }}
              className="filter-group-clear"
              role="menuitem"
            >
              <Trash2 size={16} strokeWidth={2.1} />
              <span>Clear all</span>
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        /* ─── Base open animation ─── */
        @keyframes filter-group-enter {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        /* ─── Root ─── */
        .filter-group-root {
          position: relative;
          display: inline-block;
          text-align: left;
        }

        /* ─── Trigger (default) ─── */
        .filter-group-trigger {
          min-height: 42px;
          min-width: 214px;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
          padding: 0.65rem 1rem;
          border-radius: 1rem;
          border: 1px solid rgba(82, 107, 146, 0.45);
          background: linear-gradient(180deg, rgba(28, 41, 67, 0.95), rgba(13, 20, 35, 0.98));
          color: #e8eef8;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 22px 34px -28px rgba(2, 6, 23, 0.95);
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
        }
        .filter-group-trigger:hover {
          transform: translateY(-1px);
          border-color: rgba(110, 153, 211, 0.55);
          background: linear-gradient(180deg, rgba(34, 50, 80, 0.96), rgba(16, 25, 42, 0.99));
        }
        .filter-group-trigger:focus-visible {
          outline: 2px solid rgba(96, 165, 250, 0.55);
          outline-offset: 2px;
        }
        .filter-group-trigger.is-open {
          border-color: rgba(125, 211, 252, 0.58);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 24px 42px -30px rgba(2, 6, 23, 0.98);
        }
        .filter-group-trigger-main {
          display: inline-flex;
          align-items: center;
          gap: 0.7rem;
          font-size: 0.86rem;
          font-weight: 600;
          letter-spacing: 0.01em;
        }
        .filter-group-trigger-chevron {
          opacity: 0.72;
          transition: transform 240ms cubic-bezier(0.34, 1.2, 0.64, 1), opacity 180ms ease;
        }
        .filter-group-trigger-chevron.is-open {
          transform: rotate(180deg);
          opacity: 1;
        }

        /* ─── Panel (default) ─── */
        .filter-group-panel {
          position: absolute;
          left: 0;
          top: calc(100% + 0.7rem);
          z-index: 200;
          width: min(340px, calc(100vw - 32px));
          padding: 0.28rem;
          border-radius: 1.55rem;
          border: 1px solid rgba(77, 109, 160, 0.38);
          background: linear-gradient(180deg, rgba(17, 29, 49, 0.98), rgba(9, 17, 31, 0.98));
          box-shadow: 0 42px 82px -40px rgba(2, 6, 23, 0.98);
          backdrop-filter: blur(20px);
          animation: filter-group-enter 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .filter-group-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin: 0.25rem;
          padding: 1rem 1rem 0.95rem;
          border-radius: 1.2rem;
          border: 1px solid rgba(98, 133, 187, 0.34);
          background: linear-gradient(180deg, rgba(35, 53, 80, 0.96), rgba(27, 42, 67, 0.94));
          color: #eff6ff;
        }
        .filter-group-panel-title {
          display: inline-flex;
          align-items: center;
          gap: 0.8rem;
          font-size: 0.94rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .filter-group-panel-chevron {
          opacity: 0.76;
        }
        .filter-group-section {
          padding: 0.15rem 0.38rem 0.4rem;
        }
        .filter-group-section + .filter-group-section {
          border-top: 1px solid rgba(148, 163, 184, 0.14);
          margin-top: 0.15rem;
          padding-top: 0.7rem;
        }
        .filter-group-section-label {
          padding: 0 0.3rem 0.45rem;
          font-size: 0.72rem;
          font-weight: 700;
          color: rgba(184, 198, 219, 0.78);
          letter-spacing: 0.03em;
        }
        .filter-group-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
          padding: 0.9rem 0.9rem;
          border-radius: 1.05rem;
          border: 1px solid transparent;
          background: transparent;
          color: #e5edf7;
          transition: border-color 160ms ease, background 160ms ease, transform 160ms ease, color 160ms ease;
        }
        .filter-group-item:hover {
          transform: translateY(-1px);
          border-color: rgba(100, 137, 194, 0.36);
          background: rgba(30, 49, 78, 0.46);
          color: #f8fbff;
        }
        .filter-group-item:focus-visible {
          outline: 2px solid rgba(96, 165, 250, 0.45);
          outline-offset: 2px;
        }
        .filter-group-item-emphasis {
          background: linear-gradient(180deg, rgba(42, 65, 97, 0.7), rgba(24, 41, 68, 0.74));
          border-color: rgba(88, 124, 182, 0.3);
        }
        .filter-group-item-main {
          display: inline-flex;
          align-items: center;
          gap: 0.85rem;
          font-size: 0.88rem;
          font-weight: 600;
        }
        .filter-group-check {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.65rem;
          border: 1px solid rgba(100, 116, 139, 0.56);
          background: rgba(15, 23, 42, 0.4);
          color: transparent;
          transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
        }
        .filter-group-check.is-checked {
          border-color: rgba(125, 211, 252, 0.55);
          background: linear-gradient(180deg, rgba(84, 164, 255, 0.76), rgba(61, 130, 246, 0.88));
          color: white;
        }
        .filter-group-footer {
          margin-top: 0.2rem;
          padding: 0.7rem 0.6rem 0.6rem;
          border-top: 1px solid rgba(148, 163, 184, 0.14);
        }
        .filter-group-clear {
          width: 100%;
          display: inline-flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.85rem 0.9rem;
          border-radius: 1rem;
          color: #93c5fd;
          font-size: 0.88rem;
          font-weight: 600;
          transition: background 160ms ease, color 160ms ease;
        }
        .filter-group-clear:hover {
          background: rgba(59, 130, 246, 0.08);
          color: #dbeafe;
        }
        .filter-group-clear:focus-visible {
          outline: 2px solid rgba(96, 165, 250, 0.45);
          outline-offset: 2px;
        }

        /* ─── R theme override ─── */
        .filter-group-root.is-r-theme .filter-group-trigger {
          border-color: rgba(34, 211, 238, 0.38);
          background: linear-gradient(180deg, rgba(10, 34, 54, 0.95), rgba(3, 16, 29, 0.99));
          color: #ecfeff;
        }
        .filter-group-root.is-r-theme .filter-group-trigger:hover {
          border-color: rgba(34, 211, 238, 0.56);
          background: linear-gradient(180deg, rgba(12, 45, 72, 0.96), rgba(5, 23, 40, 0.99));
        }
        .filter-group-root.is-r-theme .filter-group-panel {
          border-color: rgba(34, 211, 238, 0.28);
          background: linear-gradient(180deg, rgba(7, 22, 40, 0.98), rgba(2, 10, 20, 0.99));
        }
        .filter-group-root.is-r-theme .filter-group-panel-head {
          border-color: rgba(34, 211, 238, 0.28);
          background: linear-gradient(180deg, rgba(14, 52, 81, 0.94), rgba(10, 36, 58, 0.94));
          color: #ecfeff;
        }
        .filter-group-root.is-r-theme .filter-group-item:hover,
        .filter-group-root.is-r-theme .filter-group-item-emphasis {
          border-color: rgba(34, 211, 238, 0.34);
          background: rgba(8, 47, 73, 0.58);
        }
        .filter-group-root.is-r-theme .filter-group-check.is-checked {
          border-color: rgba(34, 211, 238, 0.55);
          background: linear-gradient(180deg, rgba(34, 211, 238, 0.82), rgba(8, 145, 178, 0.92));
        }
        .filter-group-root.is-r-theme .filter-group-clear {
          color: #a5f3fc;
        }

        /* ─────────────────────────────────────────────────────────────
           AYU DARK THEME  —  ink-black base · amber accent · clean edges
        ─────────────────────────────────────────────────────────────── */

        /* Panel enter animation – slightly longer & softer for Ayu */
        @keyframes ayu-panel-enter {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.972);
            filter: blur(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0px);
          }
        }

        /* ── Trigger button ── */
        .filter-group-root.is-ayu-theme .filter-group-trigger {
          border-radius: 0.9rem;
          border-color: rgba(58, 65, 84, 0.75);
          background: #0d1017;
          color: #bfbdb6;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.03),
            0 4px 18px -6px rgba(0, 0, 0, 0.75);
          transition:
            background 220ms ease,
            border-color 220ms ease,
            color 220ms ease,
            transform 220ms cubic-bezier(0.34, 1.2, 0.64, 1),
            box-shadow 220ms ease;
        }
        .filter-group-root.is-ayu-theme .filter-group-trigger:hover {
          border-color: rgba(255, 180, 84, 0.44);
          background: #131720;
          color: #e6e1cf;
          transform: translateY(-1px);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 8px 26px -8px rgba(0, 0, 0, 0.78),
            0 0 14px -5px rgba(255, 180, 84, 0.14);
        }
        .filter-group-root.is-ayu-theme .filter-group-trigger.is-open {
          border-color: rgba(255, 180, 84, 0.64);
          background: #121620;
          color: #e6e1cf;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 12px 36px -10px rgba(0, 0, 0, 0.88),
            0 0 20px -7px rgba(255, 180, 84, 0.22);
        }
        .filter-group-root.is-ayu-theme .filter-group-trigger:focus-visible {
          outline: 2px solid rgba(255, 180, 84, 0.6);
          outline-offset: 2px;
        }
        .filter-group-root.is-ayu-theme .filter-group-trigger-main {
          color: inherit;
        }
        /* Chevron adopts amber when open */
        .filter-group-root.is-ayu-theme .filter-group-trigger-chevron {
          color: rgba(191, 189, 182, 0.6);
          transition: transform 280ms cubic-bezier(0.34, 1.2, 0.64, 1), color 200ms ease, opacity 200ms ease;
        }
        .filter-group-root.is-ayu-theme .filter-group-trigger-chevron.is-open {
          color: #ffb454;
        }

        /* ── Drop-down panel ── */
        .filter-group-root.is-ayu-theme .filter-group-panel {
          border-radius: 1.3rem;
          border-color: rgba(50, 58, 76, 0.9);
          background: #0d1017;
          backdrop-filter: blur(28px) saturate(160%);
          box-shadow:
            0 0 0 1px rgba(255, 180, 84, 0.05),
            0 2px 12px rgba(0, 0, 0, 0.5),
            0 28px 72px -24px rgba(0, 0, 0, 0.96);
          animation: ayu-panel-enter 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* ── Panel header ── */
        .filter-group-root.is-ayu-theme .filter-group-panel-head {
          border-radius: 1rem;
          border-color: rgba(50, 58, 76, 0.92);
          background: #141921;
          color: #e6e1cf;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
        .filter-group-root.is-ayu-theme .filter-group-panel-title {
          color: #e6e1cf;
          letter-spacing: 0.02em;
        }
        /* Chevron in header glows amber */
        .filter-group-root.is-ayu-theme .filter-group-panel-chevron {
          color: #ffb454;
          opacity: 0.82;
        }

        /* ── Section labels ── */
        .filter-group-root.is-ayu-theme .filter-group-section-label {
          color: rgba(130, 140, 160, 0.85);
          font-size: 0.67rem;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          font-weight: 700;
        }

        /* ── Section dividers ── */
        .filter-group-root.is-ayu-theme .filter-group-section + .filter-group-section {
          border-top-color: rgba(50, 58, 76, 0.68);
        }

        /* ── Menu items ── */
        .filter-group-root.is-ayu-theme .filter-group-item {
          border-radius: 0.85rem;
          color: #bfbdb6;
          border-color: transparent;
          transition:
            background  190ms ease,
            border-color 190ms ease,
            color 190ms ease,
            transform 190ms cubic-bezier(0.34, 1.2, 0.64, 1),
            box-shadow 190ms ease;
        }
        .filter-group-root.is-ayu-theme .filter-group-item:hover {
          background: rgba(255, 180, 84, 0.09);
          border-color: rgba(255, 180, 84, 0.3);
          color: #ffb454;
          transform: translateX(3px);
          box-shadow: inset 0 0 0 1px rgba(255, 180, 84, 0.07);
        }
        .filter-group-root.is-ayu-theme .filter-group-item:active {
          transform: translateX(1px) scale(0.99);
          background: rgba(255, 180, 84, 0.15);
        }
        .filter-group-root.is-ayu-theme .filter-group-item:focus-visible {
          outline: 2px solid rgba(255, 180, 84, 0.55);
          outline-offset: 2px;
        }

        /* ── Emphasis item (Add filter) – subtle amber tint at rest ── */
        .filter-group-root.is-ayu-theme .filter-group-item-emphasis {
          background: rgba(255, 180, 84, 0.07);
          border-color: rgba(255, 180, 84, 0.2);
          color: #d9d4c7;
        }
        .filter-group-root.is-ayu-theme .filter-group-item-emphasis:hover {
          background: rgba(255, 180, 84, 0.13);
          border-color: rgba(255, 180, 84, 0.38);
          color: #ffb454;
        }

        /* ── Checkbox ── */
        .filter-group-root.is-ayu-theme .filter-group-check {
          border-radius: 0.5rem;
          background: rgba(20, 25, 33, 0.9);
          border-color: rgba(58, 65, 84, 0.76);
          transition: background 220ms ease, border-color 220ms ease, color 220ms ease, box-shadow 220ms ease;
        }
        .filter-group-root.is-ayu-theme .filter-group-check.is-checked {
          border-color: rgba(255, 180, 84, 0.75);
          background: rgba(255, 180, 84, 0.9);
          color: #0d1017;
          box-shadow: 0 0 12px -3px rgba(255, 180, 84, 0.5);
        }

        /* ── Footer ── */
        .filter-group-root.is-ayu-theme .filter-group-footer {
          border-top-color: rgba(50, 58, 76, 0.68);
        }

        /* ── Clear all button ── */
        .filter-group-root.is-ayu-theme .filter-group-clear {
          border-radius: 0.85rem;
          border: 1px solid transparent;
          color: rgba(220, 80, 80, 0.82);
          transition:
            background 190ms ease,
            border-color 190ms ease,
            color 190ms ease,
            transform 190ms cubic-bezier(0.34, 1.2, 0.64, 1);
        }
        .filter-group-root.is-ayu-theme .filter-group-clear:hover {
          background: rgba(230, 80, 80, 0.1);
          border-color: rgba(230, 80, 80, 0.3);
          color: #ff7b7b;
          transform: translateX(3px);
        }
        .filter-group-root.is-ayu-theme .filter-group-clear:active {
          transform: translateX(1px) scale(0.99);
        }
        .filter-group-root.is-ayu-theme .filter-group-clear:focus-visible {
          outline: 2px solid rgba(230, 80, 80, 0.55);
          outline-offset: 2px;
        }
      ` }} />
    </div>
  );
}
