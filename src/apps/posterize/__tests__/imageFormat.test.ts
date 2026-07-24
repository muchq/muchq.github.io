import { describe, it, expect } from 'vitest'
import {
  formatToMime,
  formatToExtension,
  imageFormatInfo,
} from '../imageFormat'

describe('imageFormat', () => {
  it('maps known formats to their MIME type', () => {
    expect(formatToMime('PNG')).toBe('image/png')
    expect(formatToMime('JPEG')).toBe('image/jpeg')
    expect(formatToMime('GIF')).toBe('image/gif')
    expect(formatToMime('BMP')).toBe('image/bmp')
    expect(formatToMime('TIFF')).toBe('image/tiff')
    expect(formatToMime('WEBP')).toBe('image/webp')
    expect(formatToMime('ICO')).toBe('image/x-icon')
  })

  it('maps known formats to their file extension', () => {
    expect(formatToExtension('PNG')).toBe('png')
    expect(formatToExtension('JPEG')).toBe('jpg')
    expect(formatToExtension('TIFF')).toBe('tiff')
  })

  it('is case-insensitive on the format label', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToExtension('Gif')).toBe('gif')
  })

  it('falls back to PNG for unknown, empty, or missing formats', () => {
    expect(imageFormatInfo('SVG')).toEqual({ mime: 'image/png', extension: 'png' })
    expect(formatToMime('')).toBe('image/png')
    expect(formatToMime(null)).toBe('image/png')
    expect(formatToMime(undefined)).toBe('image/png')
  })
})
