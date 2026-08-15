import type { CulvertRun, StatRow } from '../types/culvert';

function buildRow(
  statStart: number,
  statEnd: number,
  statGain: number,
  totalScore: number,
  page: string
): StatRow {
  const scorePerS = page === 'ba' ? String(((statGain / (statEnd - statStart)) / 1000000000000).toFixed(2)) + 'T' : (statGain / (statEnd - statStart)).toFixed(2);
  const percentScore = (statGain / totalScore) * 100;
  const timeLabel = page === 'ba' ? `${statStart}s - ${statEnd}s` : `${120 - statStart}s - ${Math.max(0, 120 - statEnd)}s`;
  const scoreGain = page === 'ba' ? String((statGain / 1000000000000).toFixed(2)) + 'T' : statGain.toString();

  return {
    time: timeLabel,
    gain: scoreGain,
    percent: percentScore.toFixed(2) + '%',
    perSecond: scorePerS,
  };
}

// listen for messages from the main thread
self.onmessage = (e: MessageEvent<{ run: CulvertRun, page: string}>) => {
  const { run, page } = e.data;
  const culvertData = run;
  let totalScore = 0;
  if (page === 'ba') {
    totalScore = culvertData.values.reduce((acc, n) => acc + n, 0);
  }
  else {
    totalScore = culvertData.values[culvertData.values.length - 1];
  }
  const nodeRow: StatRow[] = [];
  const contRow: StatRow[] = [];
  const rorRow: StatRow[] = [];

  let openNode = false;
  let nodeStart = 0;
  let nodeEnd = 0;
  let nodeGain = 0;
  let nodeInitValue = 0;

  let openCont = false;
  let contStart = 0;
  let contEnd = 0;
  let contGain = 0;
  let contInitValue = 0;

  let openRor = false;
  let rorStart = 0;
  let rorEnd = 0;
  let rorGain = 0;
  let rorInitValue = 0;

  for (let i = 0; i < culvertData.frames.length; i++) {
    // build fatal row
    if (!openNode && culvertData.fatal_list[i] === true) {
      nodeStart = culvertData.frames[i];
      nodeInitValue = culvertData.values[i];
      openNode = true;
    } else if (openNode && culvertData.fatal_list[i] === false) {
      if (page === 'culvert') {
        nodeGain = culvertData.values[i] - nodeInitValue;
      }
      nodeEnd = culvertData.frames[i];
      openNode = false;
      nodeRow.push(buildRow(nodeStart, nodeEnd, nodeGain, totalScore, page));
      nodeGain = 0;
    }

    // build cont row
    if (!openCont && culvertData.cont_list[i] === true) {
      contStart = culvertData.frames[i];
      contInitValue = culvertData.values[i];
      openCont = true;
    } else if (openCont && culvertData.cont_list[i] === false) {
      if (page === 'culvert') {
        contGain = culvertData.values[i] - contInitValue;
      }
      contEnd = culvertData.frames[i];
      openCont = false;
      contRow.push(buildRow(contStart, contEnd, contGain, totalScore, page));
      contGain = 0;
    }

    //build ror row
    if (!openRor && culvertData.ror_list[i] === true) {
      rorStart = culvertData.frames[i];
      rorInitValue = culvertData.values[i];
      openRor = true;
    } else if (openRor && culvertData.ror_list[i] === false) {
      if (page === 'culvert') {
        rorGain = culvertData.values[i] - rorInitValue;
      }
      rorEnd = culvertData.frames[i];
      openRor = false;
      rorRow.push(buildRow(rorStart, rorEnd, rorGain, totalScore, page));
      rorGain = 0;
    }

    // track gain intervals if BA
    if (page === 'ba') {
      if (openNode) {
        nodeGain += culvertData.values[i];
      }
      if (openCont) {
        contGain += culvertData.values[i];
      }
      if (openRor) {
        rorGain += culvertData.values[i];
      }
    }
  }

  // send results back to main thread
  self.postMessage([nodeRow, contRow, rorRow]);
};