// データ処理ロジック（PythonからJavaScriptに変換）

export interface SessionParams {
  massKg: number;
  tempC: number;
  pressureHpa: number;
  eta: number;
  cda: number;
  crr: number;
  useCoastdownFit: boolean;
  rpmBin: number;
  percentile: number;
  maxSlip: number;
  minSpeedMps: number;
  smoothWindowBins: number;
  accelSmoothWin: number;
  accelClip?: number;
}

export interface TimeSeriesData {
  t: number[];
  rpm: number[];
  speedMps: number[];
  lap: number[];
  session: string[];
}

export interface CurveResult {
  rpmCurve: number[];
  torqueCurve: number[];
  powerCurve: number[];
  K: number;
  rho: number;
  cda: number;
  crr: number;
  rOverGr: number;
  error?: string;
}

const G = 9.80665;

export const defaultSessionParams: SessionParams = {
  massKg: 165.0,
  tempC: 25.0,
  pressureHpa: 1013.25,
  eta: 0.90,
  cda: 0.60,
  crr: 0.015,
  useCoastdownFit: false,
  rpmBin: 200,
  percentile: 95.0,
  maxSlip: 0.05,
  minSpeedMps: 5.0,
  smoothWindowBins: 3,
  accelSmoothWin: 5,
};

export function airDensitySimple(tempC: number, pressureHpa: number): number {
  const Tk = tempC + 273.15;
  return 1.225 * (pressureHpa / 1013.25) * (288.15 / Tk);
}

export function detectDelimiter(sample: string): string {
  const semi = (sample.match(/;/g) || []).length;
  const comma = (sample.match(/,/g) || []).length;
  const tab = (sample.match(/\t/g) || []).length;
  
  if (semi >= Math.max(comma, tab)) return ';';
  if (comma >= Math.max(semi, tab)) return ',';
  return '\t';
}

export function autoMapColumns(columns: string[]): { [key: string]: string | null } {
  const cols = Object.fromEntries(columns.map(c => [c.toLowerCase(), c]));
  
  const rpmCol = cols['rpm'] || null;
  
  let speedCol = null;
  const speedKeys = ['speed gps', 'gps speed', 'speed', 'speed rear', 'v', 'velocity'];
  for (const key of speedKeys) {
    if (cols[key]) {
      speedCol = cols[key];
      break;
    }
  }
  
  let timeCol = null;
  if (cols['time']) {
    timeCol = cols['time'];
  } else if (cols['absolute time']) {
    timeCol = cols['absolute time'];
  } else {
    for (const col of columns) {
      if (col.toLowerCase().startsWith('utc time')) {
        timeCol = col;
        break;
      }
    }
  }
  
  const lapCol = cols['lap'] || null;
  
  return { rpm: rpmCol, speed: speedCol, time: timeCol, lap: lapCol };
}

export function toStandardTimeSeries(
  data: any[][],
  columns: string[],
  mapping: { [key: string]: string | null },
  sessionName: string
): TimeSeriesData {
  const result: TimeSeriesData = {
    t: [],
    rpm: [],
    speedMps: [],
    lap: [],
    session: []
  };

  // 時間データの処理
  let timeData: number[] = [];
  if (mapping.time && columns.includes(mapping.time)) {
    const timeColIndex = columns.indexOf(mapping.time);
    timeData = data.map(row => {
      const val = parseFloat(row[timeColIndex]);
      return isNaN(val) ? 0 : val;
    });
    
    // 欠損値の補間
    for (let i = 1; i < timeData.length; i++) {
      if (isNaN(timeData[i])) {
        timeData[i] = timeData[i - 1];
      }
    }
    
    // 最初の値がNaNの場合の処理
    if (isNaN(timeData[0])) {
      timeData[0] = 0;
    }
  } else {
    timeData = data.map((_, i) => i * 0.1);
  }
  
  // 時間を0から開始
  const startTime = timeData[0];
  result.t = timeData.map(t => t - startTime);

  // RPMデータの処理
  if (!mapping.rpm || !columns.includes(mapping.rpm)) {
    throw new Error('RPM column not found');
  }
  const rpmColIndex = columns.indexOf(mapping.rpm);
  const rpmData = data.map(row => {
    const val = parseFloat(row[rpmColIndex]);
    return isNaN(val) ? 0 : val;
  });
  
  // 欠損値の補間
  for (let i = 1; i < rpmData.length; i++) {
    if (isNaN(rpmData[i])) {
      rpmData[i] = rpmData[i - 1];
    }
  }
  result.rpm = rpmData;

  // 速度データの処理
  if (!mapping.speed || !columns.includes(mapping.speed)) {
    throw new Error('Speed column not found');
  }
  const speedColIndex = columns.indexOf(mapping.speed);
  const speedData = data.map(row => {
    const val = parseFloat(row[speedColIndex]);
    return isNaN(val) ? 0 : val;
  });
  
  // 欠損値の補間
  for (let i = 1; i < speedData.length; i++) {
    if (isNaN(speedData[i])) {
      speedData[i] = speedData[i - 1];
    }
  }
  
  // 速度の単位変換（km/h -> m/s）
  const medianSpeed = speedData.reduce((a, b) => a + b, 0) / speedData.length;
  if (medianSpeed > 40.0) {
    result.speedMps = speedData.map(s => s / 3.6);
  } else {
    result.speedMps = speedData;
  }

  // ラップデータの処理
  if (mapping.lap && columns.includes(mapping.lap)) {
    const lapColIndex = columns.indexOf(mapping.lap);
    const lapData = data.map(row => {
      const val = parseFloat(row[lapColIndex]);
      return isNaN(val) ? 1 : Math.floor(val);
    });
    result.lap = lapData;
  } else {
    result.lap = new Array(data.length).fill(1);
  }

  // セッション名
  result.session = new Array(data.length).fill(sessionName);

  return result;
}

export function rollingMean(data: number[], window: number): number[] {
  const win = Math.max(1, Math.floor(window));
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(win / 2));
    const end = Math.min(data.length, i + Math.ceil(win / 2));
    const slice = data.slice(start, end);
    const sum = slice.reduce((a, b) => a + b, 0);
    result.push(sum / slice.length);
  }
  
  return result;
}

export function centralDiff(y: number[], dt: number): number[] {
  if (y.length < 3) {
    return new Array(y.length).fill(0);
  }
  
  const result: number[] = [];
  result[0] = (y[1] - y[0]) / dt;
  
  for (let i = 1; i < y.length - 1; i++) {
    result[i] = (y[i + 1] - y[i - 1]) / (2 * dt);
  }
  
  result[y.length - 1] = (y[y.length - 1] - y[y.length - 2]) / dt;
  
  return result;
}

export function fitKOrigin(
  rpm: number[],
  vMps: number[],
  accel: number[],
  minSpeedMps: number
): number {
  let mask = rpm.map((r, i) => 
    Math.abs(accel[i]) < 0.5 && 
    vMps[i] > minSpeedMps && 
    isFinite(r) && 
    isFinite(vMps[i])
  );
  
  const validCount = mask.filter(Boolean).length;
  if (validCount < 10) {
    mask = rpm.map((r, i) => vMps[i] > minSpeedMps);
  }
  
  const v = vMps.filter((_, i) => mask[i]);
  const n = rpm.filter((_, i) => mask[i]);
  
  const vDotV = v.reduce((sum, val, i) => sum + val * val, 0);
  const vDotN = v.reduce((sum, val, i) => sum + val * n[i], 0);
  
  return vDotV !== 0 ? vDotN / vDotV : 1.0;
}

export function estimateResistancesFromDecel(
  a: number[],
  v: number[],
  m: number,
  rho: number
): [number, number] {
  const v2 = v.map(val => val * val);
  let mask = a.map((acc, i) => acc < -0.2 && v[i] > 3.0);
  
  let validCount = mask.filter(Boolean).length;
  if (validCount < 20) {
    mask = a.map((acc, i) => acc < -0.05 && v[i] > 3.0);
    validCount = mask.filter(Boolean).length;
  }
  
  if (validCount < 10) {
    return [NaN, NaN];
  }
  
  const X = v2.filter((_, i) => mask[i]);
  const Y = a.filter((_, i) => mask[i]);
  
  // 線形回帰: Y = s * X + b
  const n = X.length;
  const sumX = X.reduce((a, b) => a + b, 0);
  const sumY = Y.reduce((a, b) => a + b, 0);
  const sumXY = X.reduce((sum, val, i) => sum + val * Y[i], 0);
  const sumXX = X.reduce((sum, val) => sum + val * val, 0);
  
  const s = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const b = (sumY - s * sumX) / n;
  
  const cda = -2.0 * m * s / Math.max(rho, 1e-6);
  const crr = Math.max(0.0, Math.min(0.03, -b / G));
  
  return [
    Math.max(0.3, Math.min(1.2, cda)),
    crr
  ];
}

export function computeCurves(ts: TimeSeriesData, params: SessionParams): CurveResult {
  if (ts.t.length < 10) {
    return { error: 'Too few samples' } as CurveResult;
  }
  
  const dt = ts.t.length > 1 ? 
    (ts.t[ts.t.length - 1] - ts.t[0]) / (ts.t.length - 1) : 0.1;
  
  const vS = rollingMean(ts.speedMps, params.accelSmoothWin);
  let a = centralDiff(vS, dt);
  
  if (params.accelClip !== undefined) {
    a = a.map(acc => Math.max(-params.accelClip!, Math.min(params.accelClip!, acc)));
  }
  
  const K = fitKOrigin(ts.rpm, vS, a, params.minSpeedMps);
  const nHat = vS.map(v => K * v);
  const eps = ts.rpm.map((rpm, i) => rpm / Math.max(1e-6, nHat[i]) - 1.0);
  
  const rho = airDensitySimple(params.tempC, params.pressureHpa);
  
  let cda = params.cda;
  let crr = params.crr;
  
  if (params.useCoastdownFit) {
    const [estCda, estCrr] = estimateResistancesFromDecel(a, vS, params.massKg, rho);
    if (isFinite(estCda) && isFinite(estCrr)) {
      cda = estCda;
      crr = estCrr;
    }
  }
  
  const fTrac = a.map((acc, i) => 
    params.massKg * acc + 
    0.5 * rho * cda * vS[i] * vS[i] + 
    crr * params.massKg * G
  );
  
  const rOverGr = 2.0 * Math.PI / (60.0 * Math.max(K, 1e-6));
  const tEng = fTrac.map(f => (f * rOverGr) / Math.max(params.eta, 1e-6));
  
  const mask = a.map((acc, i) => 
    acc > 0.0 && 
    Math.abs(eps[i]) < params.maxSlip && 
    vS[i] > params.minSpeedMps && 
    isFinite(tEng[i])
  );
  
  const rpmGood = ts.rpm.filter((_, i) => mask[i]);
  const tGood = tEng.filter((_, i) => mask[i]);
  
  if (rpmGood.length === 0) {
    return { error: 'No valid points after filtering' } as CurveResult;
  }
  
  const rpmMin = Math.max(
    percentile(rpmGood, 1),
    1000
  );
  const rpmMax = percentile(rpmGood, 99);
  
  const bins: number[] = [];
  for (let i = Math.floor(rpmMin / params.rpmBin) * params.rpmBin; 
       i <= Math.ceil(rpmMax / params.rpmBin) * params.rpmBin; 
       i += params.rpmBin) {
    bins.push(i);
  }
  
  const torqueCurve: number[] = [];
  const rpmCurve: number[] = [];
  
  for (let k = 1; k < bins.length; k++) {
    const binStart = bins[k - 1];
    const binEnd = bins[k];
    const selected = rpmGood.filter((rpm, i) => 
      rpm >= binStart && rpm < binEnd
    );
    const selectedTorque = tGood.filter((torque, i) => 
      rpmGood[i] >= binStart && rpmGood[i] < binEnd
    );
    
    if (selected.length < 5) continue;
    
    const torqueBin = percentile(selectedTorque, params.percentile);
    const rpmBin = (binStart + binEnd) / 2.0;
    
    torqueCurve.push(torqueBin);
    rpmCurve.push(rpmBin);
  }
  
  if (torqueCurve.length === 0) {
    return { error: 'No binned points' } as CurveResult;
  }
  
  // スムージング
  const smoothedTorque = rollingMean(torqueCurve, params.smoothWindowBins);
  const powerCurve = smoothedTorque.map((torque, i) => 
    (torque * rpmCurve[i]) / 9549.0
  );
  
  return {
    rpmCurve,
    torqueCurve: smoothedTorque,
    powerCurve,
    K,
    rho,
    cda,
    crr,
    rOverGr
  };
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  if (upper >= sorted.length) return sorted[sorted.length - 1];
  if (lower === upper) return sorted[lower];
  
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
