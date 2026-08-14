/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, Palette, Smile, Layers, Key, Upload, X } from 'lucide-react';
import clsx from 'clsx';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const actions = [
    { id: 'mode_instant', icon: Zap, label: 'Switch to Instant Mode', tags: ['local', 'webgpu', 'upscale', 'remove bg'] },
    { id: 'mode_studio', icon: Palette, label: 'Switch to AI Studio', tags: ['cloudflare', 'stable diffusion', 'flux', 'generate'] },
    { id: 'mode_restore', icon: Smile, label: 'Switch to Restore', tags: ['hugging face', 'face fix', 'gfpgan'] },
    { id: 'mode_ultimate', icon: Layers, label: 'Switch to Ultimate Chain', tags: ['pipeline', 'all'] },
    { id: 'upload', icon: Upload, label: 'Upload Image', tags: ['file', 'new'] },
    { id: 'settings', icon: Key, label: 'Manage API Keys (BYOK)', tags: ['config', 'cloudflare', 'hugging face'] },
  ];

  const filtered = actions.filter(a => 
    a.label.toLowerCase().includes(search.toLowerCase()) || 
    a.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (id: string) => {
    if (id === 'upload') document.getElementById('file-upload')?.click();
    if (id.startsWith('mode_')) {
      window.dispatchEvent(new CustomEvent('vc:switch-mode', { detail: id.replace('mode_', '') }));
    }
    if (id === 'settings') {
      document.getElementById('settings-trigger')?.click();
    }
    setIsOpen(false);
    setSearch('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[15vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-xl bg-[#0d0d1a] border border-[#1e1e2f] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center px-4 py-3 border-b border-[#1e1e2f] bg-[#06060e]">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input
                autoFocus
                type="text"
                placeholder="Type a command or search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-white placeholder-gray-500 outline-none"
              />
              <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">No results found.</div>
              ) : (
                filtered.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleSelect(action.id)}
                      className={clsx(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors outline-none",
                        "hover:bg-[var(--accent-primary)]/20 focus-visible:bg-[var(--accent-primary)]/20 text-gray-300 hover:text-white"
                      )}
                    >
                      <Icon className="w-4 h-4 text-[var(--accent-cyan)]" />
                      <span className="font-medium">{action.label}</span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="px-4 py-2 border-t border-[#1e1e2f] bg-[#06060e] text-[10px] text-gray-500 flex justify-between">
              <span>Use arrows to navigate, Enter to select</span>
              <span>esc to close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
