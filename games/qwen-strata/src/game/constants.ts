// Relay Defense — original game constants (no template assets used).

export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 640;

export const HUD_H = 44;              // top HUD band inside the canvas
export const CELL = 48;
export const GRID_COLS = 18;          // build + path area: x 0..864
export const GRID_ROWS = 10;          // y HUD_H .. HUD_H + 10*48 = 520
export const MAP_W = GRID_COLS * CELL;   // 864
export const MAP_H = GRID_ROWS * CELL;   // 480
export const PANEL_X = MAP_W;             // right info panel starts here
export const PANEL_W = GAME_WIDTH - MAP_W; // 160

/** Path waypoints in grid coordinates (col, row). All segments are axis aligned. */
export const PATH_GRID: Array<[number, number]> = [
  [0, 3], [2, 3], [2, 1], [4, 1], [4, 5], [6, 5], [6, 2], [8, 2],
  [8, 7], [10, 7], [10, 3], [12, 3], [12, 8], [14, 8], [14, 4], [17, 4],
];

export const cellX = (col: number) => col * CELL + CELL / 2;
export const cellY = (row: number) => HUD_H + row * CELL + CELL / 2;

/** Waypoint world coords; last point is the relay core entry. */
export const PATH_POINTS: Array<{ x: number; y: number }> = PATH_GRID.map(([c, r]) => ({
  x: cellX(c),
  y: cellY(r),
}));

/** Core sits just past the last waypoint, inside a small compound. */
export const CORE = { x: cellX(17), y: cellY(4) };

export const PATH_CELLS: Array<[number, number]> = (() => {
  const cells: Array<[number, number]> = [];
  for (let i = 0; i < PATH_GRID.length - 1; i++) {
    const [c0, r0] = PATH_GRID[i];
    const [c1, r1] = PATH_GRID[i + 1];
    const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
    let c = c0, r = r0;
    while (true) {
      cells.push([c, r]);
      if (c === c1 && r === r1) break;
      c += dc; r += dr;
    }
  }
  return cells;
})();

export const isPathCell = (col: number, row: number) =>
  PATH_CELLS.some(([c, r]) => c === col && r === row);

export const TOWER = {
  lance: { name: 'Mirror Array', cost: 70, role: 'single-target beam' },
  pulse: { name: 'Static Coil', cost: 95, role: 'area pulse + slow' },
};

/** In-canvas right column layout. Every interactive row sits inside the canvas. */
export const PANEL = {
  infoY: HUD_H + 40,      // 84
  upgradeY: HUD_H + 188,  // 232
  sellY: HUD_H + 224,     // 268
  padY: HUD_H + 268,      // 312
  nextY: HUD_H + 328,     // 372
  row1Y: HUD_H + 366,     // 410
  row2Y: HUD_H + 402,     // 446
  hintY: HUD_H + 440,     // 484
};

/** End-of-run card, drawn inside the map area. */
export const END_CARD = { x: 140, y: 116, w: 580, h: 180 };

export const PALETTE_Y = PANEL.padY;
