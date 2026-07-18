/* eslint-disable react/no-unescaped-entities */
export default function Footer() {
  return (
    <footer className="border-t border-[#1e1e2f] bg-[#06060e] py-12 mt-auto">
      <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="text-xl font-black tracking-tight">
            Vibe<span className="text-purple-400">Craft</span>
          </div>
          <p className="text-sm text-gray-500 max-w-sm text-center md:text-left">
            VibeCraft — runs AI image tools in the browser, on Cloudflare's edge, and a free Hugging Face CPU Space.
          </p>
        </div>
        
        <div className="flex items-center gap-6 text-sm font-medium">
          <a 
            href="https://github.com/alokk68/vibecraft" 
            className="text-gray-400 hover:text-white transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a 
            href="#" 
            className="text-gray-400 hover:text-white transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a 
            href="https://huggingface.co/spaces/alokk68/vibecraft-backend" 
            className="text-gray-400 hover:text-white transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            HF Backend
          </a>
        </div>
      </div>
    </footer>
  );
}
