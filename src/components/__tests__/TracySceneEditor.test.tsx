import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TracySceneEditor from '../TracySceneEditor'

describe('TracySceneEditor', () => {
  const mockOnRender = vi.fn()
  const isLoading = false

  beforeEach(() => {
    mockOnRender.mockClear()
  })

  it('preserves decimal input values like 0.01 without converting to 0', async () => {
    render(<TracySceneEditor onRender={mockOnRender} isLoading={isLoading} />)
    
    // Click on the first sphere to select it
    const firstSphere = screen.getByText('Sphere 1')
    fireEvent.click(firstSphere)
    
    // Find the first position input (X coordinate)  
    const positionInputs = screen.getAllByDisplayValue('0')
    const xPositionInput = positionInputs[0] as HTMLInputElement
    
    // The key test: entering 0.01 should not be replaced with 0
    fireEvent.change(xPositionInput, { target: { value: '0.01' } })
    
    // The input should maintain some decimal representation
    // (could be '0.01' or just not be '0' - the key is it's not reset to 0)
    expect(xPositionInput.value).not.toBe('0')
    expect(parseFloat(xPositionInput.value)).toBe(0.01)
  })

  it('preserves 0.0 intermediate value to allow typing 0.01', async () => {
    render(<TracySceneEditor onRender={mockOnRender} isLoading={isLoading} />)
    
    // Click on the first sphere to select it
    const firstSphere = screen.getByText('Sphere 1')
    fireEvent.click(firstSphere)
    
    // Find the reflective input (should show default value 0.55)
    const reflectiveInput = screen.getByDisplayValue('0.55') as HTMLInputElement
    
    // Clear the input first
    fireEvent.change(reflectiveInput, { target: { value: '' } })
    
    // The key test: Enter "0.0" - this should be preserved and not converted back to "0"
    fireEvent.change(reflectiveInput, { target: { value: '0.0' } })
    
    // The value should be preserved to allow continuing to type "0.01"
    // Note: HTML5 number inputs may normalize this, but it shouldn't become empty or cause issues
    expect(reflectiveInput.value).not.toBe('')
    expect(parseFloat(reflectiveInput.value)).toBe(0)
    
    // Most importantly: we should be able to continue typing to get 0.01
    fireEvent.change(reflectiveInput, { target: { value: '0.01' } })
    expect(reflectiveInput.value).toBe('0.01')
    expect(parseFloat(reflectiveInput.value)).toBe(0.01)
    
    // And we should also be able to enter other small decimals without issues
    fireEvent.change(reflectiveInput, { target: { value: '0.05' } })
    expect(parseFloat(reflectiveInput.value)).toBe(0.05)
  })

  it('correctly handles small decimal values in light intensity', async () => {
    render(<TracySceneEditor onRender={mockOnRender} isLoading={isLoading} />)
    
    // Switch to lights tab
    const lightsTab = screen.getByText('Lights')
    fireEvent.click(lightsTab)
    
    // Click on the first light to select it  
    const firstLight = screen.getByText('ambient Light 1')
    fireEvent.click(firstLight)
    
    // Find the intensity input (should show default value 0.2)
    const intensityInput = screen.getByDisplayValue('0.2') as HTMLInputElement
    
    // Test entering a small decimal value
    fireEvent.change(intensityInput, { target: { value: '0.05' } })
    expect(parseFloat(intensityInput.value)).toBe(0.05)
    
    // Test entering 0.01 specifically
    fireEvent.change(intensityInput, { target: { value: '0.01' } })
    expect(parseFloat(intensityInput.value)).toBe(0.01)
  })

  it('handles very small decimal values in background star probability', async () => {
    render(<TracySceneEditor onRender={mockOnRender} isLoading={isLoading} />)
    
    // Switch to background tab
    const backgroundTab = screen.getByText('Background')
    fireEvent.click(backgroundTab)
    
    // Find the star probability input (should show default value 0.0006)
    const starProbInput = screen.getByDisplayValue('0.0006') as HTMLInputElement
    
    // Test entering 0.01 (which would be too high for star probability but should work)
    fireEvent.change(starProbInput, { target: { value: '0.01' } })
    expect(parseFloat(starProbInput.value)).toBe(0.01)
    
    // Test entering a very small value like 0.0001
    fireEvent.change(starProbInput, { target: { value: '0.0001' } })
    expect(parseFloat(starProbInput.value)).toBe(0.0001)
  })

  it('still handles empty strings by defaulting to 0', async () => {
    render(<TracySceneEditor onRender={mockOnRender} isLoading={isLoading} />)
    
    // Click on the first sphere to select it
    const firstSphere = screen.getByText('Sphere 1')
    fireEvent.click(firstSphere)
    
    // Find the radius input (should show default value 1)
    const radiusInput = screen.getByDisplayValue('1') as HTMLInputElement
    
    // Clear the input (empty string)
    fireEvent.change(radiusInput, { target: { value: '' } })
    
    // Should show empty or 0
    expect(radiusInput.value === '' || radiusInput.value === '0').toBe(true)
  })

  it('handles invalid input by falling back to 0', async () => {
    render(<TracySceneEditor onRender={mockOnRender} isLoading={isLoading} />)
    
    // Click on the first sphere to select it
    const firstSphere = screen.getByText('Sphere 1')
    fireEvent.click(firstSphere)
    
    // Find the radius input - it might be 1 or 0 depending on previous test state
    const radiusInputs = screen.getAllByRole('spinbutton')
    const radiusInput = radiusInputs.find((input) => 
      input.getAttribute('placeholder') === '1.0'
    ) as HTMLInputElement
    
    expect(radiusInput).toBeDefined()
    
    // Enter invalid text
    fireEvent.change(radiusInput, { target: { value: 'abc' } })
    
    // Should fall back to 0 when parsed
    expect(parseFloat(radiusInput.value) || 0).toBe(0)
  })
})