// 브라우저에서 사진을 줄여서 올릴 준비 (클라이언트 전용).
// 큰 원본(휴대폰 사진 3~10MB)을 그대로 DB에 넣지 않도록, 화면에 필요한 크기로 줄이고 JPEG로 바꾼다
import { COVER_HEIGHT, COVER_MIN_HEIGHT, COVER_MIN_WIDTH, COVER_WIDTH, IMAGE_MAX_BYTES, NOTE_IMAGE_MAX_SIDE } from '@/lib/images';

export type PreparedImage = { blob: Blob; width: number; height: number; small: boolean };

/** <img>로 읽는다: 휴대폰 사진의 회전 정보(EXIF)를 브라우저가 맞춰 준다 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이 사진은 열 수 없어요. JPG나 PNG로 바꿔서 올려 주세요'));
    };
    image.src = url;
  });
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('사진을 바꾸지 못했어요'))), 'image/jpeg', quality);
  });
}

/**
 * mode 'cover': 가운데를 세로 3:4로 잘라 900×1200으로 (원본이 작으면 원본 크기 그대로, small = 600×800 미만)
 * mode 'note': 비율 그대로 긴 쪽 1600px까지
 */
export async function prepareImage(file: File, mode: 'cover' | 'note'): Promise<PreparedImage> {
  if (!file.type.startsWith('image/') && file.type !== '') throw new Error('사진 파일만 올릴 수 있어요');
  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  if (!sourceWidth || !sourceHeight) throw new Error('이 사진은 열 수 없어요');

  let crop = { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  let width: number;
  let height: number;
  if (mode === 'cover') {
    const ratio = COVER_WIDTH / COVER_HEIGHT;
    if (sourceWidth / sourceHeight > ratio) {
      const cropWidth = Math.round(sourceHeight * ratio);
      crop = { x: Math.round((sourceWidth - cropWidth) / 2), y: 0, width: cropWidth, height: sourceHeight };
    } else {
      const cropHeight = Math.round(sourceWidth / ratio);
      crop = { x: 0, y: Math.round((sourceHeight - cropHeight) / 2), width: sourceWidth, height: cropHeight };
    }
    const scale = Math.min(1, COVER_WIDTH / crop.width);
    width = Math.round(crop.width * scale);
    height = Math.round(width / ratio);
  } else {
    const scale = Math.min(1, NOTE_IMAGE_MAX_SIDE / Math.max(sourceWidth, sourceHeight));
    width = Math.round(sourceWidth * scale);
    height = Math.round(sourceHeight * scale);
  }

  // 그래도 크면 화질 → 크기 순으로 낮춘다
  for (const shrink of [1, 0.8, 0.64, 0.5]) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * shrink));
    canvas.height = Math.max(1, Math.round(height * shrink));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('사진을 바꾸지 못했어요');
    context.fillStyle = '#ffffff'; // 투명한 PNG는 흰 바탕으로
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.86, 0.75]) {
      const blob = await toJpeg(canvas, quality);
      if (blob.size <= IMAGE_MAX_BYTES) {
        return {
          blob,
          width: canvas.width,
          height: canvas.height,
          small: mode === 'cover' && (crop.width < COVER_MIN_WIDTH || crop.height < COVER_MIN_HEIGHT),
        };
      }
    }
  }
  throw new Error('사진이 너무 커요. 더 작은 사진으로 올려 주세요');
}

/** 준비한 사진을 서버 액션에 넘길 FormData로 */
export function imageFormData(prepared: PreparedImage, kind: 'cover' | 'note'): FormData {
  const formData = new FormData();
  formData.set('kind', kind);
  formData.set('file', new File([prepared.blob], `${kind}.jpg`, { type: 'image/jpeg' }));
  formData.set('width', String(prepared.width));
  formData.set('height', String(prepared.height));
  return formData;
}
