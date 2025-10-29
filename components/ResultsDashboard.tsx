
import React from 'react';
import type { VitalSignsResults, VitalSignMetric } from '../types';
import { VitalSignCard } from './VitalSignCard';
import { HeartIcon, LungIcon, ActivityIcon, RefreshIcon } from './Icons';

interface ResultsDashboardProps {
  results: VitalSignsResults;
  onStartOver: () => void;
}

// Fix: Replaced JSX.Element with React.ReactElement to resolve namespace error.
export function ResultsDashboard({ results, onStartOver }: ResultsDashboardProps): React.ReactElement {

  const getHeartRateMetric = (hr: number | null): VitalSignMetric => {
    if (hr === null) {
      return { name: "Heart Rate", value: "N/A", unit: "BPM", interpretation: 'N/A', color: 'gray', icon: <HeartIcon className="w-8 h-8"/> };
    }
    let interpretation: VitalSignMetric['interpretation'] = 'Normal';
    let color: VitalSignMetric['color'] = 'green';
    if (hr < 60) {
      interpretation = 'Low'; color = 'blue';
    } else if (hr > 100) {
      interpretation = 'High'; color = 'red';
    }
    return { name: "Heart Rate", value: hr, unit: "BPM", interpretation, color, icon: <HeartIcon className="w-8 h-8"/> };
  };
  
  const getRespiratoryRateMetric = (rr: number | null): VitalSignMetric => {
    if (rr === null) {
      return { name: "Respiratory Rate", value: "N/A", unit: "breaths/min", interpretation: 'N/A', color: 'gray', icon: <LungIcon className="w-8 h-8"/> };
    }
    let interpretation: VitalSignMetric['interpretation'] = 'Normal';
    let color: VitalSignMetric['color'] = 'green';
    if (rr < 12) {
      interpretation = 'Low'; color = 'blue';
    } else if (rr > 20) {
      interpretation = 'High'; color = 'red';
    }
    return { name: "Respiratory Rate", value: rr, unit: "breaths/min", interpretation, color, icon: <LungIcon className="w-8 h-8"/> };
  };
  
  const getHrvMetric = (sdnn: number | null): VitalSignMetric => {
     if (sdnn === null) {
      return { name: "Heart Rate Variability", value: "N/A", unit: "ms (SDNN)", interpretation: 'N/A', color: 'gray', icon: <ActivityIcon className="w-8 h-8"/> };
    }
    let interpretation: VitalSignMetric['interpretation'] = 'Normal';
    let color: VitalSignMetric['color'] = 'blue';
    if (sdnn < 20) {
      interpretation = 'Reduced'; color = 'orange';
    } else if (sdnn > 100) {
      interpretation = 'Elevated'; color = 'green';
    }
    return { name: "Heart Rate Variability", value: sdnn, unit: `ms (SDNN)`, interpretation, color, icon: <ActivityIcon className="w-8 h-8"/> };
  };
  
  const metrics: VitalSignMetric[] = [
    getHeartRateMetric(results.heartRate),
    getRespiratoryRateMetric(results.respiratoryRate),
    getHrvMetric(results.sdnn),
  ];

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl font-bold mb-6 text-center text-white">Analysis Results</h2>
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map(metric => (
          <VitalSignCard key={metric.name} metric={metric} />
        ))}
      </div>
      <button
        onClick={onStartOver}
        className="flex items-center justify-center gap-2 px-8 py-3 bg-brand-secondary hover:bg-brand-primary text-white font-semibold rounded-lg transition-colors"
      >
        <RefreshIcon className="w-5 h-5"/>
        Start New Analysis
      </button>
    </div>
  );
}
