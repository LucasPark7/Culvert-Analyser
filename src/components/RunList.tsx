import type { CulvertRun } from '../types/culvert';

// runs: list of CulvertRun objects, selectedIndex: selected run for list of runs index to send to stats panel
interface RunListProps {
  runs: CulvertRun[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export default function RunList({ runs, selectedIndex, onSelect }: RunListProps) {
  if (runs.length === 0) {
    return <p className="no-runs">No runs yet. Upload a video to get started.</p>;
  }

  return (
    <table id="culvList">
      <tbody>
        {runs.map((run, i) => { // map runs to a list
          const lastValue = run.values[run.values.length - 1];
          const isSelected = i === selectedIndex;

          return (
            <tr key={i} className={isSelected ? 'selected-run' : ''}>
              <td
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(i)}
              >
                Culvert Run #{i + 1} ({lastValue})
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
