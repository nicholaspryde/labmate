const GOOGLE_COLOR_IDS: Array<{ id: string; hex: string }> = [
  { id: "1", hex: "#a4bdfc" },
  { id: "2", hex: "#7ae7bf" },
  { id: "3", hex: "#dbadff" },
  { id: "4", hex: "#ff887c" },
  { id: "5", hex: "#fbd75b" },
  { id: "6", hex: "#ffb878" },
  { id: "7", hex: "#46d6db" },
  { id: "8", hex: "#e1e1e1" },
  { id: "9", hex: "#5484ed" },
  { id: "10", hex: "#51b749" },
  { id: "11", hex: "#dc2127" },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function colorDistance(a: string, b: string): number {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  return (rgbA.r - rgbB.r) ** 2 + (rgbA.g - rgbB.g) ** 2 + (rgbA.b - rgbB.b) ** 2;
}

export function mapHexToGoogleColorId(hex: string): string {
  let best = GOOGLE_COLOR_IDS[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of GOOGLE_COLOR_IDS) {
    const distance = colorDistance(hex.toLowerCase(), candidate.hex.toLowerCase());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best.id;
}
