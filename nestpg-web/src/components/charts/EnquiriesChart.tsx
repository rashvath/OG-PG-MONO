import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

import { CircularLoader } from '@/components/ui/CircularLoader'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface EnquiriesChartProps {
  values: number[]
  labels?: string[]
  isLoading?: boolean
}

export function EnquiriesChart({ values, labels, isLoading = false }: EnquiriesChartProps) {
  const computedLabels = labels && labels.length === values.length ? labels : values.map((_, index) => `D${index + 1}`)

  const data = {
    labels: computedLabels,
    datasets: [
      {
        label: 'Enquiries',
        data: values,
        backgroundColor: 'rgba(201, 93, 67, 0.84)',
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 38,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f1b16',
        titleColor: '#fcfaf6',
        bodyColor: '#fcfaf6',
        borderColor: '#d8d0c5',
        borderWidth: 1,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#716c64' },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#ece5da' },
        border: { display: false },
        ticks: { color: '#716c64', precision: 0 },
      },
    },
  }

  return (
    <div className="panel">
      <h3>Enquiries, last 7 days</h3>
      <div className="chart-wrap">
        {isLoading ? (
          <CircularLoader label="Loading real graph data..." />
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
    </div>
  )
}
