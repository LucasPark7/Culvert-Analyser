import { useState, useEffect } from 'react';
import UploadPanel from '../components/UploadPanel';
import CulvertChart from '../components/CulvertChart';
import RunList from '../components/RunList';
import StatsPanel from '../components/StatsPanel';
import { usePolling } from '../hooks/usePolling';
import type { CulvertRun } from '../types/culvert';

const STORAGE_KEY = 'culvert_list_data';

// load saved runs from localStorage
function loadRuns(): CulvertRun[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as CulvertRun[]) : [];
  } catch {
    return [];
  }
}

function saveRuns(runs: CulvertRun[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

export default function Analyse() {
  const [runs, setRuns] = useState<CulvertRun[]>(loadRuns);
  const [liveRun, setLiveRun] = useState<CulvertRun | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { startUpload } = usePolling();

  // persist runs to localStorage whenever they change
  useEffect(() => {
    saveRuns(runs);
  }, [runs]);

  async function handleUpload({
    file,
    resolution,
  }: {
    file: File;
    resolution: string;
  }): Promise<void> {
    setIsProcessing(true);
    setStatusMsg('Uploading...');
    setLiveRun({ frames: [0], values: [], fatal_list: [], index: 0 });

    try {
      await startUpload({
        file,
        resolution,
        onFrame: (snapshot: CulvertRun) => {
          setLiveRun({ ...snapshot });
          setStatusMsg('Upload successful, processing video...');
        },
        onComplete: (completedRun: CulvertRun) => {
          setRuns((prev) => {
            const updated = [...prev, { ...completedRun, index: prev.length }];
            return updated;
          });
          setLiveRun(null);
          setIsProcessing(false);
          setStatusMsg('Processing complete!');
        },
        onError: (err: Error) => {
          setLiveRun(null);
          setIsProcessing(false);
          setStatusMsg(`Error: ${err.message}`);
        },
        onTimeout: () => {
          setLiveRun(null);
          setIsProcessing(false);
          setStatusMsg('Process timeout error');
        },
      });
    } catch (err) {
      setLiveRun(null);
      setIsProcessing(false);
      setStatusMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handleDeleteRun(): void {
    setRuns((prev) =>
      prev
        .filter((_, i) => i !== selectedIndex)
        .map((run, i) => ({ ...run, index: i }))
    );
    setSelectedIndex(null);
  }

  const selectedRun: CulvertRun | null =
    selectedIndex !== null ? (runs[selectedIndex] ?? null) : null;

  return (
    <div id="analyse-page">
      <UploadPanel onUpload={handleUpload} isProcessing={isProcessing} />

      {statusMsg && <p id="result">{statusMsg}</p>}

      <CulvertChart runs={runs} liveRun={liveRun} />

      <RunList
        runs={runs}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
      />

      <StatsPanel
        run={selectedRun}
        runIndex={selectedIndex !== null ? selectedIndex + 1 : null}
        onDelete={handleDeleteRun}
      />
    </div>
  );
}
