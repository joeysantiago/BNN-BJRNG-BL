/** The picture types the app and the server accept (the server checks the real type of every file). */
export const TASK_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Shrinks a picked picture to the longest edge edgePx (Tasks.PhotoEdgePx of the AppSettings table) as WebP, or JPEG where WebP cannot be made. Drawing it again also drops the camera data (EXIF, location). */
export async function compressPhoto(file: File, edgePx: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, edgePx / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const make = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.8));
  const webp = await make('image/webp');
  const blob = webp?.type === 'image/webp' ? webp : await make('image/jpeg');
  if (!blob)
    throw new Error('compress');
  return blob;
}

/** The file name of a compressed picture: the picked name with the extension of the new type. */
export const photoName = (picked: File, blob: Blob): string => picked.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.jpg');
