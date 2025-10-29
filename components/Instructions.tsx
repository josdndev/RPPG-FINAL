import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ChartBarIcon, CameraIcon, BeakerIcon, HeartIcon } from './Icons';

// Fix: Replaced JSX.Element with React.ReactElement to resolve namespace error.
export function Instructions(): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-8 space-y-4">
      <div className="bg-gray-900/50 border border-cyan-500/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-cyan-300 mb-3">Tips for an Accurate Measurement</h2>
        <ul className="space-y-2 text-gray-300 list-disc list-inside">
            <li><strong>Remove Glasses:</strong> If possible, remove eyeglasses to prevent reflections and frame obstruction.</li>
            <li><strong>Good Lighting:</strong> Face a light source (like a window or lamp). Avoid backlighting or strong side lighting.</li>
            <li><strong>Stay Still:</strong> Keep your head as still as possible during the recording. Rest your head against a chair for stability.</li>
            <li><strong>Visible Face:</strong> Ensure your entire face, especially your forehead, is clearly visible and not covered by hair.</li>
        </ul>
      </div>

      <div className="bg-gray-900/50 border border-blue-500/30 rounded-lg p-6">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex justify-between items-center text-left text-xl font-semibold text-blue-300"
        >
          <span>📊 How does rPPG analysis work?</span>
          {isExpanded ? <ChevronUpIcon className="w-6 h-6" /> : <ChevronDownIcon className="w-6 h-6" />}
        </button>
        {isExpanded && (
          <div className="mt-4 space-y-4 text-gray-300">
            <p>
              Remote photoplethysmography (rPPG) estimates vital signs without physical contact, using only a video of a face. The process involves these steps:
            </p>
            <ul className="space-y-3 pl-4">
              <li className="flex items-start">
                <CameraIcon className="w-5 h-5 mr-3 mt-1 text-brand-accent flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">1. Face Detection</h3>
                  <p className="text-sm text-gray-400">Identifies and tracks the face in each video frame to define the region of interest.</p>
                </div>
              </li>
              <li className="flex items-start">
                <ChartBarIcon className="w-5 h-5 mr-3 mt-1 text-brand-accent flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">2. Signal Extraction</h3>
                  <p className="text-sm text-gray-400">Analyzes subtle changes in skin color (especially green and red channels) caused by blood flow under the skin.</p>
                </div>
              </li>
              <li className="flex items-start">
                <BeakerIcon className="w-5 h-5 mr-3 mt-1 text-brand-accent flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">3. CHROM Algorithm</h3>
                  <p className="text-sm text-gray-400">A robust signal processing technique is used to separate the blood volume pulse (BVP) from noise like lighting changes and motion.</p>
                </div>
              </li>
              <li className="flex items-start">
                <HeartIcon className="w-5 h-5 mr-3 mt-1 text-brand-accent flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">4. Vitals Estimation</h3>
                  <p className="text-sm text-gray-400">Heart Rate, Respiratory Rate, and HRV are calculated from the peaks and modulations of the clean BVP signal.</p>
                </div>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
