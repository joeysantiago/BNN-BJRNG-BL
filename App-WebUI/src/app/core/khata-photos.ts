import { environment } from '../../environments/environment';

/** Bill photo limits (environment.khata, in step with the API's Khata:Limits). */
export const PHOTO_LIMITS = environment.khata;

/** The image types a bill photo may be; the API checks the same list. */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** "320 KB" / "1.4 MB". */
export const fileSize = (bytes: number): string => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

const decodeImage = (file: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Makes a picked photo small before it is uploaded: the longest edge at most photoEdgePx, WebP (JPEG where the browser can't write WebP).
 * Drawing on a canvas also drops EXIF data such as the location.
 */
export const compressPhoto = async (file: Blob): Promise<Blob | null> => {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    source = await decodeImage(file);
  }
  const scale = Math.min(1, PHOTO_LIMITS.photoEdgePx / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const g = canvas.getContext('2d');
  if (!g)
    return null;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.drawImage(source, 0, 0, canvas.width, canvas.height);
  const webp = await toBlob(canvas, 'image/webp', 0.75);
  if (webp && webp.type === 'image/webp')
    return webp;
  return toBlob(canvas, 'image/jpeg', 0.78);
};

/** The saved file name: the picked name with the extension of the compressed type. */
export const photoName = (picked: string, blob: Blob): string => picked.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.jpg');
