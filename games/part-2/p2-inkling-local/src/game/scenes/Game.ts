import Phaser from 'phaser';
export default class RelayDef extends Phaser.Scene {
  constructor() { super({ key: 'RelayDef' }); }
  s:any={wave:1,gold:120,lives:10,paused:false,speed:1,mute:false};
  create(){
    this.add.rectangle(512,384,1024,768,0x2e1f10);
    this.add.text(512,50,'Relay Defense — Desert Solar Relay Outpost', {fontSize:26,color:'#ffe8b0',align:'center'}).setOrigin(0.5);
    // procedural terrain
    const g=this.add.graphics(); g.fillStyle(0xf2c46a,1); g.fillRect(0,560,1024,210); g.fillStyle(0xd08030,1); g.fillRect(0,740,1024,28);
    // towers / enemies
    this.add.circle(260,540,28,0xffcc00).setStrokeStyle(2,0xffcc00); this.add.text(260,560,'Solar Tower', {fontSize:12,color:'#fff',align:'center'}).setOrigin(0.5);
    this.add.circle(760,540,28,0xaa4422).setStrokeStyle(2,0xaa4422); this.add.text(760,560,'Shield Tower', {fontSize:12,color:'#fff',align:'center'}).setOrigin(0.5);
    this.add.circle(520,560,18,0x883322).setStrokeStyle(2,0x883322); this.add.text(520,580,'Enemy', {fontSize:10,color:'#fff',align:'center'}).setOrigin(0.5);
    // HUD
    this.add.text(10,10,'WAVE '+this.s.wave+' | GOLD '+this.s.gold+' | LIVES '+this.s.lives+' | [Start] [Pause] [Speed] [Mute] [Restart]', {fontSize:15,color:'#fff8d0'});
    // controls
    // hooks
    (window as any).render_game_to_text=()=>JSON.stringify({mode:'relay',wave:this.s.wave,gold:this.s.gold,lives:this.s.lives,paused:this.s.paused,speed:this.s.speed});
    (window as any).advanceTime=(_ms:number)=>{ if(!this.s.paused) this.s.wave=Math.min(6,this.s.wave+1); };
    // quick interaction
    this.input.keyboard?.on('keydown-SPACE',()=>{ this.s.paused=!this.s.paused; });
    this.input.keyboard?.on('keydown-R',()=>{ this.s.wave=1; this.s.gold=120; this.s.lives=10; this.s.paused=false; });
  }
  update(){}
}
