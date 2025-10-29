/**
 * Landmark indices from the TensorFlow.js Face Landmark Detection model (using the
 * MediaPipeFaceMesh model architecture with 468 landmarks). These points
 * define a stable region on the forehead used for rPPG signal extraction.
 * NOTE: These indices are different from the ones used by the standalone
 * MediaPipe FaceMesh library.
 */
export const FOREHEAD_LANDMARKS = [
    // Top-left to top-right across the hairline
    103, 67, 109, 10, 338, 297, 332,
    // Eyebrow line
    70, 63, 105, 66, 107, 55, 65,
    // Glabella (between eyebrows)
    9,
    // Center point
    8,
    // Lower boundary points
    295, 285, 336, 334, 293, 300,
];