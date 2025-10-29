import type { VitalSignsResults, DetailedProcessingProgress, SignalPoint } from '../types';
import { FOREHEAD_LANDMARKS } from './constants';
import { drawFaceMesh } from './drawingUtils';

// --- DSP UTILITY FUNCTIONS ---

/**
 * Detrends a signal by subtracting a moving average.
 */
function detrend(signal: number[], windowSize: number): number[] {
  const movingAverage: number[] = [];
  for (let i = 0; i < signal.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(signal.length - 1, i + Math.floor(windowSize / 2));
    let sum = 0;
    for (let j = start; j <= end; j++) {
      sum += signal[j];
    }
    movingAverage.push(sum / (end - start + 1));
  }
  return signal.map((value, i) => value - movingAverage[i]);
}

/**
 * Complex-to-complex Cooley-Tukey FFT.
 */
function fft(real_in: number[], imag_in: number[]): { real: number[], imag: number[] } {
    const N = real_in.length;
    if (N === 0) return { real: [], imag: [] };

    const real = [...real_in];
    const imag = [...imag_in];

    // Bit-reversal permutation
    let j = 0;
    for (let i = 1; i < N; i++) {
        let bit = N >> 1;
        while (j & bit) {
            j ^= bit;
            bit >>= 1;
        }
        j ^= bit;
        if (i < j) {
            [real[i], real[j]] = [real[j], real[i]];
            [imag[i], imag[j]] = [imag[j], imag[i]];
        }
    }
    
    // Cooley-Tukey
    for (let len = 2; len <= N; len <<= 1) {
        const halfLen = len >> 1;
        const angle = -2 * Math.PI / len;
        const w_real = Math.cos(angle);
        const w_imag = Math.sin(angle);
        for (let i = 0; i < N; i += len) {
            let t_real = 1;
            let t_imag = 0;
            for (j = 0; j < halfLen; j++) {
                const even_real = real[i + j];
                const even_imag = imag[i + j];
                const odd_real = real[i + j + halfLen];
                const odd_imag = imag[i + j + halfLen];
                
                const p_real = odd_real * t_real - odd_imag * t_imag;
                const p_imag = odd_real * t_imag + odd_imag * t_real;

                real[i + j] = even_real + p_real;
                imag[i + j] = even_imag + p_imag;
                real[i + j + halfLen] = even_real - p_real;
                imag[i + j + halfLen] = even_imag - p_imag;
                
                [t_real, t_imag] = [t_real * w_real - t_imag * w_imag, t_real * w_imag + t_imag * w_real];
            }
        }
    }
    return { real, imag };
}

/**
 * Inverse FFT using the forward FFT via conjugation.
 */
function ifft(fftResult: { real: number[], imag: number[] }): { real: number[], imag: number[] } {
    const N = fftResult.real.length;
    const conjInput = { real: [...fftResult.real], imag: fftResult.imag.map(v => -v) };
    const tempResult = fft(conjInput.real, conjInput.imag);
    return {
        real: tempResult.real.map(v => v / N),
        imag: tempResult.imag.map(v => -v / N),
    };
}

/**
 * Filters a signal using FFT, zeroing out frequencies outside the desired band.
 */
function bandpassFilter(signal: number[], sampleRate: number, lowCutoff: number, highCutoff: number): number[] {
  const originalLength = signal.length;
  const fftSize = 1 << Math.ceil(Math.log2(originalLength));
  const paddedSignal = [...signal, ...new Array(fftSize - originalLength).fill(0)];
  
  const fftResult = fft(paddedSignal, new Array(fftSize).fill(0));
  
  const freqResolution = sampleRate / fftSize;
  
  for (let i = 0; i < fftSize; i++) {
    const freq = i * freqResolution;
    // For positive frequencies (0 to fs/2)
    if (i <= fftSize / 2) {
        if (freq < lowCutoff || freq > highCutoff) {
            fftResult.real[i] = 0;
            fftResult.imag[i] = 0;
        }
    } 
    // For negative frequencies (mirrored part)
    else {
        const mirroredFreq = (fftSize - i) * freqResolution;
        if (mirroredFreq < lowCutoff || mirroredFreq > highCutoff) {
            fftResult.real[i] = 0;
            fftResult.imag[i] = 0;
        }
    }
  }

  const filteredSignalComplex = ifft(fftResult);
  return filteredSignalComplex.real.slice(0, originalLength);
}

/**
 * Finds peaks in a signal with a minimum distance.
 */
function findPeaks(signal: number[], minDistance: number): number[] {
    const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
    const std = Math.sqrt(signal.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / signal.length);
    const minHeight = mean + 0.5 * std;

    const peaks: number[] = [];
    for (let i = 1; i < signal.length - 1; i++) {
        if (signal[i] > minHeight && signal[i] > signal[i - 1] && signal[i] > signal[i + 1]) {
            if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
                peaks.push(i);
            }
        }
    }
    return peaks;
}

// --- MAIN ANALYSIS FUNCTION ---

export async function analyzeVideo(
    videoBlob: Blob, 
    detector: any, 
    onProgress: (progress: DetailedProcessingProgress) => void
): Promise<VitalSignsResults> {

    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get 2D context from canvas');

    const videoUrl = URL.createObjectURL(videoBlob);
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            resolve();
        };
        video.onerror = reject;
    });

    const duration = video.duration;
    if (duration < 30) {
        throw new Error(`Video duration is ${duration.toFixed(1)}s. A minimum of 30 seconds is required for accurate analysis.`);
    }

    const ANALYSIS_FPS = 20;
    const frameInterval = 1 / ANALYSIS_FPS;
    let currentTime = 0;
    const rawSignal: SignalPoint[] = [];

    onProgress({
        stage: 'Step 1/3: Extracting Color Signal from Video',
        percentage: 0,
        frameImage: null,
        roiImage: null,
        signal: [],
    });

    while (currentTime < duration) {
        video.currentTime = currentTime;
        await new Promise(resolve => { video.onseeked = resolve; });

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameForDetector = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const faces = await detector.estimateFaces(frameForDetector, { flipHorizontal: false });

        let frameImage: string | null = null;
        let roiImage: string | null = null;

        if (faces && faces.length > 0) {
            const keypoints = faces[0].keypoints.map((p: any) => ({x: p.x, y: p.y}));

            const displayCanvas = document.createElement('canvas');
            displayCanvas.width = canvas.width;
            displayCanvas.height = canvas.height;
            const displayCtx = displayCanvas.getContext('2d');
            if (displayCtx) {
                displayCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
                drawFaceMesh(displayCtx, keypoints, canvas.width, canvas.height);
                frameImage = displayCanvas.toDataURL('image/jpeg', 0.8);
            }

            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
            for (const idx of FOREHEAD_LANDMARKS) {
                if(keypoints[idx]) {
                    const point = keypoints[idx];
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                }
            }

            if (minX < maxX && minY < maxY) {
                const roiWidth = Math.round(maxX - minX);
                const roiHeight = Math.round(maxY - minY);
                const imageData = ctx.getImageData(minX, minY, roiWidth, roiHeight);

                const roiCanvas = document.createElement('canvas');
                roiCanvas.width = roiWidth;
                roiCanvas.height = roiHeight;
                roiCanvas.getContext('2d')?.putImageData(imageData, 0, 0);
                roiImage = roiCanvas.toDataURL('image/jpeg', 0.8);

                let greenSum = 0;
                for (let i = 0; i < imageData.data.length; i += 4) {
                    greenSum += imageData.data[i + 1];
                }
                const greenAverage = greenSum / (imageData.data.length / 4);
                rawSignal.push({ t: currentTime * 1000, v: greenAverage });
            }
        }
        
        const percentage = Math.round((currentTime / duration) * 60);
        onProgress({
            stage: 'Step 1/3: Extracting Color Signal from Video',
            percentage,
            frameImage,
            roiImage,
            signal: [...rawSignal],
        });

        currentTime += frameInterval;
    }
    
    URL.revokeObjectURL(videoUrl);

    if (rawSignal.length < ANALYSIS_FPS * 15) {
        throw new Error("Could not detect a face consistently. Please try again with better lighting and a stable position.");
    }
    
    onProgress({
        stage: 'Step 2/3: Processing Signal for Heartbeats',
        percentage: 65,
        frameImage: null, roiImage: null,
        signal: rawSignal,
    });
    
    const signalValues = rawSignal.map(p => p.v);
    
    const detrendWindowSize = Math.round(ANALYSIS_FPS * 1.5);
    const detrendedSignal = detrend(signalValues, detrendWindowSize);
    
    const filteredSignal = bandpassFilter(detrendedSignal, ANALYSIS_FPS, 0.75, 4.0);
    
    onProgress({
        stage: 'Step 3/3: Calculating Vital Signs',
        percentage: 80,
        frameImage: null, roiImage: null,
        signal: rawSignal,
    });
    
    const minPeakDistance = Math.round(ANALYSIS_FPS / 4.0);
    const peakIndices = findPeaks(filteredSignal, minPeakDistance);
    
    if (peakIndices.length < 10) {
        throw new Error("Signal quality was too low to find reliable heartbeat peaks. Please try again.");
    }

    const ibis_ms: number[] = [];
    for (let i = 1; i < peakIndices.length; i++) {
        const timeDiff_s = (peakIndices[i] - peakIndices[i-1]) / ANALYSIS_FPS;
        if (timeDiff_s > 0.25 && timeDiff_s < 2.0) {
            ibis_ms.push(timeDiff_s * 1000);
        }
    }

    if (ibis_ms.length < 9) {
        throw new Error("Not enough valid inter-beat intervals found to calculate metrics.");
    }

    const meanIbi = ibis_ms.reduce((a, b) => a + b, 0) / ibis_ms.length;
    const heartRate = Math.round(60000 / meanIbi);

    const sd = Math.sqrt(ibis_ms.map(x => Math.pow(x - meanIbi, 2)).reduce((a, b) => a + b, 0) / ibis_ms.length);
    const sdnn = Math.round(sd);

    let sumSqDiff = 0;
    for (let i = 1; i < ibis_ms.length; i++) {
        sumSqDiff += Math.pow(ibis_ms[i] - ibis_ms[i-1], 2);
    }
    const rmssd = Math.round(Math.sqrt(sumSqDiff / (ibis_ms.length - 1)));

    let respiratoryRate: number | null = null;
    try {
        const rrSignal = ibis_ms;
        const rrPaddedLength = 1 << Math.ceil(Math.log2(rrSignal.length));
        const rrPadded = [...rrSignal, ...new Array(rrPaddedLength - rrSignal.length).fill(0)];
        const rrFft = fft(rrPadded, new Array(rrPadded.length).fill(0));
        
        const rrSampleRate = 1000 / meanIbi;
        const freqResolution = rrSampleRate / rrPadded.length;

        const minRrHz = 0.1; const maxRrHz = 0.5;
        const minRrIndex = Math.ceil(minRrHz / freqResolution);
        const maxRrIndex = Math.floor(maxRrHz / freqResolution);
        
        let maxPeakMag = 0;
        let maxPeakIndex = -1;
        for(let i = minRrIndex; i <= maxRrIndex; i++) {
            const mag = Math.sqrt(rrFft.real[i]**2 + rrFft.imag[i]**2);
            if (mag > maxPeakMag) {
                maxPeakMag = mag;
                maxPeakIndex = i;
            }
        }
        if (maxPeakIndex > 0) {
            respiratoryRate = Math.round((maxPeakIndex * freqResolution) * 60);
        }

    } catch(e) {
        console.warn("Could not calculate respiratory rate:", e);
    }

    onProgress({
        stage: 'Analysis Complete',
        percentage: 100,
        frameImage: null, roiImage: null,
        signal: rawSignal,
    });

    return {
        heartRate,
        respiratoryRate,
        sdnn,
        rmssd
    };
}
