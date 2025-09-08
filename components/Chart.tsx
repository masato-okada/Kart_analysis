'use client';

import dynamic from 'next/dynamic';
import { CurveResult } from '@/lib/dataProcessing';

// Plotly.jsを動的インポート（SSRを無効化）
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface ChartProps {
  results: { name: string; result: CurveResult }[];
  mode: string;
}

export default function Chart({ results, mode }: ChartProps) {
  if (!results || results.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center border border-gray-200 rounded-lg">
        <p className="text-gray-500">グラフを表示するにはデータをアップロードして解析を実行してください</p>
      </div>
    );
  }

  const traces: any[] = [];
  const annotations: any[] = [];

  results.forEach(({ name, result }) => {
    if (result.error) return;

    // ピークトルクとピークパワーを計算
    const peakTorqueIdx = result.torqueCurve.indexOf(Math.max(...result.torqueCurve));
    const peakPowerIdx = result.powerCurve.indexOf(Math.max(...result.powerCurve));
    
    const peakTorqueRpm = result.rpmCurve[peakTorqueIdx];
    const peakTorqueValue = result.torqueCurve[peakTorqueIdx];
    const peakPowerRpm = result.rpmCurve[peakPowerIdx];
    const peakPowerValue = result.powerCurve[peakPowerIdx];

    // トルク曲線
    traces.push({
      x: result.rpmCurve,
      y: result.torqueCurve,
      name: `${name} — トルク`,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#ef4444', width: 2 },
      yaxis: 'y'
    });

    // ピークトルクマーカー
    traces.push({
      x: [peakTorqueRpm],
      y: [peakTorqueValue],
      name: `${name} — ピークトルク`,
      type: 'scatter',
      mode: 'markers',
      marker: { size: 10, color: '#dc2626', symbol: 'diamond' },
      showlegend: false,
      yaxis: 'y'
    });

    // パワー曲線
    traces.push({
      x: result.rpmCurve,
      y: result.powerCurve,
      name: `${name} — パワー`,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#3b82f6', width: 2 },
      yaxis: 'y2'
    });

    // ピークパワーマーカー
    traces.push({
      x: [peakPowerRpm],
      y: [peakPowerValue],
      name: `${name} — ピークパワー`,
      type: 'scatter',
      mode: 'markers',
      marker: { size: 10, color: '#1d4ed8', symbol: 'diamond' },
      showlegend: false,
      yaxis: 'y2'
    });

    // アノテーション
    annotations.push({
      x: peakTorqueRpm,
      y: peakTorqueValue,
      text: `ピークトルク<br>${peakTorqueValue.toFixed(1)} N·m<br>@ ${peakTorqueRpm.toFixed(0)} RPM`,
      showarrow: true,
      arrowhead: 2,
      arrowsize: 1,
      arrowwidth: 2,
      arrowcolor: '#dc2626',
      ax: 20,
      ay: -30,
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#dc2626',
      borderwidth: 1,
      yref: 'y'
    });

    annotations.push({
      x: peakPowerRpm,
      y: peakPowerValue,
      text: `ピークパワー<br>${peakPowerValue.toFixed(1)} kW<br>@ ${peakPowerRpm.toFixed(0)} RPM`,
      showarrow: true,
      arrowhead: 2,
      arrowsize: 1,
      arrowwidth: 2,
      arrowcolor: '#1d4ed8',
      ax: 20,
      ay: 30,
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#1d4ed8',
      borderwidth: 1,
      yref: 'y2'
    });

    // RPM差のアノテーション
    const rpmDiff = peakPowerRpm - peakTorqueRpm;
    const midRpm = (peakTorqueRpm + peakPowerRpm) / 2;
    const midValue = (peakTorqueValue + peakPowerValue) / 2;
    
    let diffText: string;
    let diffColor: string;
    
    if (rpmDiff > 0) {
      diffText = `RPM差<br>+${rpmDiff.toFixed(0)} RPM<br>(パワーピークが高い)`;
      diffColor = '#16a34a';
    } else {
      diffText = `RPM差<br>${rpmDiff.toFixed(0)} RPM<br>(トルクピークが高い)`;
      diffColor = '#ea580c';
    }

    annotations.push({
      x: midRpm,
      y: midValue,
      text: diffText,
      showarrow: false,
      bgcolor: 'rgba(255,255,255,0.9)',
      bordercolor: diffColor,
      borderwidth: 2,
      font: { size: 12, color: diffColor },
      xshift: 0,
      yshift: 50
    });
  });

  const layout = {
    title: `トルク・パワー曲線 — モード: ${mode}`,
    xaxis: {
      title: 'RPM',
      gridcolor: '#e5e7eb',
      showgrid: true
    },
    yaxis: {
      title: 'トルク [N·m]',
      side: 'left',
      gridcolor: '#e5e7eb',
      showgrid: true
    },
    yaxis2: {
      title: 'パワー [kW]',
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
    annotations,
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
        style={{ width: '100%', height: '500px' }}
      />
    </div>
  );
}
