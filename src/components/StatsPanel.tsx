import type { CulvertRun } from '../types/culvert';
import { useStatsWorker } from '../hooks/useStatsWorker';

interface StatsPanelProps {
  run: CulvertRun | null;
  runIndex: number | null;
  onDelete: () => void;
}

export default function StatsPanel({ run, runIndex, onDelete }: StatsPanelProps) {
  const { rows, isComputing } = useStatsWorker(run);
  if (!run) {
    return (
      <div id="statsPanel">
        <h3 id="run-title">Select a run for detailed info</h3>
      </div>
    );
  }

  function handleDelete(): void {
    if (window.confirm(`Delete Culvert Run #${runIndex}? This cannot be undone.`)) {
      onDelete();
    }
  }

  return (
    <div id="statsPanel">
      <h3 id="run-title">Culvert Run #{runIndex}</h3>

      <table id="statsTable">
        <thead>
          <tr>
            <th>Special Node Time</th>
            <th>Score Gained</th>
            <th>% of Total Score</th>
            <th>Score/s</th>
          </tr>
        </thead>
        <tbody id="statsTableBody">
          {isComputing ? (
            <tr><td colSpan={4}>Computing...</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                <td>{row.time}</td>
                <td>{row.gain}</td>
                <td>{row.percent}</td>
                <td>{row.perSecond}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div id="deleteRunDiv">
        <button className="button primary small" onClick={handleDelete}>
          Delete Run Data
        </button>
      </div>
    </div>
  );
}