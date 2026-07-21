/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type */
import { pipeline, env, RawImage } from '@xenova/transformers';

// force remote models, local throws in browser
env.allowLocalModels = false;
env.useBrowserCache = true;

class PipelineFactory {
  static instances: Record<string, any> = {};

  static async getInstance(task: string, model: string, progress_callback: Function) {
    const key = `${task}-${model}`;
    if (!this.instances[key]) {
      // Try WebGPU first, then fallback to WASM
      try {
        this.instances[key] = await pipeline(task as any, model, {
          progress_callback,
          device: 'webgpu', 
        } as any);
      } catch (err) {
        console.warn('WebGPU not supported or failed to load. Falling back to WASM (CPU).', err);
        this.instances[key] = await pipeline(task as any, model, {
          progress_callback,
          device: 'wasm',
        } as any);
      }
    }
    return this.instances[key];
  }
}

self.addEventListener('message', async (event) => {
  const { id, type, payload } = event.data;

  try {
    if (type === 'load') {
      const { tool } = payload;
      let task = '';
      let model = '';

      if (tool === 'upscale') {
        task = 'image-to-image';
        model = 'Xenova/swin2SR-lightweight-x2-64'; // ~5MB model
      } else if (tool === 'removebg') {
        task = 'image-segmentation';
        model = 'Xenova/rmbg-1.4'; // ~44MB quantized
      } else {
        throw new Error(`Unknown tool: ${tool}`);
      }

      await PipelineFactory.getInstance(task, model, (info: any) => {
        self.postMessage({ id, type: 'progress', payload: info });
      });

      self.postMessage({ id, type: 'ready' });

    } else if (type === 'process') {
      const { tool, imageBase64 } = payload;
      let task = '';
      let model = '';

      if (tool === 'upscale') {
        task = 'image-to-image';
        model = 'Xenova/swin2SR-lightweight-x2-64';
      } else if (tool === 'removebg') {
        task = 'image-segmentation';
        model = 'Xenova/rmbg-1.4';
      }

      const processor = await PipelineFactory.getInstance(task, model, () => {});
      
      const response = await fetch(imageBase64);
      const blob = await response.blob();
      const rawImage = await RawImage.fromBlob(blob);

      let resultBase64 = '';

      const blobToBase64 = (b: Blob): Promise<string> => new Promise(res => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.readAsDataURL(b);
      });

      if (tool === 'removebg') {
        const result = await processor(rawImage);
        const mask = result.find((r: any) => r.label === 'foreground')?.mask || result;
        const canvas = new OffscreenCanvas(rawImage.width, rawImage.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get offscreen canvas context');

        const imgBitmap = await createImageBitmap(blob);
        ctx.drawImage(imgBitmap, 0, 0);

        ctx.globalCompositeOperation = 'destination-in';
        const maskBlob = await mask.toBlob();
        const maskBitmap = await createImageBitmap(maskBlob);
        ctx.drawImage(maskBitmap, 0, 0, rawImage.width, rawImage.height);

        const outBlob = await canvas.convertToBlob({ type: 'image/png' });
        resultBase64 = await blobToBase64(outBlob);

      } else if (tool === 'upscale') {
        const result = await processor(rawImage);
        const outBlob = await result.toBlob();
        resultBase64 = await blobToBase64(outBlob);
      }

      self.postMessage({ id, type: 'complete', payload: resultBase64 });
    }
  } catch (error: any) {
    self.postMessage({ id, type: 'error', payload: error.message || 'Worker error' });
  }
});
