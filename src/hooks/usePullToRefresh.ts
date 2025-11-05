import { useEffect, useRef } from 'react';

interface Options {
  threshold?: number;
}

export const usePullToRefresh = (onRefresh: () => void, { threshold = 60 }: Options = {}) => {
  const startYRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      if (window.scrollY === 0) {
        startYRef.current = event.touches[0].clientY;
        triggeredRef.current = false;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (startYRef.current === null || triggeredRef.current) {
        return;
      }
      const currentY = event.touches[0].clientY;
      const diff = currentY - startYRef.current;
      if (diff > threshold && window.scrollY === 0) {
        triggeredRef.current = true;
        onRefresh();
      }
    };

    const handleTouchEnd = () => {
      startYRef.current = null;
      triggeredRef.current = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold]);
};
