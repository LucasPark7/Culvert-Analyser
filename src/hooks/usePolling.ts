import { useRef } from 'react';
import type { CulvertRun, UploadOptions } from '../types/culvert';

const API_BASE = 'https://culvert-analyse.onrender.com';
const POLL_INTERVAL = 3000;
const MAX_TIME = 600 * 1000;

interface UsePollingReturn {
  startUpload: (options: UploadOptions) => Promise<void>;
  stopPolling: () => void;
}

export function usePolling(): UsePollingReturn {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // cleanup function for when status interval terminates
  function stopPolling(): void {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // async function to upload and track video
  async function startUpload({
    file,
    resolution,
    onFrame,
    onComplete,
    onError,
    onTimeout,
  }: UploadOptions): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('resolution', resolution);

    // call backend api and upload video
    const response = await fetch(`${API_BASE}/analyse`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    // receive job id we use to request status
    const data = await response.json() as { job_id: string; status: string };

    // accumulate frames locally so the interval closure always sees latest state
    const culvert: CulvertRun = { frames: [0], values: [], fatal_list: [], cont_list: [], ror_list: [], index: 0 };
    const startTime = Date.now();

    // interval set to periodically request live results and status
    intervalRef.current = setInterval(async () => {
      try {
        const statusResp = await fetch(`${API_BASE}/status/${data.job_id}`);
        const statusData = await statusResp.json() as {
          status: string;
          results: [[[number]], boolean, boolean, boolean][];
        };

        if (!statusData.results || !Array.isArray(statusData.results)) return;

        // map current data retrieved
        statusData.results.forEach((value, index) => {
          if (index + 1 > culvert.frames[culvert.frames.length - 1]) {
            culvert.frames.push(index + 1);
            culvert.values.push(parseInt(String(value[0][0])));
            culvert.fatal_list.push(value[1]);
            culvert.cont_list.push(value[2]);
            culvert.ror_list.push(value[3]);
          }
        });

        // notify parent with a snapshot so React state updates correctly
        onFrame({ ...culvert });

        if (statusData.status === 'complete') {
          stopPolling();
          onComplete({ ...culvert });
          return;
        }

        if (Date.now() - startTime > MAX_TIME) {
          stopPolling();
          onTimeout();
        }
      } catch (err) {
        stopPolling();
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }, POLL_INTERVAL);
  }

  return { startUpload, stopPolling };
}
