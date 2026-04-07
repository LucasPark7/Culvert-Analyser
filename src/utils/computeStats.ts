import type { CulvertRun, StatRow } from '../types/culvert';

export function computeStats(culvertData: CulvertRun): StatRow[] {
  const totalScore = culvertData.values[culvertData.values.length - 1];
  const rows: StatRow[] = [];

  let openFatal = false;
  let fatalStart = 0;
  let fatalEnd = 0;
  let fatalGain = 0;
  let fatalInitValue = 0;

  for (let i = 0; i < culvertData.frames.length; i++) {
    if (!openFatal && culvertData.fatal_list[i] === true) {
      fatalStart = culvertData.frames[i];
      fatalInitValue = culvertData.values[i];
      openFatal = true;
    } else if (openFatal && culvertData.fatal_list[i] === false) {
      fatalGain = culvertData.values[i] - fatalInitValue;
      fatalEnd = culvertData.frames[i];
      openFatal = false;
      rows.push(buildRow(fatalStart, fatalEnd, fatalGain, totalScore));
      fatalGain = 0;
    }
  }

  // edge case: last frame is still part of a fatal
  if (openFatal) {
    fatalEnd = culvertData.frames[culvertData.frames.length - 1];
    fatalGain = culvertData.values[culvertData.values.length - 1] - fatalInitValue;
    rows.push(buildRow(fatalStart, fatalEnd, fatalGain, totalScore));
  }

  return rows;
}

function buildRow(
  fatalStart: number,
  fatalEnd: number,
  fatalGain: number,
  totalScore: number
): StatRow {
  const scorePerS = fatalGain / (fatalEnd - fatalStart);
  const percentScore = (fatalGain / totalScore) * 100;
  const startTime = 120 - fatalStart;
  const endTime = Math.max(0, 120 - fatalEnd);

  return {
    time: `${startTime}s - ${endTime}s`,
    gain: fatalGain.toString(),
    percent: percentScore.toFixed(3) + '%',
    perSecond: scorePerS.toFixed(3),
  };
}
