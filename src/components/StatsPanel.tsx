import type { CulvertRun, StatRow } from '../types/culvert';
import { computeStats } from '../utils/computeStats';

interface StatsPanelProps {
  run: CulvertRun | null;
  runIndex: number | null;
  onDelete: () => void;
}

export default function StatsPanel({ run, runIndex, onDelete }: StatsPanelProps) {
  if (!run) {
    return (
      <div id="statsPanel">
        <h3 id="run-title">Select a run for detailed info</h3>
      </div>
    );
  }

  const rows: StatRow[] = computeStats(run);

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
            <th>Time</th>
            <th>Gain</th>
            <th>% of Total</th>
            <th>Per Second</th>
          </tr>
        </thead>
        <tbody id="statsTableBody">
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{row.time}</td>
              <td>{row.gain}</td>
              <td>{row.percent}</td>
              <td>{row.perSecond}</td>
            </tr>
          ))}
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
