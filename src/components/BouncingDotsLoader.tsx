import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

export type BouncingDotsLoaderProps = HTMLAttributes<HTMLDivElement> & {
  message?: string | null;
  size?: 'md' | 'sm';
};

export const BouncingDotsLoader = ({
  message = '불러오는 중입니다...',
  size = 'md',
  className,
  ...rest
}: BouncingDotsLoaderProps) => {
  const ariaLabel = message ?? '불러오는 중입니다...';
  return (
    <div
      className={clsx('bouncing-loader', size === 'sm' && 'bouncing-loader--sm', className)}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      {...rest}
    >
      <div className="bouncing-loader__dots" aria-hidden="true">
        <span className="bouncing-loader__dot" />
        <span className="bouncing-loader__dot" />
        <span className="bouncing-loader__dot" />
      </div>
      {message ? <p className="bouncing-loader__message">{message}</p> : null}
    </div>
  );
};
