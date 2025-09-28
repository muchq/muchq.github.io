import { useState, useRef, useCallback } from 'react'
import styles from './ImageUploader.module.css'

interface ImageUploaderProps {
  onImageSelect: (base64: string) => void
  isLoading: boolean
}

const ImageUploader = ({ onImageSelect, isLoading }: ImageUploaderProps) => {
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/png')) {
      alert('Please select a PNG image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result) {
        // Extract base64 data (remove data:image/png;base64, prefix)
        const base64Data = result.split(',')[1]
        setPreviewUrl(result)
        onImageSelect(base64Data)
      }
    }
    reader.readAsDataURL(file)
  }, [onImageSelect])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const handlePaste = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read()
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type)
            const file = new File([blob], 'pasted-image.png', { type: 'image/png' })
            processFile(file)
            return
          }
        }
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err)
      alert('Failed to paste image. Please try uploading a file instead.')
    }
  }, [processFile])

  const handleClick = () => {
    if (!isLoading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropZone} ${dragActive ? styles.active : ''} ${isLoading ? styles.loading : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          onChange={handleFileInput}
          className={styles.hiddenInput}
        />

        {previewUrl ? (
          <div className={styles.previewContainer}>
            <img src={previewUrl} alt="Preview" className={styles.preview} />
            <div className={styles.previewOverlay}>
              <p>Click to change image</p>
            </div>
          </div>
        ) : (
          <div className={styles.uploadPrompt}>
            <div className={styles.uploadIcon}>📁</div>
            <h3>Drop your PNG here</h3>
            <p>or click to browse files</p>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button
          onClick={handlePaste}
          disabled={isLoading}
          className={styles.pasteButton}
          title="Paste image from clipboard"
        >
          📋 Paste Image
        </button>
      </div>
    </div>
  )
}

export default ImageUploader