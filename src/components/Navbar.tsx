'use client';

import { useState, useEffect } from 'react';
import { Menu, X, Settings, Key } from 'lucide-react';
import { SettingsModal, getSavedKeys } from './SettingsModal';
import { UsageWidget } from './UsageWidget';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [usingOwnKeys, setUsingOwnKeys] = useState(false);

  // Check keys on mount and when modal closes
  useEffect(() => {
    if (!showSettings) {
      const keys = getSavedKeys();
      setTimeout(() => setUsingOwnKeys(!!(keys.hfToken || keys.cfAccountId || keys.cfApiToken)), 0);
    }
  }, [showSettings]);

  useEffect(() => {
    let lastScroll = 0;
    
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setScrolled(currentScroll > 50);
      
      // Hide navbar on scroll down, show on scroll up
      if (currentScroll > lastScroll && currentScroll > 200) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScroll = currentScroll;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#06060e]/80 backdrop-blur-xl border-b border-[var(--color-border-subtle)]' : 'bg-transparent'
        } ${hidden ? '-translate-y-full' : 'translate-y-0'}`}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
          <a href="#" className="text-xl font-extrabold tracking-tight gradient-text">
            ✨ VibeCraft
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-[var(--color-text-muted)] hover:text-white transition-colors">Features</a>
            <a href="#playground" className="text-sm font-medium text-[var(--color-text-muted)] hover:text-white transition-colors">Playground</a>
            <a href="#open-source" className="text-sm font-medium text-[var(--color-text-muted)] hover:text-white transition-colors">Open Source</a>
            
            {usingOwnKeys && (
              <span className="flex items-center gap-1.5 text-xs font-medium bg-[var(--glow-purple)] text-[var(--accent-secondary)] px-2 py-1 rounded-md border border-[var(--border-subtle)]" title="Using your own API keys">
                <Key className="w-3 h-3" /> BYOK Active
              </span>
            )}
            
            <UsageWidget />
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-[var(--color-text-muted)] hover:text-white transition-colors rounded-full hover:bg-[var(--color-bg-secondary)]"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <a href="#playground" className="text-sm font-semibold bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white px-5 py-2.5 rounded-md hover:shadow-[0_0_15px_var(--color-glow-purple)] hover:-translate-y-0.5 transition-all">
              Get Started
            </a>
          </div>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-4 md:hidden">
            <button 
              id="settings-trigger"
              onClick={() => setShowSettings(true)}
              className="p-2 text-[var(--color-text-muted)] hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              className="text-white p-2"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-[#06060e]/95 backdrop-blur-md pt-24 px-6 md:hidden">
          <div className="flex flex-col gap-6">
            <a href="#features" onClick={() => setIsOpen(false)} className="text-xl font-medium text-[var(--color-text-secondary)]">Features</a>
            <a href="#playground" onClick={() => setIsOpen(false)} className="text-xl font-medium text-[var(--color-text-secondary)]">Playground</a>
            <a href="#open-source" onClick={() => setIsOpen(false)} className="text-xl font-medium text-[var(--color-text-secondary)]">Open Source</a>
            <a href="#faq" onClick={() => setIsOpen(false)} className="text-xl font-medium text-[var(--color-text-secondary)]">FAQ</a>
          </div>
        </div>
      )}
    </>
  );
}
