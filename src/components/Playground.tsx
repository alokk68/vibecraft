/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @next/next/no-img-element, jsx-a11y/alt-text, react-hooks/exhaustive-deps */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Smile, Wand2, Layers, SplitSquareHorizontal, Paintbrush, Eraser, Trash2, Zap, Palette, Cloud, AlertCircle, X, Loader2, History, Share2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useLocalGallery } from '../hooks/useLocalGallery';
import { getSavedKeys } from './SettingsModal';
import { invariant } from '../lib/invariant';

function Toast({ message, type, onClose }: { message: string, type: 'error' | 'success', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={clsx(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border backdrop-blur-md max-w-sm",
        type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-green-500/10 border-green-500/20 text-green-400"
      )}
    >
      {type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <Sparkles className="w-5 h-5 shrink-0" />}
      <span className="text-sm font-medium leading-tight">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-black/20 rounded-md transition-colors ml-auto shrink-0" aria-label="Close notification">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

const compressImage = (base64: string, maxWidth = 1024, quality = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64;
  });
};

export default function Playground() {
  const [file, setFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState(0); 
  const [toast, setToast] = useState<{msg: string, type: 'error'|'success'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);

  const [activeTab, setActiveTab] = useState<'instant' | 'studio' | 'restore' | 'ultimate'>('instant');
  const [prompt, setPrompt] = useState('');
  const [strength, setStrength] = useState([0.6]);
  const [usePromptEnhancer, setUsePromptEnhancer] = useState(true);

  const [instantTool, setInstantTool] = useState('upscale');
  const [studioTool, setStudioTool] = useState('@cf/runwayml/stable-diffusion-v1-5-img2img');
  const [restoreTool, setRestoreTool] = useState('face');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState([20]);
  const [isEraser, setIsEraser] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);

  const { items: historyItems, addImage, clearAll: clearGalleryHistory } = useLocalGallery();
  const [showHistory, setShowHistory] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const [eta, setEta] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [lastProcessingTime, setLastProcessingTime] = useState<number | null>(null);

  const ROTATING_MESSAGES = [
    "Warming up the model...",
    "Analyzing pixels...",
    "Enhancing details...",
    "Applying magic...",
    "Almost there..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(() => setElapsed(prev => prev + 0.1), 100);
    } else {
      setTimeout(() => setElapsed(0), 0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing && (activeTab === 'studio' || activeTab === 'restore')) {
      interval = setInterval(() => {
        setStepIndex(prev => (prev + 1) % ROTATING_MESSAGES.length);
      }, 2500);
    } else {
      setTimeout(() => setStepIndex(0), 0);
    }
    return () => clearInterval(interval);
  }, [isProcessing, activeTab]);

  const validateAndLoadFile = (selectedFile: File) => {
    // TODO: HEIC uploads still break Safari — revisit
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setToast({ msg: 'Invalid file type. Please upload PNG, JPG, or WEBP.', type: 'error' });
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) { 
      setToast({ msg: 'File too large. Maximum size is 15MB.', type: 'error' });
      return;
    }
    setFile(selectedFile);
    loadBase64(selectedFile);
  };

  const loadBase64 = (f: File | Blob) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawBase64 = e.target?.result as string;
      setOriginalImage(rawBase64);
      const comp = await compressImage(rawBase64, 1024, 0.85);
      setCompressedImage(comp);
      setProcessedImage(null);
      setCompareMode(false);
      clearMask();
    };
    reader.readAsDataURL(f);
  };

  const loadDemoImage = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      loadBase64(blob);
    } catch (err) {
      setToast({ msg: 'Failed to load demo image.', type: 'error' });
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) validateAndLoadFile(e.dataTransfer.files[0]);
  };

  const getMaskBase64 = () => canvasRef.current?.toDataURL('image/png') || null;

  const drawMask = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    
    ctx.lineWidth = brushSize[0];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearMask = () => {
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
  };

  const enhancePromptIfNeeded = async (rawPrompt: string, keys: any): Promise<string> => {
    if (!usePromptEnhancer || !rawPrompt.trim()) return rawPrompt;
    setStatusText('Enhancing prompt with Llama-3...');
    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cf-account-id': keys.cfAccountId, 'x-cf-token': keys.cfApiToken },
        body: JSON.stringify({ prompt: rawPrompt })
      });
      const data = await res.json();
      return (data.success && data.enhancedPrompt) ? data.enhancedPrompt : rawPrompt;
    } catch { return rawPrompt; }
  };

  const runInstantInference = (imgBase64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!worker.current) return reject(new Error('Worker not initialized'));
      const reqId = Date.now().toString();
      
      const onMessage = (e: MessageEvent) => {
        const { id, type, payload } = e.data;
        if (id !== reqId) return;
        if (type === 'progress') {
          if (payload.status === 'downloading' || payload.status === 'progress') {
            setProgress(Math.round(payload.progress || 0));
            setStatusText(`Downloading AI model: ${Math.round(payload.progress || 0)}%`);
          } else if (payload.status === 'done') {
            setProgress(100);
            setStatusText('Model cached. Initializing...');
          }
        } else if (type === 'ready') {
          setProgress(0);
          setStatusText('Running local WebGPU inference...');
          worker.current?.postMessage({ id: reqId, type: 'process', payload: { tool: instantTool, imageBase64: imgBase64 } });
        } else if (type === 'complete') {
          worker.current?.removeEventListener('message', onMessage);
          resolve(payload);
        } else if (type === 'error') {
          worker.current?.removeEventListener('message', onMessage);
          reject(new Error(payload));
        }
      };
      worker.current.addEventListener('message', onMessage);
      setStatusText('Checking local model cache...');
      worker.current.postMessage({ id: reqId, type: 'load', payload: { tool: instantTool } });
    });
  };

  const runStudioInference = async (imgBase64: string, promptStr: string, keys: any) => {
    setStatusText('Generating on Cloudflare edge...');
    const mask = studioTool.includes('inpainting') ? getMaskBase64() : undefined;
    
    // Estimate cost: SD1.5 is ~25 neurons, Flux is ~100
    const cost = studioTool.includes('flux') ? 100 : 25;
    window.dispatchEvent(new CustomEvent('vc:log-usage', { detail: { type: 'cf', cost } }));

    const res = await fetch('/api/ai-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cf-account-id': keys.cfAccountId, 'x-cf-token': keys.cfApiToken },
      body: JSON.stringify({ image: imgBase64, prompt: promptStr, strength: strength[0], mask, model: studioTool })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    if (data.processingTime) setLastProcessingTime(data.processingTime);
    return data.image;
  };

  const runRestoreInference = async (imgBase64: string, keys: any, mode: string = restoreTool) => {
    setStatusText(`Processing on HF Space (${mode})...`);
    window.dispatchEvent(new CustomEvent('vc:log-usage', { detail: { type: 'hf', cost: 1 } }));

    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-hf-token': keys.hfToken },
      body: JSON.stringify({ image: imgBase64, mode })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    if (data.processingTime) setLastProcessingTime(data.processingTime);
    return data.image;
  };

  async function handleGenerate() {
    invariant(originalImage && compressedImage, 'Tried to generate before image compression finished');
    if (!originalImage || !compressedImage || isProcessing) return;
    setIsProcessing(true);
    setProcessedImage(null);
    setProgress(0);
    setLastProcessingTime(null);
    const keys = getSavedKeys();

    // hacky eta
    let currentEta = 10;
    if (activeTab === 'instant') currentEta = 5;
    else if (activeTab === 'studio') currentEta = studioTool.includes('flux') ? 15 : 10;
    else if (activeTab === 'restore') currentEta = 60; // HF Spaces can be slow
    else if (activeTab === 'ultimate') currentEta = 90;
    setEta(currentEta);

    try {
      let result = null;
      let finalPrompt = prompt;

      if (activeTab === 'instant') result = await runInstantInference(originalImage);
      else if (activeTab === 'studio') {
        finalPrompt = await enhancePromptIfNeeded(prompt, keys);
        result = await runStudioInference(compressedImage, finalPrompt, keys);
      } 
      else if (activeTab === 'restore') result = await runRestoreInference(compressedImage, keys);
      else if (activeTab === 'ultimate') {
        finalPrompt = await enhancePromptIfNeeded(prompt, keys);
        setStatusText('Step 1/3: WebGPU Upscale...');
        const localUpscaled = await runInstantInference(originalImage);
        const compressedUpscaled = await compressImage(localUpscaled, 1024, 0.85);
        
        setStatusText('Step 2/3: Cloudflare Style Transfer...');
        const tempStudioTool = studioTool;
        setStudioTool('@cf/runwayml/stable-diffusion-v1-5-img2img');
        const studioResult = await runStudioInference(compressedUpscaled, finalPrompt, keys);
        setStudioTool(tempStudioTool); 
        
        setStatusText('Step 3/3: Face Restore (GFPGAN)...');
        result = await runRestoreInference(studioResult, keys, 'face');
      }

      setProcessedImage(result);
      setCompareMode(true);
      setSliderPos(50);
      setToast({ msg: `Generation complete! ${lastProcessingTime ? `Done in ${(lastProcessingTime/1000).toFixed(1)}s` : ''}`, type: 'success' });
      
      if (result && originalImage) {
        await addImage({
          originalImage,
          processedImage: result,
          mode: activeTab,
          prompt: finalPrompt || undefined
        });
      }
      
    } catch (err: any) {
      setToast({ msg: err.message || 'An error occurred during processing', type: 'error' });
    } finally {
      setIsProcessing(false);
      setStatusText('');
      setProgress(0);
    }
  };

  const isButtonDisabled = () => {
    if (isProcessing || !originalImage) return true;
    if ((activeTab === 'studio' || activeTab === 'ultimate') && prompt.trim() === '') return true;
    return false;
  };

  const copyShareLink = async (base64Img: string) => {
    try {
      const res = await fetch(base64Img);
      const blob = await res.blob();
      const file = new File([blob], 'vibecraft-result.png', { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'VibeCraft Image',
          text: 'Generated with VibeCraft AI Studio',
          files: [file]
        });
      } else {
        const a = document.createElement('a');
        a.href = base64Img;
        a.download = `vibecraft-result-${Date.now()}.png`;
        a.click();
        setToast({ msg: 'Image downloaded successfully.', type: 'success' });
      }
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  return (
    <section id="playground" className="py-24 px-6 relative max-w-[1400px] mx-auto min-h-[90vh]">
      <AnimatePresence>
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div className="flex justify-between items-end mb-12">
        <div className="text-left">
          <h2 className="text-4xl md:text-5xl font-black mb-4">The <span className="gradient-text">Studio</span></h2>
          <p className="text-[var(--text-secondary)]">Drop an image, select your architecture, and generate.</p>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl transition-colors border outline-none", showHistory ? "bg-[var(--accent-primary)] border-transparent text-white shadow-lg" : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white")}
        >
          <History className="w-4 h-4" /> History
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-stretch min-h-[700px]">
        
        <div className="w-full lg:w-[400px] flex flex-col gap-6">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-1.5 rounded-xl flex">
            {[
              { id: 'instant', icon: Zap, label: 'Instant' },
              { id: 'studio', icon: Palette, label: 'Studio' },
              { id: 'restore', icon: Smile, label: 'Restore' },
              { id: 'ultimate', icon: Layers, label: 'Ultimate' },
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => { setActiveTab(t.id as any); setCompareMode(false); }}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all rounded-lg relative outline-none",
                  activeTab === t.id ? "text-white" : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-primary)]/50"
                )}
              >
                {activeTab === t.id && <motion.div layoutId="activeTab" className="absolute inset-0 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg shadow-sm" />}
                <span className="relative z-10 flex items-center gap-2"><t.icon className="w-4 h-4" /> <span className="hidden sm:inline">{t.label}</span></span>
              </button>
            ))}
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-6 flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              {activeTab === 'instant' && (
                <motion.div key="instant" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-6">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-yellow-400"/> WebGPU Engine</h3>
                    <p className="text-[var(--text-muted)] text-xs">Runs locally. Works entirely offline.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['upscale', 'removebg'].map(tool => (
                      <button 
                        key={tool}
                        onClick={() => setInstantTool(tool)} 
                        className={clsx(
                          "p-4 rounded-xl text-sm border font-medium text-left transition-all outline-none",
                          instantTool === tool ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-white shadow-[0_0_15px_rgba(34,211,238,0.15)]" : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
                        )}
                      >
                        {tool === 'upscale' ? 'Upscale 2x' : 'Remove BG'}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'studio' && (
                <motion.div key="studio" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-6">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><Cloud className="w-4 h-4 text-blue-400"/> Cloudflare AI Studio</h3>
                    <p className="text-[var(--text-muted)] text-xs">Powered by edge nodes. Blazing fast.</p>
                  </div>
                  <select 
                    value={studioTool}
                    onChange={(e) => setStudioTool(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--accent-primary)] outline-none"
                  >
                    <option value="@cf/runwayml/stable-diffusion-v1-5-img2img">Style Transfer (SD 1.5)</option>
                    <option value="@cf/runwayml/stable-diffusion-v1-5-inpainting">Object Replace (Inpaint)</option>
                    <option value="@cf/black-forest-labs/flux-1-schnell">Text to Image (FLUX.1)</option>
                  </select>
                  {studioTool.includes('inpainting') && (
                    <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-4">
                      <div className="flex justify-between mb-4">
                        <span className="text-sm font-medium text-white flex items-center gap-2"><Paintbrush className="w-4 h-4 text-[var(--accent-primary)]"/> Mask Brush</span>
                        <div className="flex gap-1.5 p-1 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                          <button onClick={() => setIsEraser(false)} className={clsx("p-1.5 rounded-md", !isEraser ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)]")}><Paintbrush className="w-3.5 h-3.5"/></button>
                          <button onClick={() => setIsEraser(true)} className={clsx("p-1.5 rounded-md", isEraser ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)]")}><Eraser className="w-3.5 h-3.5"/></button>
                          <button onClick={clearMask} className="p-1.5 rounded-md text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                      </div>
                      <input type="range" min="5" max="50" value={brushSize[0]} onChange={(e) => setBrushSize([parseInt(e.target.value)])} className="w-full accent-[var(--accent-primary)]" />
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Prompt</label>
                      <label className="flex items-center gap-2 text-xs text-[var(--accent-cyan)] cursor-pointer bg-[var(--accent-cyan)]/10 px-2 py-1 rounded-md">
                        <Wand2 className="w-3 h-3" /> Enhance <input type="checkbox" checked={usePromptEnhancer} onChange={e => setUsePromptEnhancer(e.target.checked)} className="accent-[var(--accent-cyan)]" />
                      </label>
                    </div>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. cinematic lighting..." className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--accent-primary)] outline-none min-h-[100px]" />
                  </div>
                  {!studioTool.includes('flux') && (
                    <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-4">
                      <label className="text-sm font-medium text-white flex justify-between mb-2">Strength <span>{strength[0]}</span></label>
                      <input type="range" min="0.1" max="1.0" step="0.1" value={strength[0]} onChange={(e) => setStrength([parseFloat(e.target.value)])} className="w-full accent-[var(--accent-cyan)]" />
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'restore' && (
                <motion.div key="restore" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-6">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><Smile className="w-4 h-4 text-pink-400"/> HF Space Engine</h3>
                    <p className="text-[var(--text-muted)] text-xs">Heavier PyTorch models running on a free CPU space.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {[{ id: 'face', label: 'GFPGAN Face Restore' }, { id: 'oldphoto', label: 'Old Photo Denoise' }, { id: 'anime', label: 'Anime Stylization' }].map(t => (
                      <button key={t.id} onClick={() => setRestoreTool(t.id)} className={clsx("p-4 rounded-xl border text-left", restoreTool === t.id ? "border-pink-500 bg-pink-500/10" : "border-[var(--border-subtle)] hover:bg-[var(--bg-primary)]")}>
                        <div className={clsx("text-sm font-semibold", restoreTool === t.id ? "text-white" : "text-[var(--text-secondary)]")}>{t.label}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'ultimate' && (
                <motion.div key="ultimate" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-6">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><Layers className="w-4 h-4 text-purple-400"/> The Ultimate Chain</h3>
                    <p className="text-[var(--text-muted)] text-xs">WebGPU Upscale → CF Img2Img → HF Face Fix.</p>
                  </div>
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Style prompt..." className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--accent-primary)] outline-none min-h-[100px]" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-auto pt-6">
              <button 
                onClick={handleGenerate}
                disabled={isButtonDisabled()}
                className={clsx(
                  "w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 outline-none",
                  isButtonDisabled() ? "bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)] cursor-not-allowed" : "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-cyan)] text-white hover:opacity-90"
                )}
              >
                {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> {statusText || 'Processing...'}</> : <><Sparkles className="w-5 h-5" /> Generate (Enter)</>}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          
          <div className="bg-[#06060e] rounded-2xl border border-[var(--border-subtle)] overflow-hidden relative flex-1 flex flex-col shadow-2xl min-h-[500px]">
            {!originalImage ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="flex gap-4 mb-8">
                  {['/sample1.jpg', '/sample2.jpg', '/sample3.jpg'].map((s, i) => (
                    <button key={i} onClick={() => loadDemoImage(s)} className="w-20 h-20 rounded-xl border border-[var(--border-subtle)] overflow-hidden hover:border-[var(--accent-primary)] hover:scale-105 transition-all">
                      <img src={s} alt="Demo" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <label 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={onDrop}
                  className={clsx(
                    "relative w-full max-w-lg h-80 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden",
                    isDragging ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/5 scale-105" : "border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-secondary)]/50"
                  )}
                >
                  <Upload className="w-8 h-8 text-[var(--text-secondary)] mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Drop your image here (U)</h3>
                  <p className="text-[var(--text-muted)] text-sm">Or try a demo image above</p>
                  <input id="file-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => e.target.files && validateAndLoadFile(e.target.files[0])} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" ref={fileInputRef} />
                </label>
              </div>
            ) : (
              <div className="flex-1 relative flex flex-col items-center justify-center p-4">
                <div className="absolute top-4 right-4 z-30 flex gap-2">
                  {processedImage && (
                    <button onClick={() => copyShareLink(processedImage)} className="px-3 py-1.5 bg-[var(--accent-primary)] text-white text-xs font-bold rounded-lg transition-colors shadow-lg flex items-center gap-2">
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </button>
                  )}
                  <button onClick={() => { setFile(null); setOriginalImage(null); setProcessedImage(null); setCompressedImage(null); }} className="p-2 bg-black/60 hover:bg-red-500/80 text-white rounded-lg backdrop-blur-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl bg-black/40 checkerboard-bg">
                  {compareMode && processedImage ? (
                    <div className="relative w-full h-full select-none" onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setSliderPos((Math.max(0, Math.min(e.clientX - rect.left, rect.width)) / rect.width) * 100);
                    }}>
                      <img src={originalImage} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
                        <img src={processedImage} className="absolute inset-0 w-full h-full object-contain max-w-none pointer-events-none" style={{ width: `${100 * (100 / sliderPos)}%` }} />
                      </div>
                      <div className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize z-10" style={{ left: `calc(${sliderPos}% - 1px)` }}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center"><SplitSquareHorizontal className="w-5 h-5 text-gray-800" /></div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img src={originalImage} onLoad={(e) => { if(canvasRef.current && studioTool.includes('inpainting')) { canvasRef.current.width = e.currentTarget.naturalWidth; canvasRef.current.height = e.currentTarget.naturalHeight; } }} className="w-full h-full object-contain pointer-events-none" />
                      {activeTab === 'studio' && studioTool.includes('inpainting') && (
                        <canvas ref={canvasRef} className="absolute w-full h-full object-contain cursor-crosshair opacity-70 z-10" onMouseDown={() => { setIsDrawing(true); drawMask(null as any); }} onMouseMove={drawMask} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                      )}
                      {processedImage && !compareMode && <img src={processedImage} className="absolute inset-0 w-full h-full object-contain bg-black/80 backdrop-blur-sm" />}
                    </div>
                  )}
                </div>
                
                <div className="h-20 w-full mt-4 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-2 flex items-center gap-2">
                  <button className="h-full aspect-square relative rounded-lg border-2 border-[var(--accent-primary)] overflow-hidden" onClick={() => setCompareMode(false)}>
                    <img src={originalImage} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 w-full bg-black/60 text-[8px] text-white font-bold text-center">ORIGINAL</div>
                  </button>
                  {processedImage && (
                    <button className="h-full aspect-square relative rounded-lg border border-[var(--border-subtle)] overflow-hidden" onClick={() => setCompareMode(true)}>
                      <img src={processedImage} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 w-full bg-[var(--accent-cyan)]/80 text-[8px] text-black font-bold text-center">RESULT</div>
                    </button>
                  )}
                </div>
              </div>
            )}

            <AnimatePresence>
              {isProcessing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#06060e]/90 backdrop-blur-md flex flex-col items-center justify-center z-50 p-8 text-center">
                  <div className="w-64 h-64 border border-[var(--border-subtle)] rounded-2xl relative overflow-hidden mb-6 shadow-2xl flex flex-col items-center justify-center bg-[var(--bg-secondary)]">
                    <div className="w-12 h-12 rounded-full border-4 border-t-[var(--accent-primary)] animate-spin mb-4" />
                    <div className="text-2xl font-mono font-bold text-[var(--accent-cyan)]">{elapsed.toFixed(1)}s</div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1">ETA: ~{eta}s</div>
                  </div>
                  
                  <div className="h-6 overflow-hidden mb-2 relative">
                    <AnimatePresence mode="wait">
                      <motion.h3 
                        key={activeTab === 'ultimate' ? statusText : ROTATING_MESSAGES[stepIndex]}
                        initial={{ y: 20, opacity: 0 }} 
                        animate={{ y: 0, opacity: 1 }} 
                        exit={{ y: -20, opacity: 0 }}
                        className="text-lg font-bold text-white absolute w-full text-center"
                      >
                        {activeTab === 'ultimate' || activeTab === 'instant' ? statusText : ROTATING_MESSAGES[stepIndex]}
                      </motion.h3>
                    </AnimatePresence>
                  </div>
                  
                  <div className="w-64 h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden mt-4">
                    {activeTab === 'instant' ? (
                      <motion.div animate={{ width: progress > 0 ? `${progress}%` : ["20%", "80%", "40%"] }} transition={{ duration: 2, ease: "easeInOut", repeat: progress > 0 ? 0 : Infinity, repeatType: "mirror" }} className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-cyan)]" />
                    ) : (
                      <motion.div 
                        initial={{ width: "0%" }}
                        animate={{ width: `${Math.min((elapsed / eta) * 100, 95)}%` }}
                        transition={{ ease: "linear" }}
                        className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-cyan)]"
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showHistory && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 160, opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><History className="w-4 h-4"/> Recent Generations</h4>
                  <button onClick={async () => await clearGalleryHistory()} className="text-xs text-red-400 hover:underline">Clear</button>
                </div>
                {historyItems.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-muted)]">No history yet.</div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {historyItems.map((item) => (
                      <div key={item.id} className="relative w-24 h-24 rounded-lg overflow-hidden border border-[var(--border-subtle)] shrink-0 group cursor-pointer" onClick={() => { setOriginalImage(item.originalImage); setProcessedImage(item.processedImage); setActiveTab(item.mode as 'studio' | 'instant' | 'restore' | 'ultimate'); setCompareMode(true); window.scrollTo({ top: document.getElementById('playground')?.offsetTop, behavior: 'smooth' }); }}>
                        <img src={item.processedImage} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-bold text-white backdrop-blur-sm">LOAD</div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </section>
  );
}
