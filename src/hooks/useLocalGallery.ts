'use client';

import { useState, useEffect, useCallback } from 'react';
import { getGalleryItems, addGalleryItem, deleteGalleryItem, clearGallery, GalleryImage } from '@/lib/db';

export function useLocalGallery() {
  const [items, setItems] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // Prevent IDB from hanging Next.js hydration if the DB thread is locked
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    
    try {
      const data = await Promise.race([
        getGalleryItems(),
        new Promise<GalleryImage[]>((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error('IDB timeout')));
        })
      ]);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (active) {
      setTimeout(() => {
        if (active) {
          loadItems().catch(() => {});
        }
      }, 0);
    }
    return () => { active = false; };
  }, [loadItems]);

  const addImage = useCallback(async (record: Omit<GalleryImage, 'id' | 'timestamp'>) => {
    try {
      await addGalleryItem(record);
      await loadItems();
    } catch (err) {
      // Storage might be completely full despite evictions on iOS
      console.error(err);
    }
  }, [loadItems]);

  const removeImage = useCallback(async (id: string) => {
    try {
      await deleteGalleryItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await clearGallery();
      setItems([]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  return {
    items,
    isLoading,
    addImage,
    removeImage,
    clearAll,
    refresh: loadItems
  };
}
