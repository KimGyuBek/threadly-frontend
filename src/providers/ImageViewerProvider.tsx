import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

interface ImageViewerContextValue {
  openImage: (url: string, alt?: string) => void;
  openImages: (urls: string[], startIndex?: number, alt?: string) => void;
  closeImage: () => void;
}

interface ImageViewerState {
  images: string[];
  currentIndex: number;
  alt?: string;
}

const ImageViewerContext = createContext<ImageViewerContextValue | undefined>(undefined);

export const ImageViewerProvider = ({ children }: { children: React.ReactNode }) => {
  const [viewerState, setViewerState] = useState<ImageViewerState | null>(null);

  const closeImage = useCallback(() => {
    setViewerState(null);
  }, []);

  const openImages = useCallback((urls: string[], startIndex = 0, alt?: string) => {
    const validImages = urls.filter((url) => typeof url === 'string' && url.length > 0);
    if (validImages.length === 0) {
      return;
    }
    const safeIndex = Math.min(Math.max(startIndex, 0), validImages.length - 1);
    setViewerState({ images: validImages, currentIndex: safeIndex, alt });
  }, []);

  const openImage = useCallback(
    (url: string, alt?: string) => {
      if (!url) {
        return;
      }
      openImages([url], 0, alt);
    },
    [openImages],
  );

  const showPrev = useCallback(() => {
    setViewerState((prev) => {
      if (!prev || prev.images.length <= 1) {
        return prev;
      }
      const nextIndex = (prev.currentIndex - 1 + prev.images.length) % prev.images.length;
      return { ...prev, currentIndex: nextIndex };
    });
  }, []);

  const showNext = useCallback(() => {
    setViewerState((prev) => {
      if (!prev || prev.images.length <= 1) {
        return prev;
      }
      const nextIndex = (prev.currentIndex + 1) % prev.images.length;
      return { ...prev, currentIndex: nextIndex };
    });
  }, []);

  useEffect(() => {
    if (!viewerState) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeImage();
      } else if (event.key === 'ArrowLeft') {
        showPrev();
      } else if (event.key === 'ArrowRight') {
        showNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewerState, closeImage, showPrev, showNext]);

  const contextValue = useMemo(
    () => ({ openImage, openImages, closeImage }),
    [openImage, openImages, closeImage],
  );

  const currentImage = viewerState ? viewerState.images[viewerState.currentIndex] : null;

  return (
    <ImageViewerContext.Provider value={contextValue}>
      {children}
      {viewerState && currentImage
        ? createPortal(
            <div className="image-viewer" role="dialog" aria-modal="true" onClick={closeImage}>
              <div className="image-viewer__content" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="image-viewer__close" onClick={closeImage} aria-label="닫기">
                  닫기
                </button>
                {viewerState.images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      className="image-viewer__control image-viewer__control--prev"
                      onClick={(event) => {
                        event.stopPropagation();
                        showPrev();
                      }}
                      aria-label="이전 이미지"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="image-viewer__control image-viewer__control--next"
                      onClick={(event) => {
                        event.stopPropagation();
                        showNext();
                      }}
                      aria-label="다음 이미지"
                    >
                      ›
                    </button>
                    <div className="image-viewer__counter">
                      {viewerState.currentIndex + 1}/{viewerState.images.length}
                    </div>
                  </>
                ) : null}
                <img src={currentImage} alt={viewerState.alt ?? '확대된 이미지'} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </ImageViewerContext.Provider>
  );
};

export const useImageViewer = (): ImageViewerContextValue => {
  const context = useContext(ImageViewerContext);
  if (!context) {
    throw new Error('useImageViewer must be used within ImageViewerProvider');
  }
  return context;
};
