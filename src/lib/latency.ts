import { invariant } from './invariant';

export function measure(markName: string) {
  invariant(typeof performance !== 'undefined', 'performance API missing - probably Safari 15');
  const startMark = `${markName}-start`;
  const endMark = `${markName}-end`;
  
  performance.mark(startMark);
  
  return () => {
    performance.mark(endMark);
    performance.measure(markName, startMark, endMark);
    return performance.getEntriesByName(markName).pop()?.duration ?? 0;
  };
}
