import { useEffect, useState, useCallback } from 'react';
import type { MouseEvent } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

interface ImageCropperModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  isProcessing?: boolean;
  onCancel: () => void;
  onConfirm: (area: Area) => void;
}

const ImageCropperModal = ({ imageUrl, isOpen, isProcessing = false, onCancel, onConfirm }: ImageCropperModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };
    const { style } = document.body;
    const originalOverflow = style.overflow;
    style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [imageUrl, isOpen]);

  const handleCropComplete = useCallback((_: Area, pixelArea: Area) => {
    setCroppedArea(pixelArea);
  }, []);

  const handleConfirm = () => {
    if (!croppedArea) {
      return;
    }
    onConfirm(croppedArea);
  };

  if (!isOpen || !imageUrl) {
    return null;
  }

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isProcessing) {
      onCancel();
    }
  };

  return (
    <div className="image-cropper-overlay" role="dialog" aria-modal="true" onClick={handleOverlayClick}>
      <div className="image-cropper-modal">
        <div className="image-cropper-header">
          <h3 className="image-cropper-title">이미지 자르기 (3:4)</h3>
          <button type="button" className="image-cropper-close" onClick={onCancel} disabled={isProcessing}>
            ✕
          </button>
        </div>
        <div className="image-cropper-body">
          <div className="image-cropper-area">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={3 / 4}
              cropShape="rect"
              showGrid={false}
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          </div>
          <label className="image-cropper-zoom">
            <span>확대</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              disabled={isProcessing}
            />
          </label>
        </div>
        <div className="image-cropper-actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={isProcessing}>
            취소
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleConfirm}
            disabled={isProcessing || !croppedArea}
          >
            {isProcessing ? '적용 중...' : '적용'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
