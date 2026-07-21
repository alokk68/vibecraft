'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Key, CheckCircle2, AlertCircle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export const getSavedKeys = () => {
  if (typeof window === 'undefined') return { hfToken: '', cfAccountId: '', cfApiToken: '' };
  return {
    hfToken: localStorage.getItem('vc_hf_token') || '',
    cfAccountId: localStorage.getItem('vc_cf_account_id') || '',
    cfApiToken: localStorage.getItem('vc_cf_api_token') || '',
  };
};

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [hfToken, setHfToken] = useState('');
  const [cfAccountId, setCfAccountId] = useState('');
  const [cfApiToken, setCfApiToken] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', msg: string }>({ type: 'idle', msg: '' });
  
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const keys = getSavedKeys();
        setHfToken(keys.hfToken);
        setCfAccountId(keys.cfAccountId);
        setCfApiToken(keys.cfApiToken);
      }, 0);
      

      setTimeout(() => firstInputRef.current?.focus(), 100);
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (hfToken) localStorage.setItem('vc_hf_token', hfToken);
    else localStorage.removeItem('vc_hf_token');
    
    if (cfAccountId) localStorage.setItem('vc_cf_account_id', cfAccountId);
    else localStorage.removeItem('vc_cf_account_id');
    
    if (cfApiToken) localStorage.setItem('vc_cf_api_token', cfApiToken);
    else localStorage.removeItem('vc_cf_api_token');
    
    setStatus({ type: 'success', msg: 'Keys saved securely to local storage!' });
    setTimeout(() => { setStatus({ type: 'idle', msg: '' }); onClose(); }, 2000);
    window.dispatchEvent(new Event('storage'));
  };

  const handleClear = () => {
    localStorage.removeItem('vc_hf_token');
    localStorage.removeItem('vc_cf_account_id');
    localStorage.removeItem('vc_cf_api_token');
    setHfToken('');
    setCfAccountId('');
    setCfApiToken('');
    setStatus({ type: 'success', msg: 'Keys cleared successfully.' });
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          
          <motion.div 
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            className="relative w-full max-w-lg bg-[#0d0d1a] border border-[#1e1e2f] rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#1e1e2f] flex items-center justify-between bg-[#06060e]">
              <div className="flex items-center gap-2 text-white">
                <Settings className="w-5 h-5 text-purple-400" />
                <h2 id="settings-title" className="text-lg font-bold">API Configuration (BYOK)</h2>
              </div>
              <button aria-label="Close settings" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-sm text-purple-200 leading-relaxed">
                <strong className="text-purple-300 block mb-1">Bring Your Own Keys</strong>
                Your keys are stored <span className="text-white font-medium">locally in your browser</span>. They are sent directly via our API routes to Hugging Face and Cloudflare. We never log or store them on our servers. Leave blank to use public demo limits.
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="hfToken" className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Key className="w-4 h-4 text-pink-400" /> Hugging Face Access Token
                  </label>
                  <input
                    id="hfToken"
                    ref={firstInputRef}
                    type="password"
                    value={hfToken}
                    onChange={(e) => setHfToken(e.target.value)}
                    placeholder="hf_..."
                    className="w-full bg-[#06060e] border border-[#1e1e2f] rounded-lg px-4 py-2.5 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all placeholder:text-gray-600"
                  />
                  <p className="text-[10px] text-gray-500">Needed for Restore models (GFPGAN, AnimeGAN).</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="cfAccountId" className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-400" /> Cloudflare Account ID
                  </label>
                  <input
                    id="cfAccountId"
                    type="password"
                    value={cfAccountId}
                    onChange={(e) => setCfAccountId(e.target.value)}
                    placeholder="a1b2c3d4..."
                    className="w-full bg-[#06060e] border border-[#1e1e2f] rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="cfApiToken" className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Key className="w-4 h-4 text-cyan-400" /> Cloudflare API Token
                  </label>
                  <input
                    id="cfApiToken"
                    type="password"
                    value={cfApiToken}
                    onChange={(e) => setCfApiToken(e.target.value)}
                    placeholder="cf_..."
                    className="w-full bg-[#06060e] border border-[#1e1e2f] rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-gray-600"
                  />
                  <p className="text-[10px] text-gray-500">Needed for AI Studio (Stable Diffusion, FLUX, Llama).</p>
                </div>
              </div>

              {status.type !== 'idle' && (
                <div className={clsx(
                  "flex items-center gap-2 text-sm p-3 rounded-lg border",
                  status.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                )}>
                  {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {status.msg}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#1e1e2f] bg-[#06060e] flex items-center justify-between">
              <button 
                onClick={handleClear}
                className="text-sm font-medium text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:underline"
              >
                <Trash2 className="w-4 h-4" /> Clear Keys
              </button>
              
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:underline"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="px-5 py-2 text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors shadow-lg shadow-purple-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
