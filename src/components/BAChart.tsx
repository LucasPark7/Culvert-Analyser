import { useEffect, useRef } from 'react';
import Chart, { type ChartDataset } from 'chart.js/auto';
import type { CulvertRun } from '../types/culvert';


// label list 1-120 for each graph on chart
const LABEL_LIST: number[] = Array.from({ length: 120 }, (_, i) => i + 1);


// runs must be list of CulvertRun objects, liveRun must be a single CulvertRun or null
interface CulvertChartProps {
  runs: CulvertRun[];
  liveRun: CulvertRun | null;
}

export default function CulvertChart({ runs, liveRun }: CulvertChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  // create the chart once on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: LABEL_LIST,
        datasets: [],
      },
      options: {
        animation: false,
        scales: { y: { beginAtZero: true } },
        plugins: {
          legend: {
            labels: {
              boxWidth: 0,
              color: 'rgb(211, 211, 211)'
            }
          }
        }
      },
    });

    // clean up chart instance
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  // rebuild datasets whenever saved runs or the live run change
  useEffect(() => {
    if (!chartRef.current) return;

    const allRuns = [...runs];
    if (liveRun) allRuns.push(liveRun);

    // map each run to new graph on chart
    chartRef.current.data.datasets = allRuns.map((run, i): ChartDataset<'bar'> => {
      const colorList = ['rgb(0, 195, 255)',
                        'rgb(43, 255, 0)',
                        'rgb(255, 123, 0)',
                        'rgb(255, 0, 0)',
                        'rgb(255, 0, 212)']

      // per-bar color, since bar charts don't support line "segment" styling
      const colorBar = (index: number, value: string[]): string => {
        if (run.cont_list[index]) {
          if (run.fatal_list[index]) {
            return value[1];
          }
          else {
            return value[2];
          }
        }
        else if (run.ror_list[index]) {
          if (run.fatal_list[index]) {
            return value[4];
          }
          else {
            return value[3];
          }
        } else if (run.fatal_list[index]) {
          return value[0];
        } else {
          return 'rgb(255, 255, 255)';
        }};

      const barColors = run.values.map((_, index) => colorBar(index, colorList));

      return {
        label: `Culvert #${i + 1}`,
        data: run.values,
        backgroundColor: barColors,
        borderColor: barColors,
      };
    });

    chartRef.current.update();
  }, [runs, liveRun]);

  return <canvas id="resultChart" ref={canvasRef} />;
}
