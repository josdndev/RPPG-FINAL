import React from 'react';
import type { DetailedProcessingProgress } from '../types';
import { SignalChart } from './SignalChart';

interface ProcessingViewProps {
  progress: DetailedProcessingProgress;
}

export function ProcessingView({ progress }: ProcessingViewProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 min-h-[400px]">
      <h2 className="text-2xl sm:text-3xl font-bold text-brand-accent mb-2">{progress.stage}</h2>
      
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {/* Frame Visualization */}
        <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Full Frame &amp; Face Mesh</h3>
            <div className="aspect-video w-full bg-black rounded-lg overflow-hidden border-2 border-gray-600">
                {progress.frameImage ? (
                    <img src={progress.frameImage} alt="Current video frame with face mesh" className="w-full h-full object-contain" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">Loading frame...</div>
                )}
            </div>
        </div>
        {/* ROI Visualization */}
        <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Isolated Forehead ROI</h3>
             <div className="aspect-video w-full bg-black rounded-lg overflow-hidden border-2 border-gray-600">
                {progress.roiImage ? (
                    <img src={progress.roiImage} alt="Cropped forehead region of interest" className="w-full h-full object-contain" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">Awaiting face detection...</div>
                )}
            </div>
        </div>
      </div>

      {/* Signal Chart */}
      <div className="w-full mt-4">
        <h3 className="text-lg font-semibold text-gray-300 mb-2 text-center">Live rPPG Signal (Green Channel Average)</h3>
        <div className="h-40 w-full bg-gray-900 rounded-lg p-2 border-2 border-gray-600">
            <SignalChart signal={progress.signal} />
        </div>
      </div>
      
      {/* Overall Progress Bar */}
      <div className="w-full mt-6">
        <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-4 rounded-full transition-all duration-300 ease-linear"
            style={{ width: `${progress.percentage}%` }}
          ></div>
        </div>
        <p className="text-xl font-mono font-semibold text-white text-center mt-2">{progress.percentage}%</p>
      </div>
    </div>
  );
}