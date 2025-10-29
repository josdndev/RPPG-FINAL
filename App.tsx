import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Instructions } from './components/Instructions';
import { VideoInput } from './components/VideoInput';
import { ProcessingView } from './components/ProcessingView';
import { ResultsDashboard } from './components/ResultsDashboard';
import { ErrorView } from './components/ErrorView';
import { useVitalSignsProcessor } from './hooks/useVitalSignsProcessor';
import type { AppState } from './types';

function App(): React.ReactElement {
  const [appState, setAppState] = useState<AppState>('idle');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  const {
    results,
    isProcessing,
    progress,
    error,
    processVideo,
    reset,
    isDetectorReady,
  } = useVitalSignsProcessor();

  const handleVideoReady = useCallback(async (blob: Blob) => {
    setVideoBlob(blob);
    setAppState('processing');
    await processVideo(blob);
  }, [processVideo]);

  const handleStartOver = useCallback(() => {
    setAppState('idle');
    setVideoBlob(null);
    reset();
  }, [reset]);

  const renderContent = () => {
    if (error) {
      return <ErrorView errorMessage={error} onRetry={handleStartOver} />;
    }
    
    if (results) {
      return <ResultsDashboard results={results} onStartOver={handleStartOver} />;
    }

    if (isProcessing) {
      // Pass the detailed progress object to the new ProcessingView
      return <ProcessingView progress={progress} />;
    }

    return (
      <>
        <Instructions />
        <VideoInput onVideoReady={handleVideoReady} setAppState={setAppState} appState={appState} isDetectorReady={isDetectorReady} />
      </>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-slate-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl mx-auto">
        <Header />
        <main className="mt-8 bg-gray-800/50 rounded-2xl shadow-2xl p-6 backdrop-blur-sm border border-white/10">
          {renderContent()}
        </main>
        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>Disclaimer: This is a technology demonstration and not a medical device. Results are estimations and should not be used for diagnosis.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;