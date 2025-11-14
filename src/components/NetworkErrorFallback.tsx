import clsx from 'clsx';

import { NETWORK_UNAVAILABLE_MESSAGE } from '@/utils/networkError';

interface NetworkErrorFallbackProps {
  className?: string;
  buttonClassName?: string;
  message?: string;
  buttonLabel?: string;
  onReload?: () => void;
}

const reloadPage = () => {
  window.location.reload();
};

export const NetworkErrorFallback = ({
  className = 'feed-placeholder feed-placeholder--error',
  buttonClassName = 'btn',
  message = NETWORK_UNAVAILABLE_MESSAGE,
  buttonLabel = '새로 고침',
  onReload,
}: NetworkErrorFallbackProps) => {
  return (
    <div className={clsx(className)}>
      <p>{message}</p>
      <button type="button" className={buttonClassName} onClick={onReload ?? reloadPage}>
        {buttonLabel}
      </button>
    </div>
  );
};
