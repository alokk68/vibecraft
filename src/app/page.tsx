import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Globe from '@/components/Globe';
import Playground from '@/components/Playground';

export default function Home() {
  return (
    <main className="min-h-screen">
      
      <Hero />
      
      <Features />

      {/* Architecture / Globe Section */}
      <section id="network" className="py-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="w-full lg:w-[60%]">
              <Globe />
            </div>
            <div className="w-full lg:w-[40%]">
              <div className="inline-block px-3 py-1 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-[var(--color-accent-cyan)] text-xs font-bold uppercase tracking-widest mb-4">
                Architecture
              </div>
              <h2 className="text-4xl font-bold mb-6">
                How <span className="gradient-text">It Works</span>
              </h2>
              <p className="text-[var(--color-text-secondary)] leading-relaxed mb-10">
                VibeCraft runs on a serverless architecture powered by Vercel and the Hugging Face Inference API. 
                When you upload an image, the Next.js API route proxies the request directly to Hugging Face&apos;s hosted models. 
                No GPUs or dedicated servers required.
              </p>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <span className="block text-3xl font-black gradient-text mb-1">3</span>
                  <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider">AI Models</span>
                </div>
                <div>
                  <span className="block text-3xl font-black gradient-text mb-1">Free</span>
                  <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider">100% Free</span>
                </div>
                <div>
                  <span className="block text-3xl font-black gradient-text mb-1">No</span>
                  <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider">GPU Needed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Playground Section */}
      <section id="playground" className="py-24 px-6 relative">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-[var(--color-accent-cyan)] text-xs font-bold uppercase tracking-widest mb-4">
              Playground
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Experience It <span className="gradient-text">Now</span>
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              Upload an image, pick a mode, and test the models out yourself.
            </p>
          </div>
          
          <Playground />
        </div>
      </section>
    </main>
  );
}
