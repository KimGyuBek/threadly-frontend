import { useContext } from 'react';

import { ImageViewerContext } from './imageViewerContext';
import type { ImageViewerContextValue } from './imageViewerContext';

export const useImageViewer = (): ImageViewerContextValue => {
  const context = useContext(ImageViewerContext);
  if (!context) {
    throw new Error('useImageViewer must be used within ImageViewerProvider');
  }
  return context;
};
