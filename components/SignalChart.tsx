import React, { useRef, useEffect } from 'react';
import type { SignalPoint } from '../types';

interface SignalChartProps {
  signal: SignalPoint[];
}

export const SignalChart: React.FC<SignalChartProps> = ({ signal }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || signal.length < 2) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    // Find min and max values to normalize the signal vertically
    let minValue = Infinity;
    let maxValue = -Infinity;
    for (const point of signal) {
      if (point.v < minValue) minValue = point.v;
      if (point.v > maxValue) maxValue = point.v;
    }
    
    const valueRange = maxValue - minValue;
    
    // If range is zero, avoid division by zero; draw a flat line
    if (valueRange === 0) {
        const y = height / 2;
        ctx.clearRect(0, 0, width, height);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.strokeStyle = 'rgba(60, 179, 113, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
    }
    
    const startTime = signal[0].t;
    const endTime = signal[signal.length - 1].t;
    const timeRange = endTime - startTime;
    
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(60, 179, 113, 0.9)'; // MediumSeaGreen
    ctx.lineWidth = 2;

    for (let i = 0; i < signal.length; i++) {
      const point = signal[i];
      const x = timeRange > 0 ? ((point.t - startTime) / timeRange) * width : 0;
      const y = height - ((point.v - minValue) / valueRange) * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

  }, [signal]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};