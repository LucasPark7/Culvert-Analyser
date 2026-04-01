import { useEffect, useRef } from 'react';
import Chart, { type ChartDataset, type ScriptableLineSegmentContext } from 'chart.js/auto';
import type { CulvertRun } from '../types/culvert';

const LABEL_LIST: number[] = Array.from({ length: 120 }, (_, i) => i + 1);

interface CulvertChartProps {
  runs: CulvertRun[];
  liveRun: CulvertRun | null;
}

export default function CulvertChart({ runs, liveRun }: CulvertChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  // Create the chart once on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: LABEL_LIST,
        datasets: [],
      },
      options: {
        animation: false,
        scales: { y: { beginAtZero: true } },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  // Rebuild datasets whenever saved runs or the live run change
  useEffect(() => {
    if (!chartRef.current) return;

    const allRuns = [...runs];
    if (liveRun) allRuns.push(liveRun);

    chartRef.current.data.datasets = allRuns.map((run, i): ChartDataset<'line'> => {
      const fatal = (ctx: ScriptableLineSegmentContext, value: string): string | undefined =>
        run.fatal_list[ctx.p0DataIndex] ? value : undefined;

      return {
        label: `Culvert #${i + 1}`,
        data: run.values,
        borderColor: 'rgb(255, 255, 255)',
        backgroundColor: 'rgb(255, 255, 255)',
        segment: { borderColor: (ctx) => fatal(ctx, 'rgb(192,75,75)') },
        spanGaps: true,
        fill: false,
        pointRadius: 0,
        borderWidth: 1,
      };
    });

    chartRef.current.update();
  }, [runs, liveRun]);

  return <canvas id="resultChart" ref={canvasRef} />;
}
