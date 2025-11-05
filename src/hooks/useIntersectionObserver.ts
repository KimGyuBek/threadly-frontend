import { useEffect } from 'react';
import type { RefObject } from 'react';

export const useIntersectionObserver = (
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  options?: IntersectionObserverInit,
) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback();
        }
      });
    }, options);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref, callback, options]);
};
