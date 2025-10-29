import React from 'react';
import type { VitalSignMetric } from '../types';

interface VitalSignCardProps {
  metric: VitalSignMetric;
}

const colorClasses = {
  green: {
    bg: 'bg-green-900/50',
    border: 'border-green-500/50',
    text: 'text-green-300',
    valueText: 'text-green-200'
  },
  blue: {
    bg: 'bg-blue-900/50',
    border: 'border-blue-500/50',
    text: 'text-blue-300',
    valueText: 'text-blue-200'
  },
  red: {
    bg: 'bg-red-900/50',
    border: 'border-red-500/50',
    text: 'text-red-300',
    valueText: 'text-red-200'
  },
  orange: {
    bg: 'bg-orange-900/50',
    border: 'border-orange-500/50',
    text: 'text-orange-300',
    valueText: 'text-orange-200'
  },
  gray: {
    bg: 'bg-gray-700/50',
    border: 'border-gray-500/50',
    text: 'text-gray-400',
    valueText: 'text-gray-300'
  }
};

export const VitalSignCard: React.FC<VitalSignCardProps> = ({ metric }) => {
  const classes = colorClasses[metric.color];
  const isNumber = typeof metric.value === 'number';

  return (
    <div className={`p-6 rounded-2xl shadow-lg border ${classes.bg} ${classes.border} flex flex-col justify-between`}>
      <div>
        <div className={`flex items-center gap-4 ${classes.text}`}>
          {React.cloneElement(metric.icon, { className: 'w-8 h-8' })}
          <h3 className="text-xl font-semibold ">{metric.name}</h3>
        </div>
        <div className="text-center my-4">
          <span className={`font-bold ${isNumber ? 'text-6xl' : 'text-5xl'} ${classes.valueText}`}>
            {isNumber ? (metric.value as number).toFixed(1) : metric.value}
          </span>
          <span className="text-xl text-gray-400 ml-2">{metric.unit}</span>
        </div>
      </div>
      <div className={`text-center py-2 px-4 rounded-lg text-sm font-medium ${classes.bg} ${classes.text}`}>
        {metric.interpretation !== 'N/A' ? `Interpretation: ${metric.interpretation}`: 'Could not be estimated'}
      </div>
    </div>
  );
}