import { useEffect, useRef } from 'react'
import styles from './TimeseriesGraph.module.css'

interface DataPoint {
  timestamp: number
  value: number
}

interface TimeseriesGraphProps {
  data: DataPoint[]
  title: string
  color: string
  unit: string
  height?: number
  width?: number
  thresholds?: { warning: number; critical: number }
}

export const TimeseriesGraph = ({ 
  data, 
  title, 
  color, 
  unit, 
  height = 80, 
  width = 200,
  thresholds 
}: TimeseriesGraphProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = width
    canvas.height = height

    // Clear canvas
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, width, height)

    if (data.length === 0) return

    // Calculate bounds with better scaling first
    const values = data.map(d => d.value)
    let minValue = Math.min(...values)
    let maxValue = Math.max(...values)
    
    // Ensure proper scaling based on metric type
    if (unit === '%') {
      // For percentages, always show 0-100% or scale to data range
      minValue = 0
      maxValue = Math.max(100, maxValue)
    } else if (unit === 'ms') {
      // For latency, start from 0 and add some headroom
      minValue = 0
      maxValue = Math.max(maxValue * 1.2, 50) // At least 50ms range
    } else if (unit === 'rps') {
      // For traffic, start from 0 with headroom
      minValue = 0
      maxValue = Math.max(maxValue * 1.1, 20) // At least 20 RPS range
    } else {
      // General case - start from 0 if all values are positive
      if (minValue >= 0) {
        minValue = 0
        maxValue = Math.max(maxValue * 1.1, 10) // Add 10% headroom
      }
    }
    
    const range = maxValue - minValue || 1

    // Draw grid
    ctx.strokeStyle = '#2a2a3a'
    ctx.lineWidth = 0.5
    
    // Vertical grid lines
    for (let i = 0; i <= 5; i++) {
      const x = (i / 5) * width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Horizontal grid lines with labels
    ctx.font = '9px Monaco, monospace'
    ctx.fillStyle = '#666'
    ctx.textAlign = 'right'
    
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * height
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
      
      // Add y-axis labels
      if (i < 4) { // Don't label the top line
        const value = maxValue - (i / 4) * range
        let label = ''
        
        if (unit === 'ms' && value > 1000) {
          label = `${(value / 1000).toFixed(1)}s`
        } else if (unit === '%') {
          label = `${Math.round(value)}%`
        } else {
          label = `${Math.round(value)}`
        }
        
        ctx.fillText(label, width - 2, y - 2)
      }
    }

    if (data.length < 2) return

    // Draw threshold lines if provided
    if (thresholds) {
      ctx.lineWidth = 1
      
      // Warning threshold
      if (thresholds.warning >= minValue && thresholds.warning <= maxValue) {
        const y = height - ((thresholds.warning - minValue) / range) * height
        ctx.strokeStyle = '#ffb347'
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Critical threshold
      if (thresholds.critical >= minValue && thresholds.critical <= maxValue) {
        const y = height - ((thresholds.critical - minValue) / range) * height
        ctx.strokeStyle = '#ff6b6b'
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      
      ctx.setLineDash([]) // Reset line dash
    }

    // Draw the line graph
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.beginPath()

    data.forEach((point, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((point.value - minValue) / range) * height
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()

    // Draw area under curve with gradient
    if (data.length > 1) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, color + '40') // 25% opacity
      gradient.addColorStop(1, color + '10') // 6% opacity
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      
      data.forEach((point, index) => {
        const x = (index / (data.length - 1)) * width
        const y = height - ((point.value - minValue) / range) * height
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.lineTo(width, height)
      ctx.lineTo(0, height)
      ctx.closePath()
      ctx.fill()
    }

  }, [data, color, height, width, thresholds, unit])

  const latestValue = data[data.length - 1]?.value ?? 0
  const formatValue = (value: number) => {
    if (unit === 'ms' && value > 1000) {
      return `${(value / 1000).toFixed(1)}s`
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`
    }
    if (unit === 'rps') {
      return `${Math.round(value)}`
    }
    return `${Math.round(value * 10) / 10}`
  }

  return (
    <div className={styles.timeseriesGraph}>
      <div className={styles.graphHeader}>
        <div className={styles.graphTitle}>{title}</div>
        <div className={styles.graphValue} style={{ color }}>
          {formatValue(latestValue)}{unit}
        </div>
      </div>
      <canvas 
        ref={canvasRef} 
        className={styles.canvas}
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    </div>
  )
}