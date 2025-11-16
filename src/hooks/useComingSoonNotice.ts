import { useEffect } from 'react';
import { toast } from 'react-toastify';

const DEFAULT_MESSAGE = '아직 준비중인 기능입니다';

/**
 * Shows a one-time toast when the hosting component is mounted to inform users
 * that the current page is not fully available yet.
 */
export const useComingSoonNotice = (message: string = DEFAULT_MESSAGE) => {
  useEffect(() => {
    toast.info(message);
  }, [message]);
};
