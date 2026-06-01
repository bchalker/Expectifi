import { useEffect, useRef } from 'react'
import {
  Chart,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartOptions,
} from 'chart.js'

let activeEventColor = '#EF9F27'

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function applyEventFillGradient(chart: Chart, eventColor: string): void {
  const { ctx, chartArea } = chart
  if (!chartArea) return
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, hexToRgba(eventColor, 0.45))
  gradient.addColorStop(1, hexToRgba(eventColor, 0))
  const eventDataset = chart.data.datasets[1]
  if (eventDataset) {
    eventDataset.backgroundColor = gradient
    eventDataset.borderColor = eventColor
  }
}

const lifeEventsFillPlugin = {
  id: 'lifeEventsAmberFill',
  beforeDatasetsDraw(chart: Chart) {
    applyEventFillGradient(chart, activeEventColor)
  },
}

Chart.register(
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  lifeEventsFillPlugin,
)

export interface ProjectionChartProps {
  basePortfolio: number
  amount: number
  eventYear: number
  retirementYear: number
  currentYear: number
  growthRate: number
  eventColor: string
  isRecurring: boolean
  duration?: number
}

function calcProjectionSeries(
  basePortfolio: number,
  amount: number,
  eventYear: number,
  retirementYear: number,
  currentYear: number,
  growthRate: number,
  isRecurring: boolean,
  duration = 0,
) {
  const labels: number[] = []
  const baseline: number[] = []
  const withEvent: number[] = []

  let baseValue = basePortfolio
  let eventValue = basePortfolio

  for (let yr = currentYear; yr <= retirementYear; yr++) {
    labels.push(yr)

    baseValue = baseValue * (1 + growthRate)
    baseline.push(Math.round(baseValue))

    if (isRecurring) {
      if (yr >= eventYear && yr < eventYear + duration) {
        eventValue = eventValue - amount * 12
      }
    } else if (yr === eventYear) {
      eventValue = eventValue - amount
    }

    eventValue = Math.max(0, eventValue) * (1 + growthRate)
    withEvent.push(Math.round(eventValue))
  }

  return { labels, baseline, withEvent }
}

function chartDatasets(baseline: number[], withEvent: number[], eventColor: string) {
  const fillTop = hexToRgba(eventColor, 0.45)
  return [
    {
      label: 'baseline',
      data: baseline,
      borderColor: '#7F77DD',
      borderDash: [4, 3],
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0,
      fill: false,
    },
    {
      label: 'without this event',
      data: withEvent,
      borderColor: eventColor,
      borderDash: [],
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: eventColor,
      tension: 0,
      fill: true,
      backgroundColor: fillTop,
    },
  ]
}

const CHART_OPTIONS: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  layout: {
    padding: { top: 4, right: 6, bottom: 2, left: 4 },
  },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const value = ctx.parsed.y ?? 0
          if (value >= 1_000_000) return `${ctx.dataset.label}: $${(value / 1_000_000).toFixed(1)}M`
          return `${ctx.dataset.label}: $${(value / 1000).toFixed(0)}k`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: 'var(--color-text-secondary, var(--text-muted))',
        maxRotation: 0,
        font: { family: 'var(--font-sans)', size: 11 },
      },
      border: { display: false },
    },
    y: {
      grid: {
        color: 'rgb(28 43 58 / 0.035)',
        lineWidth: 1,
      },
      ticks: {
        color: 'var(--color-text-secondary, var(--text-muted))',
        callback: (value) => {
          const n = typeof value === 'number' ? value : Number(value)
          if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
          return '$' + (n / 1000).toFixed(0) + 'k'
        },
        font: { family: 'var(--font-sans)', size: 11 },
      },
      border: { display: false },
    },
  },
}

export default function ProjectionChart({
  basePortfolio,
  amount,
  eventYear,
  retirementYear,
  currentYear,
  growthRate,
  eventColor,
  isRecurring,
  duration = 0,
}: ProjectionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart<'line'> | null>(null)
  const eventColorRef = useRef(eventColor)

  useEffect(() => {
    eventColorRef.current = eventColor
    activeEventColor = eventColor
  }, [eventColor])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    activeEventColor = eventColorRef.current

    const { labels, baseline, withEvent } = calcProjectionSeries(
      basePortfolio,
      amount,
      eventYear,
      retirementYear,
      currentYear,
      growthRate,
      isRecurring,
      duration,
    )

    Chart.getChart(canvas)?.destroy()

    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: chartDatasets(baseline, withEvent, eventColorRef.current),
      },
      options: CHART_OPTIONS,
    })

    applyEventFillGradient(chartRef.current, eventColorRef.current)
    chartRef.current.update('none')

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [basePortfolio, retirementYear, currentYear, growthRate, eventColor])

  useEffect(() => {
    if (!chartRef.current) return

    activeEventColor = eventColorRef.current

    const { labels, baseline, withEvent } = calcProjectionSeries(
      basePortfolio,
      amount,
      eventYear,
      retirementYear,
      currentYear,
      growthRate,
      isRecurring,
      duration,
    )

    chartRef.current.data.labels = labels
    chartRef.current.data.datasets[0].data = [...baseline]
    chartRef.current.data.datasets[1].data = [...withEvent]
    chartRef.current.data.datasets[1].borderColor = eventColorRef.current
    chartRef.current.data.datasets[1].pointBackgroundColor = eventColorRef.current
    applyEventFillGradient(chartRef.current, eventColorRef.current)
    chartRef.current.update('none')
  }, [amount, eventYear, basePortfolio, retirementYear, currentYear, growthRate, eventColor, isRecurring, duration])

  return (
    <div className="life-events-chart life-events-chart--drawer">
      <div className="life-events-chart__canvas-wrap life-events-chart__canvas-wrap--drawer">
        <canvas ref={canvasRef} aria-label="Portfolio projection with and without life event" />
      </div>
      <div className="life-events-chart__legend" aria-hidden>
        <span className="life-events-chart__legend-item">
          <span className="life-events-chart__legend-line life-events-chart__legend-line--baseline" />
          baseline
        </span>
        <span className="life-events-chart__legend-item">
          <span
            className="life-events-chart__legend-line life-events-chart__legend-line--event"
            style={{ borderTopColor: eventColor }}
          />
          without this event
        </span>
      </div>
    </div>
  )
}
