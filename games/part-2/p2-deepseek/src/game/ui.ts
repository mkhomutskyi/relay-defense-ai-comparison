import Phaser from 'phaser';

export interface ButtonOptions {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    sub?: string;
    size?: number;
    subSize?: number;
    fill?: number;
    hover?: number;
    stroke?: number;
    textColor?: string;
    primary?: boolean;
    danger?: boolean;
    onClick: () => void;
}

export class UIButton {
    readonly bg: Phaser.GameObjects.Graphics;
    readonly label: Phaser.GameObjects.Text;
    readonly sub?: Phaser.GameObjects.Text;
    readonly zone: Phaser.GameObjects.Zone;
    private hovered = false;
    private enabled = true;
    private visible = true;

    constructor(
        scene: Phaser.Scene,
        private opts: ButtonOptions
    ) {
        this.bg = scene.add.graphics().setDepth(1500);
        const color = opts.textColor ?? (opts.primary ? '#2A1B0F' : '#F6E8C8');
        this.label = scene.add
            .text(opts.x, opts.sub ? opts.y - 9 : opts.y, opts.label, {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: `${opts.size ?? 15}px`,
                fontStyle: 'bold',
                color
            })
            .setOrigin(0.5)
            .setDepth(1502);
        if (opts.sub) {
            this.sub = scene.add
                .text(opts.x, opts.y + 12, opts.sub, {
                    fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                    fontSize: `${opts.subSize ?? 10}px`,
                    color: opts.primary ? '#5A3A14' : '#B9A582'
                })
                .setOrigin(0.5)
                .setDepth(1502);
        }
        this.zone = scene.add
            .zone(opts.x, opts.y, opts.w, opts.h)
            .setOrigin(0.5)
            .setDepth(1501)
            .setInteractive({ useHandCursor: true });
        this.zone.on('pointerover', () => {
            this.hovered = true;
            this.redraw();
        });
        this.zone.on('pointerout', () => {
            this.hovered = false;
            this.redraw();
        });
        this.zone.on('pointerdown', () => {
            if (this.enabled && this.visible) {
                this.opts.onClick();
            }
        });
        this.redraw();
    }

    setLabel(label: string, sub?: string): void {
        this.label.setText(label);
        if (this.sub && sub !== undefined) this.sub.setText(sub);
    }

    setEnabled(value: boolean): void {
        this.enabled = value;
        this.zone.input!.enabled = value;
        this.redraw();
    }

    setVisible(value: boolean): void {
        this.visible = value;
        this.bg.setVisible(value);
        this.label.setVisible(value);
        this.sub?.setVisible(value);
        this.zone.setVisible(value);
        this.zone.input!.enabled = value && this.enabled;
    }

    setFill(fill: number, hover?: number): void {
        this.opts.fill = fill;
        this.opts.hover = hover ?? fill;
        this.redraw();
    }

    redraw(): void {
        const { x, y, w, h, primary, danger } = this.opts;
        const bg = this.bg;
        bg.clear();
        if (!this.visible) return;
        let fill = this.opts.fill ?? (primary ? 0xf2a33c : danger ? 0x6b3026 : 0x3a2c20);
        let stroke = this.opts.stroke ?? (primary ? 0xffd27a : danger ? 0xc06a52 : 0x5a4732);
        let textColor = this.opts.textColor ?? (primary ? '#2A1B0F' : '#F6E8C8');
        if (!this.enabled) {
            fill = 0x2f271e;
            stroke = 0x45392b;
            textColor = '#7d705c';
        } else if (this.hovered) {
            fill = this.opts.hover ?? (primary ? 0xffb85a : danger ? 0x86402f : 0x4c3927);
        }
        bg.fillStyle(fill, 1);
        bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
        bg.lineStyle(1.5, stroke, this.enabled ? 0.9 : 0.5);
        bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
        bg.fillStyle(0xffffff, this.enabled ? (this.hovered ? 0.09 : 0.05) : 0.015);
        bg.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, Math.max(6, h / 2 - 4), 8);
        this.label.setColor(textColor);
        this.sub?.setColor(!this.enabled ? '#6c6150' : primary ? '#5A3A14' : '#B9A582');
    }

    destroy(): void {
        this.bg.destroy();
        this.label.destroy();
        this.sub?.destroy();
        this.zone.destroy();
    }
}

export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number, alpha: number, stroke: number, radius = 12): void {
    g.fillStyle(fill, alpha);
    g.fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(1.5, stroke, 0.85);
    g.strokeRoundedRect(x, y, w, h, radius);
}
