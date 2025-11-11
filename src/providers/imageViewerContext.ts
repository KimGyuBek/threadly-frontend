import { createContext } from 'react';

export interface ImageViewerContextValue {
  openImage: (url: string, alt?: string) => void;
  openImages: (urls: string[], startIndex?: number, alt?: string) => void;
  closeImage: () => void;
}

export const ImageViewerContext = createContext<ImageViewerContextValue | undefined>(undefined);
