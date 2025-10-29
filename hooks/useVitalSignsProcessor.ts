import { useState, useCallback, useRef, useEffect } from 'react';
import type { VitalSignsResults, DetailedProcessingProgress } from '../types';
import { analyzeVideo } from '../rppg/analysis';
import { getFaceDetector } from '../rppg/detector';

const DETECTOR_INIT_TIMEOUT = 30000; // 30 seconds

const initialProgress: DetailedProcessingProgress = {
  stage: '',
  percentage: 0,
  frameImage: null,
  roiImage: null,
  signal: [],
};

export function useVitalSignsProcessor() {
  const [results, setResults] = useState<VitalSignsResults | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<DetailedProcessingProgress>(initialProgress);
  const [error, setError] = useState<string | null>(null);
  const [isDetectorReady, setIsDetectorReady] = useState<boolean>(false);
  const faceDetectorRef = useRef<any | null>(null);

  useEffect(() => {
    let isMounted = true;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Initialization timed out. The analysis engine is taking longer than expected to load. This can happen on slower connections. Please check your network and refresh the page.')),
        DETECTOR_INIT_TIMEOUT
      )
    );
    
    Promise.race([getFaceDetector(), timeoutPromise])
      .then(detector => {
        if (isMounted) {
          faceDetectorRef.current = detector;
          setIsDetectorReady(true);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error("Failed to initialize face detector:", err);
          setError(`Error: ${(err as Error).message || 'Could not load analysis engine.'}`);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const processVideo = useCallback(async (videoBlob: Blob) => {
    if (!isDetectorReady || !faceDetectorRef.current) {
        setError('Error: Face detector not initialized.');
        console.error("Face detector not ready.");
        setIsProcessing(false);
        return;
    }
    
    setIsProcessing(true);
    setResults(null);
    setError(null);
    setProgress({ ...initialProgress, stage: 'Starting analysis...', percentage: 0 });

    try {
      const analysisResults = await analyzeVideo(videoBlob, faceDetectorRef.current, (prog) => {
        // The callback now provides detailed progress
        setProgress(prog);
      });
      setResults(analysisResults);
      setProgress(prev => ({ ...prev, stage: 'Analysis Complete!', percentage: 100 }));
    } catch (err) {
      console.error("Video analysis failed:", err);
      const errorMessage = (err as Error).message || "An unknown error occurred during analysis.";
      setError(`Analysis Failed: ${errorMessage}`);
      setProgress(prev => ({ ...prev, stage: `Error: ${errorMessage}`, percentage: 0 }));
    } finally {
      setIsProcessing(false);
    }
  }, [isDetectorReady]);

  const reset = useCallback(() => {
    setResults(null);
    setIsProcessing(false);
    setError(null);
    setProgress(initialProgress);
  }, []);

  return {
    results,
    isProcessing,
    progress,
    error,
    processVideo,
    reset,
    isDetectorReady,
  };
}