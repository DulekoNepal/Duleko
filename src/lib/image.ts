/**
 * Phone cameras produce 3-8 MB photos, but an avatar is shown at 48-128px
 * and a cover at most ~1200px wide. Uploading the original made every list
 * of workers pull megabytes per face, so photos are resized and
 * re-encoded on the device before they ever leave it.
 */

/** Longest side, in pixels, each kind of upload is shrunk to. */
export const IMAGE_MAX_SIDE = {
  avatar: 512,
  cover: 1600,
  // Certificates are read, not glanced at - keep small print legible.
  certificate: 2000,
} as const;

/** Largest original we accept before shrinking - anything bigger is almost certainly not a photo. */
export const MAX_PHOTO_INPUT_BYTES = 20 * 1024 * 1024;

const SHRINKABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    // <img> applies the camera's EXIF rotation, so portrait shots stay upright.
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the photo"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Returns a resized WebP (or JPEG where the browser can't encode WebP)
 * no larger than `maxSide` on its longest edge. Anything that can't be
 * shrunk - a PDF, an unreadable file - comes back unchanged, and so does
 * a photo that re-encoding would only make bigger.
 */
export async function shrinkImage(file: File, maxSide: number, quality = 0.82): Promise<File> {
  if (!SHRINKABLE.has(file.type)) return file;
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  // JPEG has no transparency: a PNG's clear areas would otherwise turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  // Browsers that can't encode WebP silently hand back a PNG, which is
  // far bigger for photos - fall back to JPEG in that case.
  let blob = await canvasToBlob(canvas, "image/webp", quality);
  if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", quality);
  if (!blob || (scale === 1 && blob.size >= file.size)) return file;

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() });
}
