import { describe, it, expect } from 'vitest';
import { stripBase64Prefix } from '@/app/api/ai-studio/route';

describe('Helper Functions', () => {
  describe('stripBase64Prefix', () => {
    it('should strip data:image/png;base64, prefix', () => {
      const input = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const expected = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      expect(stripBase64Prefix(input)).toBe(expected);
    });

    it('should strip data:image/jpeg;base64, prefix', () => {
      const input = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
      const expected = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
      expect(stripBase64Prefix(input)).toBe(expected);
    });

    it('should handle strings without prefix safely', () => {
      const input = 'rawbase64stringwithoutprefix==';
      expect(stripBase64Prefix(input)).toBe(input);
    });
    
    it('should handle empty strings safely', () => {
      expect(stripBase64Prefix('')).toBe('');
    });
  });
});
