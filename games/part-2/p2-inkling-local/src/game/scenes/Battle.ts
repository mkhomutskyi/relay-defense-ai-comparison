import Phaser from 'phaser';
export default class Battle extends Phaser.Scene {
  constructor() { super({ key: 'Battle' }); }
  s:any={wave:1,gold:120,lives:10,paused:false,speed:1,mute:false,over:false};
  enemies:any[]=[]; towers:any[]=[]; bullets:any[]=[]; path:[number,number][]=[]; timer=0;
  create(){
    this.add.rectangle(512,384,1024,768,0x2e1f10);
    // path (left to right curve)
    this.path=[[60,600],[300,500],[600,500],[900,600]];
    // procedural ground
    const g=this.add.graphics(); g.fillStyle(0xf2c46a,1); g.fillRect(0,560,1024,210); g.fillStyle(0xd08030,1); g.fillRect(0,740,1024,28);
    // HUD
    this.add.text(10,10,'Relay Defense — Wave '+this.s.wave+' Gold:'+this.s.gold+' Lives:'+this.s.lives, {fontSize:15,color:'#fff8d0'});
    this.add.text(10,25,'Towers: Solar (ranged) + Shield (close). Click build/upgrade. Space=Pause. R=Restart. M=Mute.', {fontSize:12,color:'#ffe8b0'});
    // initial towers
    this.towers.push({x:200,y:540,type:'solar',lvl:1,range:150,dmg:10,fireRate:500,cd:0});
    this.towers.push({x:700,y:540,type:'shield',lvl:1,range:80,dmg:15,fireRate:600,cd:0});
    // start button area
    const btn=this.add.text(10,720,'START / PAUSE / RESTART / MUTE / SPEED2x', {fontSize:14,color:'#ffd0b0'}).setInteractive();
    btn.on('pointerdown',()=>{ this.s.paused=!this.s.paused; });
    this.input.keyboard?.on('keydown-SPACE',()=>this.s.paused=!this.s.paused);
    this.input.keyboard?.on('keydown-R',()=>{ this.s.wave=1; this.s.gold=120; this.s.lives=10; this.s.paused=false; this.s.over=false; this.enemies=[]; this.towers=[]; this.bullets=[]; this.create(); });
    this.input.keyboard?.on('keydown-M',()=>this.s.mute=!this.s.mute);
    this.input.keyboard?.on('keydown-2',()=>this.s.speed=2);
    // hooks
    (window as any).render_game_to_text=()=>JSON.stringify({mode:'battle',wave:this.s.wave,gold:this.s.gold,lives:this.s.lives,paused:this.s.paused,speed:this.s.speed,over:this.s.over,enemies:this.enemies.length,towers:this.towers.length});
    (window as any).advanceTime=(ms:number)=>{ if(!this.s.paused && !this.s.over) { this.timer+=ms; if(this.timer>600){ this.timer-=600; this.spawnWave(); } } };
    // spawn first enemy
    setTimeout(()=>this.spawnWave(),500);
  }
  spawnWave(){
    if(this.s.over) return;
    const types=['grunt','fast','tank','boss'];
    const count = this.s.wave===6?1:3+this.s.wave;
    for(let i=0;i<count;i++){
      const e={x:60,y:600,type:types[i%types.length],hp:30+this.s.wave*8,spd:1+this.s.wave*0.4,dead:false};
      this.enemies.push(e);
    }
    // win when wave 6 cleared and lives>0
    if(this.s.wave>=6 && this.enemies.every(e=>e.dead)){ this.s.over=true; this.add.text(512,300,'WIN — All waves cleared!',{fontSize:26,color:'#ffcc00',align:'center'}).setOrigin(0.5); }
  }
  update(){
    if(this.s.paused || this.s.over) return;
    // move enemies along path
    this.enemies.forEach(e=>{
      if(e.dead) return;
      e.x += e.spd*2; if(e.x>900){ e.dead=true; this.s.lives--; }
    });
    // tower attacks
    this.towers.forEach(t=>{ t.cd--; if(t.cd<=0){ const target=this.enemies.find(e=>!e.dead && Math.abs(e.x-t.x)<t.range); if(target){ t.cd=t.fireRate; this.bullets.push({x:t.x,y:t.y,target,dead:false,spd:8}); } } });
    // bullets
    this.bullets.forEach(b=>{ if(b.dead) return; b.x+=b.spd*6; if(b.x>1000) b.dead=true; else { const hit=this.enemies.find(e=>!e.dead && Math.abs(e.x-b.x)<20 && Math.abs(e.y-b.y)<20); if(hit){ b.dead=true; hit.hp-=10; if(hit.hp<=0){ hit.dead=true; this.s.gold+=10; } } } });
    // lose
    if(this.s.lives<=0 && !this.s.over){ this.s.over=true; this.add.text(512,300,'DEFEAT — Restart to retry.',{fontSize:26,color:'#ff0000',align:'center'}).setOrigin(0.5); }
    // wave advance when enemies dead
    if(this.enemies.length>0 && this.enemies.every(e=>e.dead)){ this.s.wave=Math.min(6,this.s.wave+1); this.spawnWave(); }
  }
}
// Web Audio effect stub (procedural)
const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
if(AudioCtx){ const ac = new AudioCtx(); const osc = ac.createOscillator(); osc.connect(ac.destination); osc.start(); setTimeout(()=>osc.stop(),100); }
