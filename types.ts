import type { ReactElement } from 'react';

export type AppState = 'idle' | 'recording' | 'processing' | 'results';

export interface VitalSignsResults {
  heartRate: number | null;
  respiratoryRate: number | null;
  sdnn: number | null;
  rmssd: number | null;
}

export interface SignalPoint {
  t: number; // timestamp in ms
  v: number; // value
}

/**
 * Represents the detailed progress of the video analysis, sent from the
 * analysis engine to the UI for real-time visualization.
 */
export interface DetailedProcessingProgress {
  stage: string;
  percentage: number;
  // Data URL of the full video frame with face mesh overlay
  frameImage: string | null;
  // Data URL of the cropped Region of Interest (forehead)
  roiImage: string | null;
  // The raw rPPG signal data accumulated so far
  signal: SignalPoint[];
}


export interface VitalSignMetric {
  value: number | string;
  name: string;
  unit: string;
  interpretation: 'Normal' | 'Low' | 'High' | 'Reduced' | 'Elevated' | 'N/A';
  color: 'green' | 'blue' | 'red' | 'orange' | 'gray';
  icon: ReactElement;
}