import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#06060e] flex flex-col items-center justify-center text-center px-6">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-purple-500/20 blur-[100px] rounded-full" />
        <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 relative z-10">
          404
        </h1>
      </div>
      
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
        Page Not Found
      </h2>
      <p className="text-gray-400 max-w-md mb-8">
        The studio space you are looking for doesn&apos;t exist or has been moved to a different environment.
      </p>
      
      <Link 
        href="/"
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-purple-500/25"
      >
        <Home className="w-5 h-5" />
        Return to Studio
      </Link>
    </div>
  );
}
