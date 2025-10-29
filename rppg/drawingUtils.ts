// Key contour connection indices from the MediaPipe FaceMesh model.
const FACE_OVAL_CONNECTIONS: [number, number][] = [
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454],
  [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400],
  [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
  [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54],
  [54, 103], [103, 67], [67, 109], [109, 10],
];

function drawConnectors(
  ctx: CanvasRenderingContext2D,
  keypoints: any[],
  connections: [number, number][],
  options: { color: string; lineWidth: number }
): void {
  ctx.beginPath();
  ctx.strokeStyle = options.color;
  ctx.lineWidth = options.lineWidth;

  for (const connection of connections) {
    const start = keypoints[connection[0]];
    const end = keypoints[connection[1]];
    if (start && end) {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    }
  }
  ctx.stroke();
}

export function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  keypoints: any[],
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!keypoints || keypoints.length === 0) {
    return;
  }
  
  const contourOptions = { color: 'rgba(50, 205, 255, 0.9)', lineWidth: 2.5 };

  // Draw only the main face outline for a clean, minimalist look.
  drawConnectors(ctx, keypoints, FACE_OVAL_CONNECTIONS, contourOptions);
}