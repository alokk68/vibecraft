/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';

export default function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    // lazy load when in viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = canvas.width = canvas.clientWidth * window.devicePixelRatio;
    let height = canvas.height = canvas.clientHeight * window.devicePixelRatio;
    
    const isMobile = window.innerWidth < 768;
    const NUM_DOTS = isMobile ? 300 : 600; 
    const SPHERE_RADIUS = Math.min(width, height) * 0.35;
    
    const rotation = { x: 0, y: 0 };
    const targetRotation = { x: 0, y: 0 };
    let isDragging = false;
    let lastMouse = { x: 0, y: 0 };
    let animationFrameId: number;

    const PHI = (1 + Math.sqrt(5)) / 2;

    const dots = Array.from({ length: NUM_DOTS }).map((_, i) => {
      const t = i / (NUM_DOTS - 1);
      const theta = 2 * Math.PI * i / PHI;
      const z = 1 - (2 * t);
      const radiusAtZ = Math.sqrt(1 - z * z);
      
      const x = Math.cos(theta) * radiusAtZ;
      const y = Math.sin(theta) * radiusAtZ;

      return {
        x: x * SPHERE_RADIUS,
        y: y * SPHERE_RADIUS,
        z: z * SPHERE_RADIUS,
        baseX: x * SPHERE_RADIUS,
        baseY: y * SPHERE_RADIUS,
        baseZ: z * SPHERE_RADIUS,
      };
    });

    const rotate3D = (dot: any, angleX: number, angleY: number) => {
      let cos = Math.cos(angleX);
      let sin = Math.sin(angleX);
      const y1 = dot.y * cos - dot.z * sin;
      const z1 = dot.y * sin + dot.z * cos;
      
      cos = Math.cos(angleY);
      sin = Math.sin(angleY);
      const x2 = dot.x * cos + z1 * sin;
      const z2 = -dot.x * sin + z1 * cos;
      
      return { x: x2, y: y1, z: z2 };
    };

    const draw = () => {
      // skip render if tab inactive
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      rotation.x += (targetRotation.x - rotation.x) * 0.1;
      rotation.y += (targetRotation.y - rotation.y) * 0.1;

      if (!isDragging) {
        targetRotation.y -= 0.002;
        targetRotation.x += 0.001;
      }

      ctx.fillStyle = '#06060e';
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const focalLength = SPHERE_RADIUS * 2;

      const projectedDots = dots.map(dot => {
        const rotated = rotate3D(dot, rotation.x, rotation.y);
        const scale = focalLength / (focalLength + rotated.z);
        
        return {
          ...rotated,
          scale,
          px: centerX + rotated.x * scale,
          py: centerY + rotated.y * scale
        };
      });

      projectedDots.sort((a, b) => b.z - a.z);

      ctx.lineWidth = 0.5 * window.devicePixelRatio;
      for (let i = 0; i < projectedDots.length; i++) {
        const dot1 = projectedDots[i];
        if (dot1.z > 0) continue;

        for (let j = i + 1; j < projectedDots.length; j++) {
          const dot2 = projectedDots[j];
          if (dot2.z > 0) continue;
          
          const dx = dot1.x - dot2.x;
          const dy = dot1.y - dot2.y;
          const dz = dot1.z - dot2.z;
          const distSq = dx*dx + dy*dy + dz*dz;
          
          if (distSq < (SPHERE_RADIUS * 0.4) ** 2) {
            const opacity = (1 - Math.sqrt(distSq)/(SPHERE_RADIUS * 0.4)) * 0.3 * dot1.scale;
            ctx.strokeStyle = `rgba(124, 58, 237, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(dot1.px, dot1.py);
            ctx.lineTo(dot2.px, dot2.py);
            ctx.stroke();
          }
        }
      }

      projectedDots.forEach(dot => {
        const size = Math.max(0.5, (dot.z > 0 ? 1 : 2.5) * dot.scale * window.devicePixelRatio);
        
        const r = dot.z > 0 ? 124 : 34;
        const g = dot.z > 0 ? 58 : 211;
        const b = dot.z > 0 ? 237 : 238;
        const alpha = dot.z > 0 ? 0.3 : 0.8 + (dot.z / SPHERE_RADIUS) * 0.2;
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        
        ctx.beginPath();
        ctx.arc(dot.px, dot.py, size, 0, Math.PI * 2);
        ctx.fill();
        
        if (dot.z < -SPHERE_RADIUS * 0.8) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      lastMouse = { x: clientX, y: clientY };
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      const deltaX = clientX - lastMouse.x;
      const deltaY = clientY - lastMouse.y;
      
      targetRotation.y += deltaX * 0.005;
      targetRotation.x += deltaY * 0.005;
      
      targetRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, targetRotation.x));
      
      lastMouse = { x: clientX, y: clientY };
    };

    const handleUp = () => {
      isDragging = false;
    };

    canvas.addEventListener('mousedown', handleDown);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    
    canvas.addEventListener('touchstart', handleDown, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleUp);

    const handleResize = () => {
      width = canvas.width = canvas.clientWidth * window.devicePixelRatio;
      height = canvas.height = canvas.clientHeight * window.devicePixelRatio;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('touchstart', handleDown);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [isInView]);

  return (
    <div ref={containerRef} className="w-full h-[500px] relative cursor-grab active:cursor-grabbing rounded-2xl overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)]">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full absolute inset-0 block"
        style={{ width: '100%', height: '100%' }}
      />
      
      {!isInView && (
        <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)]">
          <div className="w-8 h-8 border-2 border-t-[var(--color-accent-primary)] rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}
