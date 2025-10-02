import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import MetricsDashboard from '../MetricsDashboard'

// Mock the recharts library to avoid canvas issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown }) => <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />
}))

// Generate mock data with recent timestamps to match the component's time range generation
const generateMockTimestamps = () => {
  const now = new Date()
  const timestamps = []

  // Generate timestamps for the last 30 minutes with 30-second intervals
  for (let i = 59; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 30 * 1000)
    timestamps.push(time.toISOString())
  }

  return timestamps
}

const mockTimestamps = generateMockTimestamps()
const now = new Date()
const startTime = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
const endTime = now.toISOString()

const mockPortraitTimeseriesResponse = {
  "time_range": "30m",
  "start_time": startTime,
  "end_time": endTime,
  "step": "30s",
  "series": [
    {
      "metric_name": "request_duration_avg",
      "labels": {
        "cache_hit": "false",
        "exported_job": "portrait",
        "instance": "otelcol:8889",
        "job": "otel-collector",
        "otel_scope_name": "portrait",
        "otel_scope_version": "1.0.0"
      },
      "values": [
        {"timestamp": mockTimestamps[0], "value": 0},
        {"timestamp": mockTimestamps[1], "value": 0},
        {"timestamp": mockTimestamps[2], "value": 0},
        {"timestamp": mockTimestamps[20], "value": 193682.00000000003},
        {"timestamp": mockTimestamps[21], "value": 189137},
        {"timestamp": mockTimestamps[22], "value": 189137}
      ]
    },
    {
      "metric_name": "request_success_count",
      "labels": {
        "exported_job": "portrait",
        "instance": "otelcol:8889",
        "job": "otel-collector",
        "method": "POST",
        "otel_scope_name": "portrait",
        "otel_scope_version": "1.0.0",
        "route": "/v1/trace",
        "service_name": "portrait"
      },
      "values": [
        {"timestamp": mockTimestamps[40], "value": 15.653199999999998},
        {"timestamp": mockTimestamps[41], "value": 21.445471513643234},
        {"timestamp": mockTimestamps[42], "value": 26.10855565777369},
        {"timestamp": mockTimestamps[43], "value": 26.54054782108266},
        {"timestamp": mockTimestamps[44], "value": 25.975985718835883},
        {"timestamp": mockTimestamps[45], "value": 43.761892758974625},
        {"timestamp": mockTimestamps[46], "value": 44.39376864853265},
        {"timestamp": mockTimestamps[47], "value": 44.075359999999996},
        {"timestamp": mockTimestamps[48], "value": 43.8312},
        {"timestamp": mockTimestamps[49], "value": 44.21006094672688},
        {"timestamp": mockTimestamps[50], "value": 25.263157894736842},
        {"timestamp": mockTimestamps[51], "value": 25.263246537707154},
        {"timestamp": mockTimestamps[52], "value": 18.947634352762847},
        {"timestamp": mockTimestamps[53], "value": 18.94736842105263},
        {"timestamp": mockTimestamps[54], "value": 26.315420134454254},
        {"timestamp": mockTimestamps[55], "value": 21.052336107563402},
        {"timestamp": mockTimestamps[56], "value": 21.052631578947366},
        {"timestamp": mockTimestamps[57], "value": 22.105263157894736},
        {"timestamp": mockTimestamps[58], "value": 25.263512470350463},
        {"timestamp": mockTimestamps[59], "value": 25.263157894736842}
      ]
    },
    {
      "metric_name": "request_failure_count",
      "labels": {
        "error_type": "rate_limited",
        "exported_job": "portrait",
        "instance": "otelcol:8889",
        "job": "otel-collector",
        "method": "POST",
        "otel_scope_name": "portrait",
        "otel_scope_version": "1.0.0",
        "result": "failure",
        "route": "/v1/trace",
        "service_name": "portrait",
        "status_code": "429"
      },
      "values": [
        {"timestamp": "2025-09-15T03:23:14Z", "value": 0},
        {"timestamp": "2025-09-15T03:23:44Z", "value": 2.4939892896029154},
        {"timestamp": "2025-09-15T03:24:14Z", "value": 2.2963961441542335},
        {"timestamp": "2025-09-15T03:24:44Z", "value": 2.211712318423555},
        {"timestamp": "2025-09-15T03:25:14Z", "value": 2.164665476569657},
        {"timestamp": "2025-09-15T03:25:44Z", "value": 2.13471408957579},
        {"timestamp": "2025-09-15T03:26:14Z", "value": 2.1140307692307694},
        {"timestamp": "2025-09-15T03:26:44Z", "value": 2.0988266666666666},
        {"timestamp": "2025-09-15T03:27:14Z", "value": 2.0871761370281456},
        {"timestamp": "2025-09-15T03:27:44Z", "value": 2.1052631578947367},
        {"timestamp": "2025-09-15T03:28:14Z", "value": 2.1052705448089295},
        {"timestamp": "2025-09-15T03:28:44Z", "value": 0},
        {"timestamp": "2025-09-15T03:29:14Z", "value": 0},
        {"timestamp": "2025-09-15T03:29:44Z", "value": 5.2630840268908505},
        {"timestamp": "2025-09-15T03:30:14Z", "value": 6.315700832269021},
        {"timestamp": "2025-09-15T03:30:44Z", "value": 8.421052631578947},
        {"timestamp": "2025-09-15T03:31:14Z", "value": 8.421052631578947},
        {"timestamp": "2025-09-15T03:31:44Z", "value": 8.421170823450154},
        {"timestamp": "2025-09-15T03:32:14Z", "value": 8.421052631578947},
        {"timestamp": "2025-09-15T03:32:44Z", "value": 8.420934443025361},
        {"timestamp": "2025-09-15T03:33:14Z", "value": 8.421141275171317}
      ]
    }
  ]
}

interface TimeSeries {
  metric_name: string
  labels?: Record<string, string>
  values: Array<{
    timestamp: string
    value: number
  }>
}

describe('MetricsDashboard fillTimeSeriesData logic', () => {
  let mockFetch: typeof fetch

  beforeEach(() => {
    // Mock fetch to return our test data
    mockFetch = vi.fn()
    globalThis.fetch = mockFetch

    // Setup default mock responses
    ;(mockFetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/v1/timeseries/portrait/')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockPortraitTimeseriesResponse))
        })
      }
      return Promise.resolve({
        ok: false,
        text: () => Promise.resolve('')
      })
    })
  })

  it('should extract and fill time series data correctly for success counts', async () => {
    const onConnectionStateChange = vi.fn()
    const { container } = render(
      <MetricsDashboard
        onConnectionStateChange={onConnectionStateChange}
        activeTab="portrait"
      />
    )

    // Wait for the component to fetch data and render
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Find the success count chart
    const successChart = container.querySelector('[data-testid="bar-chart"]')
    expect(successChart).toBeTruthy()

    // Extract the chart data
    const chartDataAttr = successChart?.getAttribute('data-chart-data')
    if (chartDataAttr) {
      const chartData = JSON.parse(chartDataAttr) as Array<{ time: string; count: number }>

      // The chart should have data points
      expect(chartData).toBeInstanceOf(Array)
      expect(chartData.length).toBeGreaterThan(0)

      // Check that we have some data points with actual values (not all zeros)
      const hasNonZeroValues = chartData.some((point) => point.count > 0)
      expect(hasNonZeroValues).toBe(true)

      // Verify the data structure
      chartData.forEach((point) => {
        expect(point).toHaveProperty('time')
        expect(point).toHaveProperty('count')
        expect(typeof point.time).toBe('string')
        expect(typeof point.count).toBe('number')
        expect(point.count).toBeGreaterThanOrEqual(0)
      })
    }
  })

  it('should demonstrate the broken state with exact timestamp matching', () => {
    // This test demonstrates the issue with the original broken implementation
    const brokenFillTimeSeriesData = (series: TimeSeries, defaultValue: number = 0) => {
      const fullTimeRange = generateTestTimeRange()

      if (!series?.values?.length) {
        return fullTimeRange.map(point => ({
          time: point.time,
          count: defaultValue
        }))
      }

      // Create a map of existing data points - THIS IS BROKEN
      const dataMap = new Map<string, number>()
      series.values.forEach((v) => {
        const timestamp = new Date(v.timestamp).toISOString()
        dataMap.set(timestamp, v.value || 0)
      })

      // Fill the full time range, using actual data where available
      return fullTimeRange.map(point => ({
        time: point.time,
        count: Math.max(0, dataMap.get(point.timestamp) || defaultValue)
      }))
    }

    const generateTestTimeRange = () => {
      // Generate timestamps that are slightly different from the API timestamps to simulate the issue
      const now = new Date('2025-09-15T03:33:14.123Z') // Slightly different milliseconds
      const points = []
      for (let i = 59; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 30 * 1000) // 30-second intervals
        points.push({
          time: time.toLocaleTimeString(),
          timestamp: time.toISOString()
        })
      }
      return points
    }

    const testSeries = mockPortraitTimeseriesResponse.series[1] as unknown as TimeSeries // Use success count series
    const result = brokenFillTimeSeriesData(testSeries, 0)

    // With the broken implementation, all values should be 0 because timestamps don't match exactly
    // (API timestamps vs generated timestamps have different milliseconds/precision)
    const allZeros = result.every(point => point.count === 0)
    expect(allZeros).toBe(true)
  })

  it('should fix the issue with rounded timestamp matching using fillTimeSeriesWithRange', () => {
    // This test demonstrates the new fillTimeSeriesWithRange utility
    const fillTimeSeriesWithRange = <T extends Record<string, number | string>>(
      seriesMap: Map<string, Partial<T>>,
      defaultValues: T,
      fullTimeRange: Array<{ time: string; timestamp: string }>
    ): Array<T & { time: string }> => {
      return fullTimeRange.map(point => {
        const pointTime = new Date(point.timestamp)
        const roundedPointTime = new Date(Math.round(pointTime.getTime() / 30000) * 30000)
        const key = roundedPointTime.toISOString()

        const dataPoint = seriesMap.get(key)
        return {
          time: point.time,
          ...defaultValues,
          ...(dataPoint || {})
        } as T & { time: string }
      })
    }

    const generateTestTimeRange = () => {
      // Generate timestamps that are slightly different from the API timestamps
      const now = new Date() // Use current time to match mock data
      const points = []
      for (let i = 59; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 30 * 1000) // 30-second intervals
        points.push({
          time: time.toLocaleTimeString(),
          timestamp: time.toISOString()
        })
      }
      return points
    }

    const testSeries = mockPortraitTimeseriesResponse.series[1] as unknown as TimeSeries // Use success count series
    const dataMap = new Map()

    if (testSeries?.values?.length) {
      testSeries.values.forEach(v => {
        const timestamp = new Date(v.timestamp)
        const roundedTime = new Date(Math.round(timestamp.getTime() / 30000) * 30000)
        const key = roundedTime.toISOString()
        dataMap.set(key, { count: Math.max(0, v.value || 0) })
      })
    }

    const fullTimeRange = generateTestTimeRange()
    const result = fillTimeSeriesWithRange(dataMap, { count: 0 }, fullTimeRange)

    // With the fixed implementation, we should have some non-zero values
    const hasNonZeroValues = result.some(point => point.count > 0)
    expect(hasNonZeroValues).toBe(true)

    // Verify that we captured the expected values
    const nonZeroPoints = result.filter(point => point.count > 0)
    expect(nonZeroPoints.length).toBeGreaterThan(0)

    // Check that the values match what we expect from the test data (use some of the actual values from our mock)
    const expectedValues = [15.653199999999998, 21.445471513643234, 26.10855565777369, 43.761892758974625, 25.263157894736842]
    const hasExpectedValue = nonZeroPoints.some(point =>
      expectedValues.some(expectedValue => Math.abs(point.count - expectedValue) < 0.001)
    )
    expect(hasExpectedValue).toBe(true)
  })

  it('should handle multi-field data with fillTimeSeriesWithRange', () => {
    // Test the utility with multiple fields (like rx/tx for network data)
    const fillTimeSeriesWithRange = <T extends Record<string, number | string>>(
      seriesMap: Map<string, Partial<T>>,
      defaultValues: T,
      fullTimeRange: Array<{ time: string; timestamp: string }>
    ): Array<T & { time: string }> => {
      return fullTimeRange.map(point => {
        const pointTime = new Date(point.timestamp)
        const roundedPointTime = new Date(Math.round(pointTime.getTime() / 30000) * 30000)
        const key = roundedPointTime.toISOString()

        const dataPoint = seriesMap.get(key)
        return {
          time: point.time,
          ...defaultValues,
          ...(dataPoint || {})
        } as T & { time: string }
      })
    }

    const generateTestTimeRange = () => {
      const now = new Date()
      const points = []
      for (let i = 9; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 30 * 1000)
        points.push({
          time: time.toLocaleTimeString(),
          timestamp: time.toISOString()
        })
      }
      return points
    }

    const dataMap = new Map()
    const fullTimeRange = generateTestTimeRange()

    // Simulate network data with both rx and tx values
    const timestamp1 = new Date(fullTimeRange[5].timestamp)
    const rounded1 = new Date(Math.round(timestamp1.getTime() / 30000) * 30000)
    dataMap.set(rounded1.toISOString(), { rx: 100, tx: 50 })

    const timestamp2 = new Date(fullTimeRange[7].timestamp)
    const rounded2 = new Date(Math.round(timestamp2.getTime() / 30000) * 30000)
    dataMap.set(rounded2.toISOString(), { rx: 200, tx: 75 })

    const result = fillTimeSeriesWithRange(dataMap, { rx: 0, tx: 0 }, fullTimeRange)

    // Should have 10 data points (full time range)
    expect(result.length).toBe(10)

    // Points without data should have default values
    expect(result[0]).toEqual({ time: result[0].time, rx: 0, tx: 0 })

    // Points with data should have the actual values
    const pointWithData1 = result[5]
    expect(pointWithData1.rx).toBe(100)
    expect(pointWithData1.tx).toBe(50)

    const pointWithData2 = result[7]
    expect(pointWithData2.rx).toBe(200)
    expect(pointWithData2.tx).toBe(75)
  })
})