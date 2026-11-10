// Hand-drawn vector font: strokes on a 6x8 grid, baked to textures per size.
// Keeps all text original and procedural (no bitmap font assets).

const G: Record<string, number[][]> = {
  '0': [[0, 1, 6, 1, 6, 7, 0, 7, 0, 1], [1, 2.5, 4.5, 5.5]],
  '1': [[3, 0, 3, 8], [1.4, 1.6, 3, 0]],
  '2': [[0, 1.2, 2, 0, 4.5, 0, 6, 2, 4, 4, 1.5, 6, 6, 8], [0, 8, 6, 8]],
  '3': [[0, 1, 4, 0, 2.2, 4, 5.8, 6, 2, 8, 0, 7.2], [0, 1.2, 5, 1.2]],
  '4': [[4.6, 0, 0.6, 5.6, 6, 5.6], [4.6, 0, 4.6, 8]],
  '5': [[6, 0, 0, 0, 0, 3.4, 4.4, 3.4, 6, 5.4, 4, 7.4, 0.8, 8]],
  '6': [[5.6, 0.8, 2, 0, 0, 2.6, 0, 5.6, 2.4, 8, 5.2, 6.6, 3.2, 4.4, 0, 5.6]],
  '7': [[0, 0, 6, 0, 2.4, 8]],
  '8': [[3, 0, 1, 2.2, 3, 4, 5, 6, 3, 8, 1, 6, 3, 4, 5, 2, 3, 0]],
  '9': [[3, 8, 5.2, 6, 5.2, 2.4, 3, 0.4, 0.8, 2.4], [3, 2.4, 6, 5.4]],
  'A': [[0, 8, 3, 0, 6, 8], [1.2, 5.2, 4.8, 5.2]],
  'B': [[0, 8, 0, 0, 4.2, 0, 5.7, 1.5, 4.2, 3.2, 0, 3.2, 4.2, 3.2, 5.7, 4.9, 4.2, 6.6, 0, 6.6, 0, 8]],
  'C': [[6, 1.3, 3, 0, 0, 2.3, 0, 5.7, 3, 8, 6, 6.7]],
  'D': [[0, 8, 0, 0, 3.6, 0, 6, 2.4, 6, 5.6, 3.6, 8, 0, 8]],
  'E': [[6, 0, 0, 0, 0, 8, 6, 8], [0, 4, 4.3, 4]],
  'F': [[6, 0, 0, 0, 0, 8], [0, 4, 4.3, 4]],
  'G': [[6, 1.3, 3, 0, 0, 2.3, 0, 5.7, 3, 8, 6, 6.7, 6, 4.4, 3.4, 4.4]],
  'H': [[0, 0, 0, 8], [6, 0, 6, 8], [0, 4, 6, 4]],
  'I': [[3, 0, 3, 8], [1.3, 0, 4.7, 0], [1.3, 8, 4.7, 8]],
  'J': [[4.7, 0, 4.7, 6.4, 3.2, 8, 1.6, 7.6], [1.6, 6.4, 4.7, 6.4]],
  'K': [[0, 0, 0, 8], [5.8, 0, 1.4, 4.2, 5.8, 8]],
  'L': [[0, 0, 0, 8, 6, 8]],
  'M': [[0, 8, 0, 0, 3, 4.2, 6, 0, 6, 8]],
  'N': [[0, 8, 0, 0, 6, 6.4, 6, 8]],
  'O': [[3, 0, 0.9, 2.2, 0.9, 5.8, 3, 8, 5.1, 5.8, 5.1, 2.2, 3, 0]],
  'P': [[0, 8, 0, 0, 4.3, 0, 6, 1.7, 4.3, 3.4, 0, 3.4]],
  'Q': [[3, 0, 0.9, 2.2, 0.9, 5.8, 3, 8, 5.1, 5.8, 5.1, 2.2, 3, 0], [4.2, 5.6, 6.2, 8]],
  'R': [[0, 8, 0, 0, 4.3, 0, 6, 1.7, 4.3, 3.4, 0, 3.4], [3.4, 3.4, 6, 8]],
  'S': [[6, 1.2, 2.4, 0, 0.6, 1.8, 3.2, 4, 5.4, 6.2, 3.6, 8, 0.6, 6.8]],
  'T': [[0, 0, 6, 0], [3, 0, 3, 8]],
  'U': [[0, 0, 0, 6, 2.4, 8, 4.8, 6, 4.8, 0]],
  'V': [[0, 0, 3, 8, 6, 0]],
  'W': [[0, 0, 1.6, 8, 3, 4.4, 4.4, 8, 6, 0]],
  'X': [[0.4, 0, 5.6, 8], [5.6, 0, 0.4, 8]],
  'Y': [[0, 0, 3, 4.2, 6, 0], [3, 4.2, 3, 8]],
  'Z': [[0, 0, 6, 0, 1.2, 8, 6, 8]],
  ' ': [],
  '-': [[0.6, 4, 5.4, 4]],
  '.': [[2.8, 7.4, 3.2, 7.8]],
  ',': [[3.2, 7.2, 2.2, 8.4]],
  ':': [[3, 3, 3, 3.4], [3, 6.6, 3, 7]],
  '!': [[3, 0, 3, 6], [3, 7.2, 3, 7.8]],
  '/': [[0.6, 8, 5.4, 0]],
  '+': [[3, 2, 3, 6.4], [0.8, 4.2, 5.2, 4.2]],
  '$': [[3, -0.4, 3, 8.4], [5.4, 1.2, 2.2, 0.4, 0.9, 2.2, 3.4, 4, 5.2, 5.8, 3.4, 7.6, 0.9, 6.6]],
  '%': [[1.4, 2, 2.4, 0.8, 3.4, 2, 2.4, 3.2, 1.4, 2], [4.6, 6, 5.6, 4.8, 6.6, 6, 5.6, 7.2, 4.6, 6], [1.2, 7.4, 5.2, 0.6]],
  '&': [[4.8, 7.2, 1.2, 2.4, 3.2, 0, 4.6, 2, 1.4, 6, 2.4, 8, 5.4, 4.4], [3.6, 3.4, 5.8, 5.6]],
  '(': [[4.6, 0, 1.8, 4, 4.6, 8]],
  ')': [[1.4, 0, 4.2, 4, 1.4, 8]],
  "'": [[3, 0, 2.6, 2]],
  '*': [[3, 2.4, 3, 6.4], [1.2, 3.2, 4.8, 5.6], [4.8, 3.2, 1.2, 5.6]],
  '>': [[1.4, 1.4, 4.8, 4, 1.4, 6.6]],
  '<': [[4.6, 1.4, 1.2, 4, 4.6, 6.6]],
  '=': [[0.8, 3.4, 5.2, 3.4], [0.8, 5, 5.2, 5]],
  '?': [[0.8, 1.4, 2.6, 0.4, 4.6, 2, 3.2, 4, 3, 5.6], [3, 7.2, 3, 7.8]],
};

export const GLYPH_W = 6;
export const GLYPH_H = 8;

export function measureText(text: string, scale: number, space: number): number {
  const s = text.toUpperCase();
  let w = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ' ' || i < s.length - 1) w += scale * GLYPH_W + space;
  }
  return w - (s.length ? space : 0);
}

export function drawText(
  gfx: Phaser.GameObjects.Graphics,
  text: string,
  x: number,
  y: number,
  scale = 3,
  space = 4,
  lineWidth = 2,
) {
  void lineWidth; // width comes from the caller's lineStyle; param kept for call-site clarity
  const s = text.toUpperCase();
  let cx = x;
  for (const ch of s) {
    const strokes = G[ch] || G['?'];
    for (const st of strokes) {
      // Each stroke is its own path: beginPath() resets the pending path, so the
      // stroke must be emitted per stroke (single strokePath at the end would only
      // render the last sub-path).
      gfx.beginPath();
      for (let i = 0; i < st.length; i += 2) {
        const px = cx + st[i] * scale;
        const py = y + st[i + 1] * scale;
        if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py);
      }
      gfx.strokePath();
    }
    cx += scale * GLYPH_W + space;
  }
  return cx - x - space;
}

/** Draw text scaled down if it would not fit within maxWidth. */
export function drawTextFit(
  gfx: Phaser.GameObjects.Graphics,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  scale = 3,
  space = 4,
  lineWidth = 2,
) {
  void lineWidth;
  const w = measureText(text, scale, space);
  let s = scale, sp = space;
  if (w > maxWidth && w > 0) {
    const k = maxWidth / w;
    s = Math.max(1.4, scale * k);
    sp = Math.max(1.6, space * k);
  }
  return drawText(gfx, text, x, y, s, sp, lineWidth);
}
