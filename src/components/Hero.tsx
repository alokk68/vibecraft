'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

const Hero3D = dynamic(() => import('./Hero3D'), { 
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-cyan-900/20 pointer-events-none" />
});

export default function Hero() {
  const scrollToPlayground = () => {
    document.getElementById('playground')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
      <Suspense fallback={null}>
        <Hero3D />
      </Suspense>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-8 backdrop-blur-md">
            <Sparkles className="w-4 h-4" />
            <span>Hybrid Architecture • Zero Cost</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[1.1] mb-6">
            Enhance Reality<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-[length:200%_auto] animate-gradient">
              At The Edge.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed">
            A production-grade AI studio running natively in your browser, powered by Cloudflare Workers and Hugging Face. 
            No subscriptions. No queues.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <button 
              onClick={scrollToPlayground}
              className="group flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-gray-100 transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              Enter Studio
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <a 
              href="https://github.com/alokk68/vibecraft" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-8 py-4 bg-black/40 border border-gray-700 text-white rounded-full font-bold text-lg hover:bg-black/60 transition-all backdrop-blur-md"
            >
              View Architecture
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
