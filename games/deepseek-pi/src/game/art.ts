import * as Phaser from 'phaser';

export const GAME_W = 1280;
export const GAME_H = 720;
export const MAP_TOP = 68;
export const MAP_BOTTOM = 624;

export const PALETTE = {
  ink: 0x172724,
  inkSoft: 0x243a35,
  cream: 0xf7ecd6,
  sand: 0xe9c57f,
  sandLight: 0xf6dca4,
  sandDark: 0xc99755,
  path: 0xa96c3e,
  pathLight: 0xc58c55,
  pathDark: 0x7c4a2b,
  orange: 0xffb454,
  orangeDeep: 0xe8832f,
  teal: 0x2f9b93,
  tealLight: 0x6ed8c8,
  red: 0xff6b5b,
  green: 0x8bd6a2,
  shadow: 0x4b2a16,
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Paint a warm, grainy desert floor with dune bands and a soft vignette. */
export function createSandTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('sand-floor')) return;
  const tex = scene.textures.createCanvas('sand-floor', GAME_W, GAME_H);
  if (!tex) return;
  const ctx = tex.getContext();
  const rng = mulberry32(90717);

  const base = ctx.createLinearGradient(0, 0, 0, GAME_H);
  base.addColorStop(0, '#f3d493');
  base.addColorStop(0.55, '#e8c17b');
  base.addColorStop(1, '#d9a761');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Haze of the low sun in the upper right.
  const sun = ctx.createRadialGradient(1080, 90, 10, 1080, 90, 420);
  sun.addColorStop(0, 'rgba(255,246,205,0.7)');
  sun.addColorStop(0.5, 'rgba(255,231,164,0.22)');
  sun.addColorStop(1, 'rgba(255,231,164,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Broad wind-carved dune bands.
  for (let i = 0; i < 11; i++) {
    const y = 110 + i * 55 + rng() * 24;
    const amp = 18 + rng() * 34;
    ctx.beginPath();
    ctx.moveTo(-40, y);
    for (let x = -40; x <= GAME_W + 40; x += 42) {
      const yy = y + Math.sin((x / GAME_W) * Math.PI * (2 + rng() * 2) + i) * amp;
      ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,238,188,0.16)' : 'rgba(160,100,44,0.10)';
    ctx.lineWidth = 10 + rng() * 18;
    ctx.stroke();
  }

  // Fine sand grain.
  for (let i = 0; i < 5200; i++) {
    const x = rng() * GAME_W;
    const y = rng() * GAME_H;
    const light = rng() > 0.5;
    ctx.fillStyle = light ? `rgba(255,244,208,${0.06 + rng() * 0.13})` : `rgba(126,79,34,${0.04 + rng() * 0.1})`;
    const s = 0.7 + rng() * 1.7;
    ctx.fillRect(x, y, s, s);
  }

  // Dry scrub flecks.
  for (let i = 0; i < 260; i++) {
    const x = rng() * GAME_W;
    const y = MAP_TOP + 12 + rng() * (MAP_BOTTOM - MAP_TOP - 24);
    ctx.strokeStyle = `rgba(104,92,48,${0.18 + rng() * 0.18})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * 7, y - 2 - rng() * 5);
    ctx.stroke();
  }

  // A few long cracks in the hardpan.
  for (let i = 0; i < 14; i++) {
    let x = rng() * GAME_W;
    let y = MAP_TOP + rng() * (MAP_BOTTOM - MAP_TOP);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += (rng() - 0.5) * 30;
      y += 8 + rng() * 15;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(116,74,38,0.14)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Warm vignette so the HUD edges sit calmly.
  const vig = ctx.createRadialGradient(GAME_W / 2, GAME_H / 2, 260, GAME_W / 2, GAME_H / 2, 780);
  vig.addColorStop(0, 'rgba(72,39,16,0)');
  vig.addColorStop(1, 'rgba(72,39,16,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  tex.refresh();
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
