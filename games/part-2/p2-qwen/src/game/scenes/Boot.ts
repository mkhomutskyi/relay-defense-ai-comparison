import { Scene } from 'phaser';
import { makeBackground, makeTowerTextures, makeEnemyTextures, makeFxTextures } from '../textures';

export class Boot extends Scene {
    constructor() { super('Boot'); }

    create() {
        // Generate all procedural textures (no external image assets).
        makeBackground(this);
        makeTowerTextures(this);
        makeEnemyTextures(this);
        makeFxTextures(this);
        this.scene.start('MainMenu');
    }
}
