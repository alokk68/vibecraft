/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Zap, Palette, UserCheck, Layers } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function Features() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.bento-card',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.bento-grid',
            start: 'top 85%',
          }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="features" ref={containerRef} className="py-24 px-6 relative z-10">
      <div className="max-w-[1200px] mx-auto">
        
        <div className="text-center mb-16">
          <div className="inline-block px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--accent-cyan)] text-xs font-bold uppercase tracking-widest mb-4">
            Architecture
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            The Hybrid <span className="gradient-text">Engine</span>
          </h2>
          <p className="mt-4 text-[var(--text-secondary)] max-w-2xl mx-auto">
            VibeCraft distributes workloads intelligently across your browser, Cloudflare's global edge, and Hugging Face's free tier. 
            Zero cost, massive scale.
          </p>
        </div>

        <div className="bento-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Large Card 1 */}
          <div className="bento-card lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-8 hover:border-[var(--border-hover)] transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center mb-6 shadow-lg shadow-[var(--glow-purple)]">
                <Zap className="text-white w-6 h-6" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">Instant (WebGPU)</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6 flex-grow">
                Uses Transformers.js to run ONNX models directly inside your browser. Your image never leaves your device. 
                Massively accelerates basic tasks like 2x upscaling, background removal, and standard canvas filters without any server latency or API quotas.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs">Upscale</span>
                <span className="px-3 py-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs">Remove BG</span>
                <span className="px-3 py-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs">Adjustments</span>
              </div>
            </div>
          </div>

          {/* Regular Card 2 */}
          <div className="bento-card bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-8 hover:border-[var(--border-hover)] transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-bl from-[var(--accent-cyan)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center mb-6">
                <Palette className="text-[var(--accent-cyan)] w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Studio</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Powered by Cloudflare Workers AI. Runs Stable Diffusion v1.5 for rapid img2img style transfers, colorization, and inpainting (object removal). Uses FLUX.1-schnell for text-to-image.
              </p>
            </div>
          </div>

          {/* Regular Card 3 */}
          <div className="bento-card bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-8 hover:border-[var(--border-hover)] transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center mb-6">
                <UserCheck className="text-pink-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Restore</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Hooks into a free Hugging Face CPU Space to run specialized, heavier models. GFPGAN fixes mangled faces, and AnimeGAN applies high-quality anime styling.
              </p>
            </div>
          </div>

          {/* Large Card 4 */}
          <div className="bento-card lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-8 hover:border-[var(--border-hover)] transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent-blue)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-cyan)] flex items-center justify-center mb-6 shadow-lg shadow-[var(--glow-cyan)]">
                <Layers className="text-white w-6 h-6" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">The Ultimate Pipeline</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6 flex-grow">
                A massive cross-provider chained pipeline. It starts in your browser for a local Upscale pass, pushes the result to Cloudflare for a stylistic Reimagine, and routes the output to Hugging Face to restore facial details with GFPGAN.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs">WebGPU Upscale</span>
                <span className="px-3 py-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs">CF Reimagine</span>
                <span className="px-3 py-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs">HF Face Fix</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
