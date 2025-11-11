import type { Area } from 'react-easy-crop';

const DEFAULT_MAX_DIMENSION = 2048;
const DEFAULT_MAX_FILE_SIZE = 2.5 * 1024 * 1024; // 2.5MB
const MIN_QUALITY = 0.7;
const QUALITY_STEP = 0.05;
const RESIZE_STEP_RATIO = 0.9;
const MIN_LONGEST_SIDE = 900;

interface CropToFileOptions {
  maxDimension?: number;
  maxFileSize?: number;
  outputType?: string;
  initialQuality?: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
    image.src = src;
  });

const cloneCanvasWithSize = (source: HTMLCanvasElement, width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('캔버스를 생성하지 못했습니다.');
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
};

const limitCanvasDimension = (source: HTMLCanvasElement, maxDimension: number): HTMLCanvasElement => {
  const longestSide = Math.max(source.width, source.height);
  if (!maxDimension || longestSide <= maxDimension) {
    return source;
  }
  const ratio = maxDimension / longestSide;
  const targetWidth = Math.round(source.width * ratio);
  const targetHeight = Math.round(source.height * ratio);
  return cloneCanvasWithSize(source, targetWidth, targetHeight);
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('이미지를 처리하는 데 실패했습니다.'));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });

const compressCanvas = async (
  canvas: HTMLCanvasElement,
  type: string,
  maxSize: number,
  initialQuality: number,
): Promise<Blob> => {
  if (!maxSize) {
    return canvasToBlob(canvas, type, initialQuality);
  }

  let currentCanvas = canvas;
  let quality = initialQuality;
  while (true) {
    let blob: Blob;
    try {
      blob = await canvasToBlob(currentCanvas, type, quality);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '이미지를 처리하지 못했습니다.');
    }

    if (blob.size <= maxSize || Math.max(currentCanvas.width, currentCanvas.height) <= MIN_LONGEST_SIDE) {
      return blob;
    }

    const supportsQuality = type === 'image/jpeg' || type === 'image/webp';
    if (supportsQuality && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
      continue;
    }

    const nextLongestSide = Math.round(Math.max(currentCanvas.width, currentCanvas.height) * RESIZE_STEP_RATIO);
    currentCanvas = limitCanvasDimension(currentCanvas, nextLongestSide);
    quality = initialQuality;
  }
};

export const getCroppedImageFile = async (
  imageSrc: string,
  pixelCrop: Area,
  fileName: string,
  mimeType: string,
  options: CropToFileOptions = {},
): Promise<File> => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('캔버스를 생성하지 못했습니다.');
  }

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = pixelCrop.width * pixelRatio;
  canvas.height = pixelCrop.height * pixelRatio;

  context.scale(pixelRatio, pixelRatio);
  context.imageSmoothingQuality = 'high';

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  const outputType = options.outputType ?? (mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg');
  const initialQuality = options.initialQuality ?? 0.85;

  const sizedCanvas = limitCanvasDimension(canvas, maxDimension);
  const blob = await compressCanvas(sizedCanvas, outputType, maxFileSize, initialQuality);

  const extension = outputType.split('/')[1] ?? 'jpg';
  const safeFileName = fileName.includes('.') ? fileName : `${fileName}.${extension}`;

  return new File([blob], safeFileName, { type: outputType });
};
