import { useEffect, useState, useRef } from 'react';
import type { CulvertRun, StatRow } from '../types/culvert';

export function useStatsWorker(run: CulvertRun | null): {
  rows: StatRow[];
  isComputing: boolean;
} {
  const [rows, setRows] = useState<StatRow[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create the worker once
    workerRef.current = new Worker(
      new URL('../workers/computeStats.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // listen for results coming back
    workerRef.current.onmessage = (e: MessageEvent<StatRow[]>) => {
      setRows(e.data);
      setIsComputing(false);
    };

    workerRef.current.onerror = (err) => {
      console.error('Worker error:', err);
      setIsComputing(false);
    };

    // destroy worker on cleanup
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!run || !workerRef.current) {
      setRows([]);
      return;
    }
    // send run data to the worker
    setIsComputing(true);
    workerRef.current.postMessage(run);
  }, [run]);

  return { rows, isComputing };
}