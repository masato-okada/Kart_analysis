'use client';

import dynamic from 'next/dynamic';
import { TimeSeriesData } from '@/lib/dataProcessing';

// Plotly.jsを動的インポート（SSRを無効化）
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface RawDataChartProps {
  data: TimeSeriesData;
  maxPoints?: number;
}

export default function RawDataChart({ data, maxPoints = 1500 }: RawDataChartProps) {
  if (!data || data.t.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center border border-gray-200 rounded-lg">
        <p className="text-gray-500">生データを表示するにはデータをアップロードしてください</p>
      </div>
    );
  }

  // データを制限して表示
  const limit = Math.min(maxPoints, data.t.length);
  const timeData = data.t.slice(0, limit);
  const rpmData = data.rpm.slice(0, limit);
  const speedData = data.speedMps.slice(0, limit).map(s => s * 3.6); // m/s to km/h

  const traces = [
    {
      x: timeData,
      y: rpmData,
      name: 'RPM',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#ef4444', width: 1 },
      yaxis: 'y'
    },
    {
      x: timeData,
      y: speedData,
      name: '速度 [km/h]',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#3b82f6', width: 1 },
      yaxis: 'y2'
    }
  ];

  const layout = {
    title: '生データプレビュー（フィルタリングされたデータの最初の部分）',
    xaxis: {
      title: '時間 [s]',
      gridcolor: '#e5e7eb',
      showgrid: true
    },
    yaxis: {
      title: 'RPM',
      side: 'left',
      gridcolor: '#e5e7eb',
      showgrid: true
    },
    yaxis2: {
      title: '速度 [km/h]',
      side: 'right',
      overlaying: 'y',
      gridcolor: '#e5e7eb',
      showgrid: false
    },
    legend: {
      x: 0.01,
      y: 0.99,
      bgcolor: 'rgba(255,255,255,0.6)',
      bordercolor: '#d1d5db',
      borderwidth: 1
    },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    font: {
      family: 'Inter, sans-serif',
      size: 12
    },
    margin: {
      l: 60,
      r: 60,
      t: 60,
      b: 60
    }
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    displaylogo: false
  };

  return (
    <div className="w-full">
      <Plot
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '400px' }}
      />
    </div>
  );
}
