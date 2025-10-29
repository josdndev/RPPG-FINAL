
import React from 'react';

// Fix: Replaced JSX.Element with React.ReactElement to resolve namespace error.
export function Header(): React.ReactElement {
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">
        VitalSigns rPPG Estimator
      </h1>
      <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
        Record or upload a video (min. 30 seconds) with a clearly visible face to estimate your vital signs using remote photoplethysmography.
      </p>
    </header>
  );
}
