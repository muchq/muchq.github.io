/**
 * Handles API response parsing with better error handling for non-JSON responses
 * Common in cases where request bodies exceed size limits and proxies return text
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`

    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorMessage
    } catch {
      // If JSON parsing fails, try to get text response
      try {
        const errorText = await response.text()
        // Check if it looks like a size/length error
        if (errorText.toLowerCase().includes('too large') ||
            errorText.toLowerCase().includes('size') ||
            errorText.toLowerCase().includes('limit') ||
            response.status === 413) {
          errorMessage = 'The image is too large. Please choose a smaller image or reduce its quality.'
        } else if (errorText && errorText.length < 200) {
          // Use the text if it's reasonably short
          errorMessage = errorText
        }
      } catch {
        // If both JSON and text parsing fail, use a user-friendly message
        if (response.status === 413) {
          errorMessage = 'The image is too large. Please choose a smaller image or reduce its quality.'
        }
      }
    }

    throw new Error(errorMessage)
  }

  return response.json()
}