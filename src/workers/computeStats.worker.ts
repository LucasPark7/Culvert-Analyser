import type { CulvertRun, StatRow } from '../types/culvert';

function buildRow(
  fatalStart: number,
  fatalEnd: number,
  fatalGain: number,
  totalScore: number
): StatRow {
  const scorePerS = fatalGain / (fatalEnd - fatalStart);
  const percentScore = (fatalGain / totalScore) * 100;
  return {
    time: `${120 - fatalStart}s - ${Math.max(0, 120 - fatalEnd)}s`,
    gain: fatalGain.toString(),
    percent: percentScore.toFixed(3) + '%',
    perSecond: scorePerS.toFixed(3),
  };
}

// listen for messages from the main thread
self.onmessage = (e: MessageEvent<CulvertRun>) => {
  const culvertData = e.data;
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

  if (openFatal) {
    fatalEnd = culvertData.frames[culvertData.frames.length - 1];
    fatalGain = culvertData.values[culvertData.values.length - 1] - fatalInitValue;
    rows.push(buildRow(fatalStart, fatalEnd, fatalGain, totalScore));
  }

  // send results back to main thread
  self.postMessage(rows);
};