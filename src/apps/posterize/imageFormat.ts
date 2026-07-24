/**
 * Maps the posterize API's `format` field (e.g. "PNG", "JPEG") to the MIME type
 * and file extension the browser needs for rendering, downloading, and copying.
 * The API returns the image in the same format it received where an encoder is
 * available; WebP/ICO inputs come back as PNG.
 */
export interface ImageFormatInfo {
  mime: string
  extension: string
}

const FORMAT_INFO: Record<string, ImageFormatInfo> = {
  PNG: { mime: 'image/png', extension: 'png' },
  JPEG: { mime: 'image/jpeg', extension: 'jpg' },
  GIF: { mime: 'image/gif', extension: 'gif' },
  BMP: { mime: 'image/bmp', extension: 'bmp' },
  TIFF: { mime: 'image/tiff', extension: 'tiff' },
  WEBP: { mime: 'image/webp', extension: 'webp' },
  ICO: { mime: 'image/x-icon', extension: 'ico' },
}

const DEFAULT_INFO: ImageFormatInfo = FORMAT_INFO.PNG

/** Look up MIME + extension for an API format label, defaulting to PNG. */
export const imageFormatInfo = (format: string | null | undefined): ImageFormatInfo => {
  if (!format) return DEFAULT_INFO
  return FORMAT_INFO[format.toUpperCase()] ?? DEFAULT_INFO
}

export const formatToMime = (format: string | null | undefined): string =>
  imageFormatInfo(format).mime

export const formatToExtension = (format: string | null | undefined): string =>
  imageFormatInfo(format).extension

/** MIME types the posterize backend can decode, used for the upload filter. */
export const ACCEPTED_UPLOAD_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/webp',
] as const
