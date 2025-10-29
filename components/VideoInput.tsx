import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { AppState } from '../types';
import { CameraIcon, UploadIcon, VideoIcon, SparklesIcon } from './Icons';
import { getFaceDetector } from '../rppg/detector';
import { drawFaceMesh } from '../rppg/drawingUtils';
import { FOREHEAD_LANDMARKS } from '../rppg/constants';
import { useAiAssistant } from '../hooks/useAiAssistant';

interface VideoInputProps {
  onVideoReady: (blob: Blob) => void;
  setAppState: (state: AppState) => void;
  appState: AppState;
  isDetectorReady: boolean;
}

// Fix: Replaced JSX.Element with React.ReactElement to resolve namespace error.
export function VideoInput({ onVideoReady, setAppState, appState, isDetectorReady }: VideoInputProps): React.ReactElement {
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ message: string; color: string; }>({ message: 'Position your face inside the oval', color: 'text-cyan-300'});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);


  const stopCamera = useCallback(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
          videoRef.current.srcObject = null;
      }
  }, []);

  const drawOverlay = useCallback((keypoints: any[] | null) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.videoWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // CRITICAL FIX: Match canvas resolution to the video's intrinsic resolution
    // This ensures landmark coordinates (normalized to video resolution) are scaled correctly.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw status text for immediate feedback
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    if (keypoints && keypoints.length > 0) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillText('STATUS: FACE DETECTED', 20, 40);
        setFeedback({ message: 'Great! Hold still.', color: 'text-green-300' });
    } else {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillText('STATUS: NO FACE DETECTED', 20, 40);
        setFeedback({ message: 'Position your face inside the oval', color: 'text-cyan-300' });
    }

    // Draw the guiding oval - adjusted for portrait orientation
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radiusX = canvas.width * 0.25; // Narrower
    const radiusY = canvas.height * 0.45; // Taller
    
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)'; // Cyan
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();

    if (keypoints && keypoints.length > 0) {
        drawFaceMesh(ctx, keypoints, canvas.width, canvas.height);

        // Calculate and draw forehead ROI
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        for (const idx of FOREHEAD_LANDMARKS) {
            if (keypoints[idx]) {
                const point = keypoints[idx];
                const px = point.x;
                const py = point.y;
                minX = Math.min(minX, px);
                minY = Math.min(minY, py);
                maxX = Math.max(maxX, px);
                maxY = Math.max(maxY, py);
            }
        }

        if (minX < maxX && minY < maxY) {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)'; // Semi-transparent green
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
            ctx.lineWidth = 2;
            const roiWidth = maxX - minX;
            const roiHeight = maxY - minY;
            ctx.fillRect(minX, minY, roiWidth, roiHeight);
            ctx.strokeRect(minX, minY, roiWidth, roiHeight);
        }

    }
  }, []);

  const processLiveFeed = useCallback(async () => {
    if (!videoRef.current || !isDetectorReady || videoRef.current.videoWidth === 0 || videoRef.current.paused || videoRef.current.ended) {
        // If conditions aren't right, keep the loop going but don't process.
        animationFrameRef.current = requestAnimationFrame(processLiveFeed);
        return;
    }

    try {
        const detector = await getFaceDetector();
        const faces = await detector.estimateFaces(videoRef.current, { flipHorizontal: false });
        
        if (faces && faces.length > 0) {
            drawOverlay(faces[0].keypoints);
        } else {
            drawOverlay(null);
        }
    } catch (e) {
        console.error("Error in live feed processing:", e);
        drawOverlay(null);
    }
    
    animationFrameRef.current = requestAnimationFrame(processLiveFeed);
  }, [isDetectorReady, drawOverlay]);

  // This effect hook manages the animation loop based on the app's state.
  useEffect(() => {
    if (appState === 'recording' && isDetectorReady) {
        animationFrameRef.current = requestAnimationFrame(processLiveFeed);
    } else {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }
    // Cleanup function to ensure the loop stops if the component unmounts.
    return () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    };
  }, [appState, isDetectorReady, processLiveFeed]);

  const startRecording = useCallback(async () => {
    if (appState !== 'idle') return; // Prevent starting if not idle
    setError(null);
    setDuration(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Set the state to 'recording', which will trigger the useEffect to start the animation loop.
      setAppState('recording');

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const actualDuration = recordingStartTimeRef.current 
          ? (Date.now() - recordingStartTimeRef.current) / 1000
          : 0;

        const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });

        if (actualDuration < 29.5) {
          setError(`Video is only ${actualDuration.toFixed(1)}s. Please record for at least 30 seconds.`);
          setAppState('idle');
        } else {
          onVideoReady(videoBlob);
        }
        stopCamera();
      };

      recorder.start();
      recordingStartTimeRef.current = Date.now();
      
      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please check permissions and try again.");
      setAppState('idle');
    }
  }, [appState, setAppState, onVideoReady, stopCamera]);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // The change in appState from 'recording' to 'processing' will cause the useEffect
    // to stop the animation loop automatically.

    const canvas = canvasRef.current;
    if(canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0,0, canvas.width, canvas.height);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (file) {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoElement.src);
        if (videoElement.duration < 29.5) {
          setError(`Video is only ${videoElement.duration.toFixed(1)}s. Please select a video of at least 30 seconds.`);
        } else {
          onVideoReady(file);
        }
      };
      videoElement.src = URL.createObjectURL(file);
    }
  };
  
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) stopCamera();
    };
  }, [stopCamera]);

  const isRecording = appState === 'recording';

  const { 
    status: assistantStatus, 
    transcript, 
    error: assistantError, 
    isSupported: isAssistantSupported, 
    startConversation 
  } = useAiAssistant({ onStartAnalysis: startRecording });

  const getAssistantMessage = () => {
    switch (assistantStatus) {
      case 'speaking':
        return 'Speaking...';
      case 'listening':
        return 'Listening for your response...';
      case 'processing':
        return 'Thinking...';
      default:
        return '';
    }
  };


  return (
    <div className="space-y-6">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-700 flex items-center justify-center">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"></video>
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
        
        {!isRecording && (
          <div className="absolute text-center text-gray-500">
            <VideoIcon className="w-16 h-16 mx-auto" />
            <p>Your camera feed will appear here</p>
          </div>
        )}
        {isRecording && (
            <>
              <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/50 p-2 rounded-md">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse-fast"></div>
                <span className="font-mono text-lg text-white">{new Date(duration * 1000).toISOString().substring(14, 19)}</span>
              </div>
               <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 p-2 px-4 rounded-lg text-lg font-semibold ${feedback.color}`}>
                {feedback.message}
               </div>
            </>
        )}
      </div>

      {error && <div className="text-red-400 bg-red-900/50 border border-red-500/30 p-3 rounded-lg text-center">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {!isDetectorReady && (
           <div className="md:col-span-2 text-center p-4 bg-gray-700 rounded-lg animate-pulse">
               <p className="font-semibold text-lg text-gray-300">Initializing analysis engine...</p>
               <p className="text-sm text-gray-400 mt-2">This may take a moment on the first visit as core models are loaded.</p>
           </div>
        )}
        {isDetectorReady && (
            <>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={appState !== 'idle' && !isRecording}
              className={`w-full flex items-center justify-center gap-3 px-6 py-4 text-lg font-semibold rounded-lg transition-all duration-300
                ${isRecording ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-brand-secondary hover:bg-brand-primary text-white'}
                disabled:bg-gray-600 disabled:cursor-not-allowed`}
            >
              <CameraIcon className="w-6 h-6"/>
              {isRecording ? 'Stop Recording' : 'Start Analysis with Camera'}
            </button>
            <div>
              <label htmlFor="file-upload" className="cursor-pointer w-full flex items-center justify-center gap-3 px-6 py-4 text-lg font-semibold rounded-lg transition-all duration-300 bg-gray-700 hover:bg-gray-600 text-white">
                <UploadIcon className="w-6 h-6"/>
                Upload from File
              </label>
              <input id="file-upload" type="file" className="hidden" accept="video/mp4,video/webm,video/mov,video/avi" onChange={handleFileChange} />
            </div>
            </>
        )}
      </div>

      {isDetectorReady && (
        <div className="mt-6 flex flex-col items-center justify-center text-center space-y-3">
            {isAssistantSupported ? (
              <>
                <button
                    onClick={startConversation}
                    disabled={assistantStatus !== 'idle' || appState !== 'idle'}
                    className="w-full max-w-sm flex items-center justify-center gap-3 px-6 py-4 text-lg font-semibold rounded-lg transition-all duration-300 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    <SparklesIcon className="w-6 h-6"/>
                    Talk to Health Assistant
                </button>
                {assistantStatus !== 'idle' && assistantStatus !== 'error' && (
                    <div className="w-full max-w-sm p-3 bg-gray-900/50 rounded-xl border border-white/10 text-left">
                        <p className="font-semibold text-gray-300">{getAssistantMessage()}</p>
                        {transcript && <p className="text-cyan-300 italic mt-1">You said: "{transcript}"</p>}
                    </div>
                )}
              </>
            ) : (
                <p className="text-sm text-gray-500 mt-2">The AI assistant is not supported by your browser.</p>
            )}
            {assistantError && (
                <p className="text-sm text-red-400 max-w-sm">{assistantError}</p>
            )}
        </div>
      )}
    </div>
  );
}