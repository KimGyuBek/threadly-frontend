const DEFAULT_MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const QUALITY_STEP = 0.1;
const SCALE_STEP = 0.85;
const MIN_QUALITY = 0.4;
const MAX_ATTEMPTS = 10;

interface CompressImageOptions {
  maxSizeBytes?: number;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
    reader.readAsDataURL(file);
  });

const loadImage = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지 로딩에 실패했습니다.'));
    image.src = dataUrl;
  });

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('이미지 압축에 실패했습니다.'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });

const getMimeType = (file: File): { mimeType: string; allowQuality: boolean } => {
  const fallbackType = 'image/jpeg';
  if (!file.type.startsWith('image/')) {
    return { mimeType: fallbackType, allowQuality: true };
  }
  if (file.type === 'image/jpeg' || file.type === 'image/webp') {
    return { mimeType: file.type, allowQuality: true };
  }
  if (file.type === 'image/png') {
    return { mimeType: file.type, allowQuality: false };
  }
  return { mimeType: fallbackType, allowQuality: true };
};

export const compressImageFile = async (
  file: File,
  options: CompressImageOptions = {},
): Promise<File> => {
  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  if (file.size <= maxSizeBytes) {
    return file;
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const { mimeType, allowQuality } = getMimeType(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('이미지를 처리할 수 없습니다.');
  }

  const initialScale = Math.min(1, Math.sqrt(maxSizeBytes / file.size));
  let targetWidth = Math.max(1, Math.round(image.width * initialScale));
  let targetHeight = Math.max(1, Math.round(image.height * initialScale));
  let quality = allowQuality ? 0.92 : undefined;

  const redraw = () => {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);
  };

  redraw();
  let blob = await canvasToBlob(canvas, mimeType, quality);
  let attempts = 0;

  while (blob.size > maxSizeBytes && attempts < MAX_ATTEMPTS) {
    if (allowQuality && quality && quality > MIN_QUALITY) {
      quality = Number((quality - QUALITY_STEP).toFixed(2));
    } else {
      targetWidth = Math.max(1, Math.round(targetWidth * SCALE_STEP));
      targetHeight = Math.max(1, Math.round(targetHeight * SCALE_STEP));
    }
    redraw();
    blob = await canvasToBlob(canvas, mimeType, quality);
    attempts += 1;
  }

  if (blob.size > maxSizeBytes) {
    throw new Error('이미지 용량을 8MB 이하로 줄이지 못했습니다. 다른 이미지를 선택해 주세요.');
  }

  const extensionMatch = file.name.match(/\.[^.]+$/);
  const baseName = extensionMatch ? file.name.slice(0, -extensionMatch[0].length) : file.name;
  const extension = mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg';
  const nextFileName = `${baseName || 'image'}${extension}`;

  return new File([blob], nextFileName, {
    type: mimeType,
    lastModified: Date.now(),
  });
};
