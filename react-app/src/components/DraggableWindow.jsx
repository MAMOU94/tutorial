import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Maximize2 } from 'lucide-react';

const DraggableWindow = ({
  id,
  title,
  onClose,
  onMinimize,
  zIndex,
  onFocus,
  children,
  initialPosition = { x: 50, y: 50 },
  initialSize = { width: 800, height: 600 },
  windowClassName = '',
  headerClassName = '',
  titleClassName = '',
  contentClassName = '',
  maximizeToOffset = { left: 0, top: 0, right: 0, bottom: 0 },
  initialMaximized = false
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState(initialMaximized);
  const windowRef = useRef(null);
  const previousPosition = useRef(initialPosition);
  const previousSize = useRef(initialSize);
  const resizeStart = useRef({ x: 0, y: 0, width: initialSize.width, height: initialSize.height });

  const focusWindow = () => {
    if (typeof onFocus === 'function') {
      onFocus();
    }
  };

  // Focus window on mount
  useEffect(() => {
    focusWindow();
  }, []);

  // Allow generous freedom: small negative offset and offscreen drag/resize
  const clampPosition = (x, y, w = size.width, h = size.height) => {
    const minX = -Math.max(0.8 * w, 400);
    const minY = -Math.max(0.5 * h, 300);
    const maxX = window.innerWidth + Math.max(0.5 * w, 300);
    const maxY = window.innerHeight + Math.max(0.5 * h, 300);
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    };
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.window-controls') || isMaximized || isResizing) return; 
    focusWindow();
    e.preventDefault();
    setIsDragging(true);
    const rect = windowRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        e.preventDefault();
        setPosition(prev => clampPosition(
          e.clientX - dragOffset.x,
          e.clientY - dragOffset.y
        ));
      } else if (isResizing) {
        e.preventDefault();
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        const newWidth = Math.max(360, resizeStart.current.width + dx);
        const newHeight = Math.max(260, resizeStart.current.height + dy);
        setSize({ width: newWidth, height: newHeight });
        // keep window within generous bounds after resize
        setPosition(prev => clampPosition(prev.x, prev.y, newWidth, newHeight));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset]);

  const toggleMaximize = () => {
    if (isMaximized) {
      setPosition(previousPosition.current);
      setSize(previousSize.current);
    } else {
      previousPosition.current = position;
      previousSize.current = size;
      // We don't change position state for maximized, we use CSS classes/styles
    }
    setIsMaximized(!isMaximized);
    focusWindow();
  };

  const windowStyle = isMaximized ? {
    position: 'fixed',
    top: maximizeToOffset.top,
    left: maximizeToOffset.left,
    width: `calc(100vw - ${maximizeToOffset.left + maximizeToOffset.right}px)`,
    height: `calc(100vh - ${maximizeToOffset.top + maximizeToOffset.bottom}px)`,
    transform: 'none',
    zIndex: zIndex + 100, // Ensure maximized window is on top
    borderRadius: 0,
    transition: 'none',
    willChange: 'transform',
    display: 'flex',
    flexDirection: 'column'
  } : {
    transform: `translate(${position.x}px, ${position.y}px)`,
    zIndex: zIndex,
    position: 'fixed',
    left: 0,
    top: 0,
    width: `${size.width}px`,
    height: `${size.height}px`,
    maxWidth: '95vw',
    maxHeight: '95vh',
    transition: isDragging || isResizing ? 'none' : 'transform 120ms ease-out, width 120ms ease-out, height 120ms ease-out',
    willChange: 'transform, width, height',
    display: 'flex',
    flexDirection: 'column'
  };

  return (
    <div
      ref={windowRef}
      style={windowStyle}
      className={`flex flex-col bg-[#131313] text-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.75)] border border-[#282828] overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${!isMaximized ? 'rounded-2xl' : ''} ${windowClassName}`}
      onMouseDown={focusWindow}
    >
      {/* Header / Drag Handle */}
      <div
        className={`h-10 bg-[#181818] border-b border-[#222222] flex items-center justify-between px-3.5 select-none shrink-0 ${!isMaximized ? 'cursor-move' : ''} ${headerClassName}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={toggleMaximize}
      >
        <h3 className={`text-[11px] font-bold tracking-[0.1em] uppercase text-zinc-300 font-sans truncate flex items-center gap-2 ${titleClassName}`}>
          {title}
        </h3>
        <div className="window-controls flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="p-1 hover:bg-[#252525] text-zinc-400 hover:text-zinc-200 border border-transparent hover:border-[#383838] rounded-lg transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={toggleMaximize}
            className="p-1 hover:bg-[#252525] text-zinc-400 hover:text-zinc-200 border border-transparent hover:border-[#383838] rounded-lg transition-colors cursor-pointer"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            <Maximize2 size={13} />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#252525] text-zinc-400 hover:text-zinc-200 border border-transparent hover:border-[#383838] rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-auto custom-scrollbar bg-[#131313] scroll-smooth ${contentClassName}`}>
        {children}
      </div>

      {/* Resize handle */}
      {!isMaximized && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            resizeStart.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };
            setIsResizing(true);
            focusWindow();
          }}
          className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize bg-gradient-to-br from-gray-300 to-gray-500 dark:from-gray-700 dark:to-gray-500 rounded-sm opacity-70 hover:opacity-100"
          title="Resize"
        />
      )}
    </div>
  );
};

export default DraggableWindow;
