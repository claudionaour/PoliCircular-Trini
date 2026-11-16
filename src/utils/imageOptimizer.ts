const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_RAW_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB entrada
const MAX_DIMENSION = 1400;

export interface OptimizedImageResult {
  file: File;
  previewUrl: string;
  sizeBytes: number;
}

export async function validateAndOptimizeImage(file: File): Promise<OptimizedImageResult> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Formato no permitido. Usa únicamente fotografías JPG, PNG o WebP.');
  }

  if (file.size > MAX_RAW_SIZE_BYTES) {
    throw new Error('La fotografía supera el límite máximo permitido de 10 MB.');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
  const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No fue posible inicializar el optimizador de imágenes.');
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.84)
  );

  if (!blob) {
    throw new Error('Error al comprimir la imagen.');
  }

  const baseName = file.name.replace(/\.[^.]+$/, '');
  const optimizedFile = new File([blob], `${baseName}.webp`, { type: 'image/webp' });
  const previewUrl = URL.createObjectURL(optimizedFile);

  return {
    file: optimizedFile,
    previewUrl,
    sizeBytes: optimizedFile.size,
  };
}
