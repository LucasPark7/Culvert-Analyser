import type { CulvertRun } from '../types/culvert';
import { useStatsWorker } from '../hooks/useStatsWorker';

// run: selected run, runIndex: selected run index
interface StatsPanelProps {
  run: CulvertRun | null;
  runIndex: number | null;
  onDelete: () => void;
}

export default function StatsPanel({ run, runIndex, onDelete }: StatsPanelProps) {
  // use web worker to offload calculations of analysis from main thread
  const { rows, isComputing } = useStatsWorker(run);
  const nodeRow = 0 !== null ? rows[0] ?? [] : [];
  const contRow = 1 !== null ? rows[1] ?? [] : [];
  const rorRow = 2 !== null ? rows[2] ?? [] : [];
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

      <table id="nodeTable">
        <thead>
          <tr>
            <th>Special Node Interval</th>
            <th>Score Gained</th>
            <th>% of Total Score</th>
            <th>Score/s</th>
          </tr>
        </thead>
        <tbody id="nodeTableBody">
          {isComputing ? (
            <tr><td colSpan={4}>Computing...</td></tr>
          ) : (
            nodeRow.map((row, i) => (
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

      <table id="contTable">
        <thead>
          <tr>
            <th>Continuous Ring Interval</th>
            <th>Score Gained</th>
            <th>% of Total Score</th>
            <th>Score/s</th>
          </tr>
        </thead>
        <tbody id="contTableBody">
          {isComputing ? (
            <tr><td colSpan={4}>Computing...</td></tr>
          ) : (
            contRow.map((row, i) => (
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

      <table id="rorTable">
        <thead>
          <tr>
            <th>Ring of Restraint Interval</th>
            <th>Score Gained</th>
            <th>% of Total Score</th>
            <th>Score/s</th>
          </tr>
        </thead>
        <tbody id="rorTableBody">
          {isComputing ? (
            <tr><td colSpan={4}>Computing...</td></tr>
          ) : (
            rorRow.map((row, i) => (
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