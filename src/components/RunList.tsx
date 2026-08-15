import type { CulvertRun } from '../types/culvert';

// runs: list of CulvertRun objects, selectedIndex: selected run for list of runs index to send to stats panel
interface RunListProps {
  runs: CulvertRun[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  page: string;
}

export default function RunList({ runs, selectedIndex, onSelect, page }: RunListProps) {
  if (runs.length === 0) {
    return <p className="no-runs">No runs yet. Upload a video to get started.</p>;
  }

  return (
    <table id="culvList">
      <tbody>
        {runs.map((run, i) => { // map runs to a list
          const lastValue = run.values[run.values.length - 1];
          const isSelected = i === selectedIndex;
          const valueSum = run.values.reduce((acc, n) => acc + n, 0);
          let runValue = ""
          if (page === 'culvert') {
            runValue = String(lastValue);
          }
          else if (page === 'ba') {
            runValue = String((valueSum / 1000000000000).toFixed(2)) + 'T';
          }

          return (
            <tr key={i} className={isSelected ? 'selected-run' : ''}>
              <td
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(i)}
              >
                Run #{i + 1} ({runValue})
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
