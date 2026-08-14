'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { getSavedKeys } from './SettingsModal';

export function UsageWidget() {
  const [neurons, setNeurons] = useState(0);
  const [hfCalls, setHfCalls] = useState(0);
  const [isByok, setIsByok] = useState(false);
  const MAX_NEURONS = 10000;
  
  useEffect(() => {

    setTimeout(() => {
      const keys = getSavedKeys();
      setIsByok(!!(keys.cfAccountId && keys.cfApiToken));
    }, 0);


    const loadUsage = () => {
      const today = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem('vc_usage_date');
      if (savedDate !== today) {
        localStorage.setItem('vc_usage_date', today);
        localStorage.setItem('vc_cf_neurons', '0');
        localStorage.setItem('vc_hf_calls', '0');
      }
      
      setNeurons(parseInt(localStorage.getItem('vc_cf_neurons') || '0', 10));
      setHfCalls(parseInt(localStorage.getItem('vc_hf_calls') || '0', 10));
    };
    
    loadUsage();

    const handleUsageLog = (e: Event) => {
      const { type, cost } = (e as CustomEvent).detail;
      const today = new Date().toISOString().split('T')[0];
      

      if (localStorage.getItem('vc_usage_date') !== today) {
        loadUsage(); 
      }

      if (type === 'cf') {
        const newNeurons = neurons + cost;
        setNeurons(newNeurons);
        localStorage.setItem('vc_cf_neurons', newNeurons.toString());
      } else if (type === 'hf') {
        const newCalls = hfCalls + cost;
        setHfCalls(newCalls);
        localStorage.setItem('vc_hf_calls', newCalls.toString());
      }
    };

    window.addEventListener('vc:log-usage', handleUsageLog);
    return () => window.removeEventListener('vc:log-usage', handleUsageLog);
  }, [neurons, hfCalls]);

  const percentage = Math.min((neurons / MAX_NEURONS) * 100, 100);
  const circumference = 2 * Math.PI * 14; 
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-[#13132b] border border-[#1e1e2f] rounded-xl mr-2" title="Daily API Usage (Estimated)">
      <div className="relative w-8 h-8 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <motion.circle 
            cx="16" 
            cy="16" 
            r="14" 
            fill="none" 
            stroke="var(--accent-cyan)" 
            strokeWidth="3" 
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <Activity className="w-3.5 h-3.5 text-gray-400 absolute" />
      </div>
      <div className="flex flex-col">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
          {isByok ? "Your Key" : "Free Quota"} <span className="text-[8px] font-normal text-gray-600">(est)</span>
        </div>
        <div className="text-xs font-medium text-white leading-none">
          {neurons.toLocaleString()} <span className="text-gray-500">/ 10k CF</span>
        </div>
        {hfCalls > 0 && (
          <div className="text-[9px] text-gray-500 leading-none mt-0.5">
            + {hfCalls} HF Calls
          </div>
        )}
      </div>
    </div>
  );
}
