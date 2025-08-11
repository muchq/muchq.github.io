import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { useTopologyQuest } from '../useTopologyQuest'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ module: 'sets' })
  }
})

describe('useTopologyQuest', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('should initialize with sets module', () => {
    const { result } = renderHook(() => useTopologyQuest(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/top/sets']}>
          {children}
        </MemoryRouter>
      )
    })

    expect(result.current.activeModule).toBe('sets')
    expect(result.current.isFirstModule()).toBe(true)
    expect(result.current.isLastModule()).toBe(false)
  })

  it('should get correct module info', () => {
    const { result } = renderHook(() => useTopologyQuest(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/top/sets']}>
          {children}
        </MemoryRouter>
      )
    })

    const moduleInfo = result.current.getModuleInfo()
    expect(moduleInfo.title).toBe('Set Theory')
    expect(moduleInfo.subtitle).toBe('Module 1: Introduction to Sets')
    expect(moduleInfo.moduleNumber).toBe(1)
  })

  it('should navigate to next module', () => {
    const { result } = renderHook(() => useTopologyQuest(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/top/sets']}>
          {children}
        </MemoryRouter>
      )
    })

    act(() => {
      result.current.navigateToNextModule()
    })

    expect(result.current.activeModule).toBe('functions')
    expect(mockNavigate).toHaveBeenCalledWith('/top/functions')
    const moduleInfo = result.current.getModuleInfo()
    expect(moduleInfo.moduleNumber).toBe(2)
  })

  it('should navigate to previous module', () => {
    const { result } = renderHook(() => useTopologyQuest(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/top/functions']}>
          {children}
        </MemoryRouter>
      )
    })

    // Start with functions module
    act(() => {
      result.current.setActiveModule('functions')
    })

    // Then go back
    act(() => {
      result.current.navigateToPreviousModule()
    })

    expect(result.current.activeModule).toBe('sets')
    expect(mockNavigate).toHaveBeenCalledWith('/top/sets')
  })

  it('should calculate progress percentage correctly', () => {
    const { result } = renderHook(() => useTopologyQuest(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/top/sets']}>
          {children}
        </MemoryRouter>
      )
    })

    // First module should be 10%
    expect(result.current.getProgressPercentage()).toBe(10)

    // Last module should be 100%
    act(() => {
      result.current.setActiveModule('functionspaces')
    })

    expect(result.current.getProgressPercentage()).toBe(100)
    expect(result.current.isLastModule()).toBe(true)
  })

  it('should navigate to specific module', () => {
    const { result } = renderHook(() => useTopologyQuest(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/top/sets']}>
          {children}
        </MemoryRouter>
      )
    })

    act(() => {
      result.current.setActiveModule('compactness')
    })

    expect(result.current.activeModule).toBe('compactness')
    expect(mockNavigate).toHaveBeenCalledWith('/top/compactness')
    const moduleInfo = result.current.getModuleInfo()
    expect(moduleInfo.title).toBe('Compactness')
    expect(moduleInfo.moduleNumber).toBe(8)
  })
})
