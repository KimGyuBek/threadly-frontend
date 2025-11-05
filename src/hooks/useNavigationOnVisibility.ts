import { useEffect } from 'react';

export const useNavigationOnVisibility = (callback: () => void, deps: unknown[]) => {
  useEffect(() => {
    if (document.visibilityState === 'visible') {
      callback();
    }
    const handler = () => {
      if (document.visibilityState === 'visible') {
        callback();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
