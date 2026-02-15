import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { useTopologyQuest } from '../useTopologyQuest'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { module: 'sets' }
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => (path: string) => {
      mocks.navigate(path)
      const parts = path.split('/')
      if (parts[1] === 'top' && parts[2]) {
        mocks.params.module = parts[2]
      }
    },
    useParams: () => mocks.params
  }
})

describe('useTopologyQuest', () => {
  beforeEach(() => {
    mocks.navigate.mockClear()
    mocks.params.module = 'sets'
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
    const { result, rerender } = renderHook(() => useTopologyQuest(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/top/sets']}>
          {children}
        </MemoryRouter>
      )
    })

    act(() => {
      result.current.navigateToNextModule()
    })

    // Rerender to reflect the new params
    rerender()

    expect(result.current.activeModule).toBe('functions')
    expect(mocks.navigate).toHaveBeenCalledWith('/top/functions')
    const moduleInfo = result.current.getModuleInfo()
    expect(moduleInfo.moduleNumber).toBe(2)
  })

  it('should navigate to previous module', () => {
    const { result, rerender } = renderHook(() => useTopologyQuest(), {
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
    rerender()

    // Then go back
    act(() => {
      result.current.navigateToPreviousModule()
    })
    rerender()

    expect(result.current.activeModule).toBe('sets')
    expect(mocks.navigate).toHaveBeenCalledWith('/top/sets')
  })

  it('should calculate progress percentage correctly', () => {
    const { result, rerender } = renderHook(() => useTopologyQuest(), {
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
    rerender()

    expect(result.current.getProgressPercentage()).toBe(100)
    expect(result.current.isLastModule()).toBe(true)
  })

  it('should navigate to specific module', () => {
    const { result, rerender } = renderHook(() => useTopologyQuest(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/top/sets']}>
          {children}
        </MemoryRouter>
      )
    })

    act(() => {
      result.current.setActiveModule('compactness')
    })
    rerender()

    expect(result.current.activeModule).toBe('compactness')
    expect(mocks.navigate).toHaveBeenCalledWith('/top/compactness')
    const moduleInfo = result.current.getModuleInfo()
    expect(moduleInfo.title).toBe('Compactness')
    expect(moduleInfo.moduleNumber).toBe(8)
  })
})
