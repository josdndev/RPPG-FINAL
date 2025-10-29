// Declarations for TFJS and the face landmarks model from the CDN scripts
declare var tf: any;
declare var faceLandmarksDetection: any;

let detectorInstance: any = null;
let detectorPromise: Promise<any> | null = null;

/**
 * Initializes and returns a singleton instance of the TensorFlow.js Face Landmark Detector.
 * This prevents multiple initializations and race conditions.
 */
export const getFaceDetector = (): Promise<any> => {
    // If the instance is already created, return it immediately.
    if (detectorInstance) {
        return Promise.resolve(detectorInstance);
    }
    
    // If initialization is already in progress, return the existing promise.
    if (detectorPromise) {
        return detectorPromise;
    }
    
    // Start initialization.
    detectorPromise = new Promise(async (resolve, reject) => {
        try {
            // Wait for TFJS to be ready
            await tf.ready();
            
            // Create the detector
            const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
            const detectorConfig = {
                runtime: 'tfjs',
                // PERFORMANCE OPTIMIZATION: Disabling landmark refinement (iris tracking)
                // makes the model significantly faster for real-time feedback.
                refineLandmarks: false,
                maxFaces: 1,
            };
            const detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
            
            detectorInstance = detector;
            resolve(detectorInstance);
        } catch (error) {
            console.error("Failed to initialize TFJS face detector:", error);
            detectorPromise = null; // Reset promise on failure to allow retries.
            reject(error);
        }
    });
    
    return detectorPromise;
};