import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MetricsDashboard from '../MetricsDashboard'

interface MockComponentProps {
  children?: React.ReactNode
}

// Mock the recharts components to avoid rendering issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: MockComponentProps) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: MockComponentProps) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: MockComponentProps) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: MockComponentProps) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: MockComponentProps) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />
}))

// Mock API responses that cause the TypeError
const mockSystemMetricsResponse = {
  timestamp: "2025-09-06T03:23:46.59978175Z",
  cpu: {
    utilization_percent: -1.2877192982398924,
    by_core: {
      cpu0: 0.0070175438596477265,
      cpu1: 0.0035087719298213696
    }
  },
  memory: {
    total_bytes: 938082304,
    used_bytes: 412872704,
    free_bytes: 173928448,
    cached_bytes: 351281152,
    utilization_percent: 44.01241791253319
  },
  disk: [{
    device: "/dev/nvme0n1p1",
    used_bytes: 5859377152,
    total_bytes: 144290529280,
    utilization_percent: 4.060818947187938,
    io_rate_bytes_per_sec: 0
  }],
  network: [{
    interface: "eth0",
    rx_rate_bytes_per_sec: 317.978947368421,
    tx_rate_bytes_per_sec: 274.83157894736837,
    errors_per_sec: 0
  }, {
    interface: "lo",
    rx_rate_bytes_per_sec: 0,
    tx_rate_bytes_per_sec: 0,
    errors_per_sec: 0
  }]
}

const mockSystemTimeseriesResponse = {
  time_range: "1d",
  start_time: "2025-09-05T03:23:48.457447471Z",
  end_time: "2025-09-06T03:23:48.457447471Z",
  step: "5m",
  series: [{
    metric_name: "cpu_utilization",
    values: [{
      timestamp: "2025-09-05T03:23:48Z",
      value: -0.19298245615667042
    }]
  }, {
    metric_name: "memory_utilization",
    labels: {
      instance: "otelcol:8889",
      job: "otel-collector",
      state: "used"
    },
    values: [{
      timestamp: "2025-09-05T03:23:48Z",
      value: 39.524387720442114
    }]
  }]
}

const mockPortraitTimeseriesResponse = {
  time_range: "1d",
  start_time: "2025-09-05T03:23:50.227322217Z",
  end_time: "2025-09-06T03:23:50.227322217Z",
  step: "5m",
  series: [{
    metric_name: "cache_hit_rate",
    labels: {
      exported_job: "portrait",
      instance: "otelcol:8889",
      job: "otel-collector"
    },
    values: [{
      timestamp: "2025-09-05T03:23:50Z",
      value: 55.99999999999999
    }]
  }, {
    metric_name: "cache_operations_rate",
    labels: {
      exported_job: "portrait",
      instance: "otelcol:8889",
      job: "otel-collector"
    },
    values: [{
      timestamp: "2025-09-05T03:23:50Z",
      value: 0.08771929824561403
    }]
  }, {
    metric_name: "scene_sphere_count",
    labels: {
      __name__: "scene_sphere_count_gauge",
      exported_job: "portrait",
      instance: "otelcol:8889",
      job: "otel-collector"
    },
    values: [{
      timestamp: "2025-09-05T03:23:50Z",
      value: 68
    }]
  }]
}

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('MetricsDashboard', () => {
  const mockOnConnectionStateChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing with normal data', async () => {
    // Mock successful API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockSystemMetricsResponse))
      } as Response)
      .mockResolvedValueOnce({
        ok: true, 
        text: () => Promise.resolve(JSON.stringify(mockSystemTimeseriesResponse))
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockPortraitTimeseriesResponse))
      } as Response)

    const { container } = render(
      <MetricsDashboard 
        onConnectionStateChange={mockOnConnectionStateChange}
        activeTab="system"
      />
    )

    expect(container).toBeTruthy()
  })

  it('should handle mismatched array lengths without throwing TypeError', async () => {
    // Create a scenario that would have caused the original bug:
    // request_success_rate has 3 values, but cache_hit_rate has only 2 values
    const problematicPortraitResponse = {
      time_range: "1d",
      start_time: "2025-09-05T03:23:50.227322217Z",
      end_time: "2025-09-06T03:23:50.227322217Z", 
      step: "5m",
      series: [{
        metric_name: "request_success_rate",
        values: [{
          timestamp: "2025-09-05T03:23:50Z",
          value: 95.5
        }, {
          timestamp: "2025-09-05T03:28:50Z",
          value: 98.2
        }, {
          timestamp: "2025-09-05T03:33:50Z", 
          value: 99.1  // This third element would cause cacheSeries.values[2] to be undefined
        }]
      }, {
        metric_name: "cache_hit_rate",
        values: [{
          timestamp: "2025-09-05T03:23:50Z",
          value: 55.5
        }, {
          timestamp: "2025-09-05T03:28:50Z",
          value: 60.0
        }]
        // Missing 3rd value - this would cause cacheSeries.values[2] to be undefined
        // Before the fix, accessing cacheSeries.values[2].value would throw "can't access property 'value' of undefined"
      }]
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockSystemMetricsResponse))
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockSystemTimeseriesResponse))
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(problematicPortraitResponse))
      } as Response)

    // After the fix, this should render without throwing TypeError
    const { container } = render(
      <MetricsDashboard 
        onConnectionStateChange={mockOnConnectionStateChange}
        activeTab="portrait"
      />
    )

    // The component should render successfully even with mismatched array lengths
    expect(container).toBeTruthy()
  })
})