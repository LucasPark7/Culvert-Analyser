import type { CulvertRun, StatRow } from '../types/culvert';

function buildRow(
  statStart: number,
  statEnd: number,
  statGain: number,
  totalScore: number
): StatRow {
  const scorePerS = statGain / (statEnd - statStart);
  const percentScore = (statGain / totalScore) * 100;
  return {
    time: `${120 - statStart}s - ${Math.max(0, 120 - statEnd)}s`,
    gain: statGain.toString(),
    percent: percentScore.toFixed(3) + '%',
    perSecond: scorePerS.toFixed(3),
  };
}

// listen for messages from the main thread
self.onmessage = (e: MessageEvent<CulvertRun>) => {
  const culvertData = e.data;
  const totalScore = culvertData.values[culvertData.values.length - 1];
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
      nodeGain = culvertData.values[i] - nodeInitValue;
      nodeEnd = culvertData.frames[i];
      openNode = false;
      nodeRow.push(buildRow(nodeStart, nodeEnd, nodeGain, totalScore));
      nodeGain = 0;
    }

    // build cont row
    if (!openCont && culvertData.cont_list[i] === true) {
      contStart = culvertData.frames[i];
      contInitValue = culvertData.values[i];
      openCont = true;
    } else if (openCont && culvertData.cont_list[i] === false) {
      contGain = culvertData.values[i] - contInitValue;
      contEnd = culvertData.frames[i];
      openCont = false;
      contRow.push(buildRow(contStart, contEnd, contGain, totalScore));
      contGain = 0;
    }

    //build ror row
    if (!openRor && culvertData.ror_list[i] === true) {
      rorStart = culvertData.frames[i];
      rorInitValue = culvertData.values[i];
      openRor = true;
    } else if (openRor && culvertData.ror_list[i] === false) {
      rorGain = culvertData.values[i] - rorInitValue;
      rorEnd = culvertData.frames[i];
      openRor = false;
      rorRow.push(buildRow(rorStart, rorEnd, rorGain, totalScore));
      rorGain = 0;
    }
  }

  // edge case if last frame is part of interval
  if (openNode) {
    nodeEnd = culvertData.frames[culvertData.frames.length - 1];
    nodeGain = culvertData.values[culvertData.values.length - 1] - nodeInitValue;
    nodeRow.push(buildRow(nodeStart, nodeEnd, nodeGain, totalScore));
  }
  if (openCont) {
    contEnd = culvertData.frames[culvertData.frames.length - 1];
    contGain = culvertData.values[culvertData.values.length - 1] - contInitValue;
    contRow.push(buildRow(contStart, contEnd, contGain, totalScore));
  }
  if (openRor) {
    rorEnd = culvertData.frames[culvertData.frames.length - 1];
    rorGain = culvertData.values[culvertData.values.length - 1] - rorInitValue;
    rorRow.push(buildRow(rorStart, rorEnd, rorGain, totalScore));
  }

  // send results back to main thread
  self.postMessage([nodeRow, contRow, rorRow]);
};