import React from 'react';
import { X, Table as TableIcon } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 dark:border-white/10 ring-1 ring-black/5">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <h2 className="text-lg font-black flex items-center gap-3 tracking-tight text-gray-900 dark:text-white">
            <div className="p-2 bg-primary/10 rounded-xl text-primary"><TableIcon size={20} /></div> {title}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>
        <div className="flex-grow overflow-auto p-8 bg-white/50 dark:bg-black/20">
          {children}
        </div>
      </div>
    </div>
  );
};

export const ImageModal = ({ isOpen, onClose, imageUrl, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="relative max-w-full max-h-full overflow-hidden flex flex-col items-center" onClick={e => e.stopPropagation()}>
         <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm border border-white/10">
            <X size={24} />
         </button>
         <img src={imageUrl} alt={title} className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" />
         {title && <div className="mt-4 text-white font-medium bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-lg">{title}</div>}
      </div>
    </div>
  );
};
