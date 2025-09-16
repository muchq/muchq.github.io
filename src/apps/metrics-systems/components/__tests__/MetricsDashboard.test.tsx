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

// Exact API response data from the user's network tab
const mockPortraitTimeseriesResponse = {
  "time_range": "30m",
  "start_time": "2025-09-15T03:03:14.671633517Z",
  "end_time": "2025-09-15T03:33:14.671633517Z",
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
        {"timestamp": "2025-09-15T03:03:14Z", "value": 0},
        {"timestamp": "2025-09-15T03:03:44Z", "value": 0},
        {"timestamp": "2025-09-15T03:04:14Z", "value": 0},
        {"timestamp": "2025-09-15T03:10:44Z", "value": 193682.00000000003},
        {"timestamp": "2025-09-15T03:11:14Z", "value": 189137},
        {"timestamp": "2025-09-15T03:11:44Z", "value": 189137}
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
        {"timestamp": "2025-09-15T03:22:44Z", "value": 15.653199999999998},
        {"timestamp": "2025-09-15T03:23:14Z", "value": 21.445471513643234},
        {"timestamp": "2025-09-15T03:23:44Z", "value": 26.10855565777369},
        {"timestamp": "2025-09-15T03:24:14Z", "value": 26.54054782108266},
        {"timestamp": "2025-09-15T03:24:44Z", "value": 25.975985718835883},
        {"timestamp": "2025-09-15T03:25:14Z", "value": 43.761892758974625},
        {"timestamp": "2025-09-15T03:25:44Z", "value": 44.39376864853265},
        {"timestamp": "2025-09-15T03:26:14Z", "value": 44.075359999999996},
        {"timestamp": "2025-09-15T03:26:44Z", "value": 43.8312},
        {"timestamp": "2025-09-15T03:27:14Z", "value": 44.21006094672688},
        {"timestamp": "2025-09-15T03:27:44Z", "value": 25.263157894736842},
        {"timestamp": "2025-09-15T03:28:14Z", "value": 25.263246537707154},
        {"timestamp": "2025-09-15T03:28:44Z", "value": 18.947634352762847},
        {"timestamp": "2025-09-15T03:29:14Z", "value": 18.94736842105263},
        {"timestamp": "2025-09-15T03:29:44Z", "value": 26.315420134454254},
        {"timestamp": "2025-09-15T03:30:14Z", "value": 21.052336107563402},
        {"timestamp": "2025-09-15T03:30:44Z", "value": 21.052631578947366},
        {"timestamp": "2025-09-15T03:31:14Z", "value": 22.105263157894736},
        {"timestamp": "2025-09-15T03:31:44Z", "value": 25.263512470350463},
        {"timestamp": "2025-09-15T03:32:14Z", "value": 25.263157894736842},
        {"timestamp": "2025-09-15T03:32:44Z", "value": 31.578504161345105},
        {"timestamp": "2025-09-15T03:33:14Z", "value": 31.57927978189244}
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

  it('should fix the issue with rounded timestamp matching', () => {
    // This test demonstrates the fixed implementation
    const fixedFillTimeSeriesData = (series: TimeSeries, defaultValue: number = 0) => {
      const fullTimeRange = generateTestTimeRange()

      if (!series?.values?.length) {
        return fullTimeRange.map(point => ({
          time: point.time,
          count: defaultValue
        }))
      }

      // Create a map of existing data points using rounded timestamps - THIS IS FIXED
      const dataMap = new Map<string, number>()
      series.values.forEach((v) => {
        const timestamp = new Date(v.timestamp)
        const roundedTime = new Date(Math.round(timestamp.getTime() / 30000) * 30000) // Round to nearest 30s
        const key = roundedTime.toISOString()
        dataMap.set(key, v.value || 0)
      })

      // Fill the full time range, using actual data where available
      return fullTimeRange.map(point => {
        const pointTime = new Date(point.timestamp)
        const roundedPointTime = new Date(Math.round(pointTime.getTime() / 30000) * 30000)
        const key = roundedPointTime.toISOString()

        return {
          time: point.time,
          count: Math.max(0, dataMap.get(key) || defaultValue)
        }
      })
    }

    const generateTestTimeRange = () => {
      // Generate timestamps that are slightly different from the API timestamps
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
    const result = fixedFillTimeSeriesData(testSeries, 0)

    // With the fixed implementation, we should have some non-zero values
    const hasNonZeroValues = result.some(point => point.count > 0)
    expect(hasNonZeroValues).toBe(true)

    // Verify that we captured the expected values
    const nonZeroPoints = result.filter(point => point.count > 0)
    expect(nonZeroPoints.length).toBeGreaterThan(0)

    // Check that the values match what we expect from the test data
    const expectedValues = [15.653199999999998, 21.445471513643234, 26.10855565777369, 26.54054782108266, 25.975985718835883]
    const hasExpectedValue = nonZeroPoints.some(point =>
      expectedValues.some(expectedValue => Math.abs(point.count - expectedValue) < 0.001)
    )
    expect(hasExpectedValue).toBe(true)
  })
})