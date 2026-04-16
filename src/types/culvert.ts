export interface CulvertRun {
  frames: number[];
  values: number[];
  fatal_list: boolean[];
  cont_list: boolean[];
  ror_list: boolean[];
  index: number;
}

export interface StatRow {
  time: string;
  gain: string;
  percent: string;
  perSecond: string;
}

export interface UploadOptions {
  file: File;
  resolution: string;
  onFrame: (snapshot: CulvertRun) => void;
  onComplete: (run: CulvertRun) => void;
  onError: (err: Error) => void;
  onTimeout: () => void;
}
