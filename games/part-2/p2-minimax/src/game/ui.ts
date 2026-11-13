/** Small reusable UI pieces drawn procedurally (no DOM, no image assets). */
import { Geom } from 'phaser';
import { C, FONT_BOLD } from './config';

export interface ButtonOpts {
    fontSize?: number;
    textColor?: number;
    bg?: number;
    border?: number;
    radius?: number;
    onClick: () => void;
    onHover?: () => void;
    depth?: number;
    active?: boolean;
    align?: 'center' | 'left';
}

export class UIButton {
    readonly container: Phaser.GameObjects.Container;
    readonly rect: Phaser.Geom.Rectangle;
    private bg: Phaser.GameObjects.Graphics;
    private label: Phaser.GameObjects.Text;
    private zone: Phaser.GameObjects.Zone;
    private opts: ButtonOpts;
    private hover = false;
    private down = false;
    private enabled = true;
    private active: boolean;
    private w: number;
    private h: number;

    constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string, opts: ButtonOpts) {
        this.opts = opts;
        this.w = w;
        this.h = h;
        this.active = !!opts.active;

        this.bg = scene.add.graphics();
        this.label = scene.add.text(0, 0, text, {
            fontFamily: FONT_BOLD,
            fontSize: `${opts.fontSize ?? 14}px`,
            color: '#ffffff',
            align: opts.align ?? 'center'
        }).setOrigin(0.5);

        this.container = scene.add.container(x, y, [this.bg, this.label]);
        this.container.setDepth(opts.depth ?? 100);
        this.rect = new Geom.Rectangle(x - w / 2, y - h / 2, w, h);

        /*
         * The clickable area is a Zone child rather than the container itself:
         * Phaser 4 sizes a container's own hit area from its display bounds, which
         * does not match the drawn button. The zone always matches this.rect.
         */
        this.zone = scene.add.zone(0, 0, w, h);
        // Phaser normalises hit-area coordinates by the object's origin, so the
        // rectangle starts at (0,0) rather than (-w/2,-h/2) for a centred zone.
        this.zone.setInteractive(new Geom.Rectangle(0, 0, w, h), Geom.Rectangle.Contains);
        this.container.add(this.zone);

        this.zone.on('pointerover', () => { this.hover = true; this.redraw(); opts.onHover?.(); });
        this.zone.on('pointerout', () => { this.hover = false; this.down = false; this.redraw(); });
        this.zone.on('pointerdown', () => { this.down = true; this.redraw(); });
        this.zone.on('pointerup', () => {
            this.down = false;
            this.redraw();
            if (this.enabled) opts.onClick();
        });

        this.redraw();
    }

    setPosition(x: number, y: number): void {
        this.container.setPosition(x, y);
        this.rect.setTo(x - this.w / 2, y - this.h / 2, this.w, this.h);
    }

    setEnabled(v: boolean): void {
        this.enabled = v;
        this.container.setAlpha(v ? 1 : 0.42);
        this.redraw();
    }

    setActive(v: boolean): void {
        this.active = v;
        this.redraw();
    }

    setText(t: string): void {
        this.label.setText(t);
    }

    setVisible(v: boolean): void {
        this.container.setVisible(v);
    }

    get isActive(): boolean { return this.active; }
    get isEnabled(): boolean { return this.enabled; }

    private redraw(): void {
        const g = this.bg;
        g.clear();
        const bg = this.opts.bg ?? C.hudPanel;
        const border = this.opts.border ?? C.hudLine;
        let fill = bg;
        let edge = border;
        if (this.active) {
            fill = C.amberDeep;
            edge = C.amber;
        } else if (this.hover && this.enabled) {
            fill = 0x2c3949;
            edge = 0x5d7590;
        }
        if (this.down) fill = 0x1b2430;
        g.fillStyle(fill, 1);
        g.fillRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, this.opts.radius ?? 6);
        g.lineStyle(1, edge, this.active ? 1 : 0.9);
        g.strokeRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, this.opts.radius ?? 6);
        this.label.setColor(this.active ? '#20160a' : `#${(this.opts.textColor ?? 0xffffff).toString(16).padStart(6, '0')}`);
        this.label.setAlpha(this.enabled ? 1 : 0.6);
    }

    destroy(): void {
        this.container.destroy();
    }
}

/** Rounded panel helper. */
export function panel(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    fill: number, stroke?: number, radius = 8, alpha = 1
): void {
    g.fillStyle(fill, alpha);
    g.fillRoundedRect(x, y, w, h, radius);
    if (stroke !== undefined) {
        g.lineStyle(1, stroke, 1);
        g.strokeRoundedRect(x, y, w, h, radius);
    }
}
