/* eslint-env browser */
/* global document window performance requestAnimationFrame console */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restart');
const W = canvas.width, H = canvas.height;

// Physics & tuning
const GRAV = 0.6;
const BOUNCE_V = -12;
const SPACE_JUMP_MULT = 1.8;

let score = 0;
let beds = [];
let removeInterval = 10000; // 10s
let removeTimer = 0;
let lastTime = 0;
let gameOver = false;
let gameOverButton = null; // {x,y,w,h} in canvas coords when Game Over displayed

const boy = {
  x: 120, y: 140, w: 120, h: 160,
  vx: 0, vy: 0, grounded: false,
  feetOffset: 26, // visual offset from sprite center to feet
  lastBed: null, jumpedFromBed: null
};

// retro sprite holder
const sprite = { frames: [], frameIndex: 0, frameInterval: 160, lastFrameTime: 0 };

// Atari-style palette: 0=transparent, 1=black (hair/eyes/shoes), 2=skin, 3=blue shirt, 4=red shorts
const palette = [null, '#000000', '#ffcc88', '#3366cc', '#cc3333'];

function createSpriteFrames(){
  // Clean 16×16 Atari-style boy sprite – two walk-cycle frames
  const maps = [
    [ // Frame 1 – legs neutral
      '0000000000000000',
      '0000011111100000',
      '0000011111100000',
      '0000022222200000',
      '0000021221200000',
      '0000022222200000',
      '0000003333000000',
      '0000033333300000',
      '0000333333330000',
      '0000033333300000',
      '0000033333300000',
      '0000044444400000',
      '0000044004400000',
      '0000044004400000',
      '0000011001100000',
      '0000000000000000'
    ],
    [ // Frame 2 – legs apart
      '0000000000000000',
      '0000011111100000',
      '0000011111100000',
      '0000022222200000',
      '0000021221200000',
      '0000022222200000',
      '0000003333000000',
      '0000033333300000',
      '0000333333330000',
      '0000033333300000',
      '0000033333300000',
      '0000044444400000',
      '0000440000440000',
      '0000440000440000',
      '0000110000110000',
      '0000000000000000'
    ]
  ];

  for(const map of maps){
    const s = document.createElement('canvas'); s.width = 16; s.height = 16;
    const c = s.getContext('2d'); c.imageSmoothingEnabled = false;
    for(let y=0;y<16;y++){
      const row = map[y] || ''.padEnd(16,'0');
      for(let x=0;x<16;x++){
        const key = Number(row[x] || '0');
        const col = palette[key];
        if(col){ c.fillStyle = col; c.fillRect(x,y,1,1); }
      }
    }
    sprite.frames.push(s);
  }
  sprite.frameInterval = 140;
}

function initBeds(){
  beds = [];
  const count = 6; const padding = 40; const totalWidth = W - padding*2; const gap = totalWidth / count;
  const bedW = Math.max(100, Math.floor(gap * 0.62));
  const bedH = Math.max(36, Math.floor(bedW * 0.18));
  const bedY = Math.floor(H - 48 - bedH);
  for(let i=0;i<count;i++){
    const x = padding + i*gap + (gap-bedW)/2;
    beds.push({id:i,x,y:bedY,w:bedW,h:bedH,active:true,alpha:1});
  }
}

function updateScore(){ /* score now drawn on canvas */ }

function placeBoyOnRandomBed(){
  const active = beds.filter(b=>b.active);
  if(active.length===0) return;
  const b = active[Math.floor(Math.random()*active.length)];
  boy.x = b.x + b.w/2;
  boy.feetOffset = Math.round(boy.h * 0.18);
  boy.y = b.y - (boy.h/2 - boy.feetOffset) - 0.1;
  boy.vx = 0; boy.vy = 0; boy.grounded = true; boy.lastBed = b.id; boy.jumpedFromBed = null;
}

function reset(){
  score = 0; updateScore(); removeTimer = 0; lastTime = performance.now(); gameOver = false; gameOverButton = null;
  removalCount = 0;
  initBeds(); placeBoyOnRandomBed();
  // hide DOM restart if present
  if(restartBtn) restartBtn.style.display = 'none';
  // ensure canvas focus
  try{ if (canvas && typeof canvas.focus === 'function') canvas.focus(); }catch(e){ /* ignore focus errors */ }
  requestAnimationFrame(loop);
}

// Subtle background decorations — very low alpha so they don't distract
function drawBackground(){
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.imageSmoothingEnabled = false;

  // --- Window with moon & stars (centered on upper wall, above gameplay) ---
  const winW = 160, winH = 140;
  const winX = Math.floor(W/2 - winW/2);
  const winY = Math.floor(H * 0.18); // vertically centered on upper wall, above bounce zone
  ctx.fillStyle = '#8888cc';
  ctx.fillRect(winX, winY, winW, winH);           // window pane
  ctx.fillStyle = '#222244';
  const gW = Math.floor(winW/2) - 8;
  ctx.fillRect(winX + 8, winY + 8, gW, Math.floor((winH-16)/2));             // top-left glass
  ctx.fillRect(winX + 8 + gW + 8, winY + 8, gW, Math.floor((winH-16)/2));      // top-right glass
  ctx.fillRect(winX + 8, winY + 8 + Math.floor((winH-16)/2), gW, Math.floor((winH-16)/2)); // bottom-left
  ctx.fillRect(winX + 8 + gW + 8, winY + 8 + Math.floor((winH-16)/2), gW, Math.floor((winH-16)/2)); // bottom-right
  // curtain rods and curtains (small accents)
  ctx.fillStyle = '#aa8866';
  ctx.fillRect(winX - 20, winY - 6, winW + 40, 8);
  ctx.fillStyle = '#665544';
  ctx.fillRect(winX - 20, winY + 2, 18, winH + 8);
  ctx.fillRect(winX + winW + 2, winY + 2, 18, winH + 8);
  // moon and stars inside window
  ctx.fillStyle = '#ffffcc';
  ctx.fillRect(winX + Math.floor(winW*0.55), winY + 14, 20, 20);
  ctx.fillStyle = '#222244'; // crescent cut-out
  ctx.fillRect(winX + Math.floor(winW*0.62), winY + 12, 14, 20);
  ctx.fillStyle = '#ffffcc';
  ctx.fillRect(winX + 18, winY + 28, 6, 6);
  ctx.fillRect(winX + 44, winY + 18, 4, 4);
  ctx.fillRect(winX + 22, winY + 54, 4, 4);
  ctx.fillRect(winX + 86, winY + 64, 6, 6);
  ctx.fillRect(winX + 108, winY + 78, 4, 4);

  // --- Bookshelf (floor, right side) ---
  const shelfW = 200, shelfH = 160;
  const shelfX = Math.max(30, W - shelfW - 40);
  const shelfY = H - 48 - shelfH; // sit on floor
  ctx.fillStyle = '#8B6B4A';
  ctx.fillRect(shelfX, shelfY, shelfW, shelfH);           // shelf body
  // shelves (horizontal dividers)
  ctx.fillStyle = '#6B4B2A';
  ctx.fillRect(shelfX, shelfY, shelfW, 8);
  ctx.fillRect(shelfX, shelfY + 56, shelfW, 6);
  ctx.fillRect(shelfX, shelfY + 112, shelfW, 6);
  ctx.fillRect(shelfX, shelfY + shelfH - 8, shelfW, 8);
  // books (colored rectangles) on lower shelves
  const bookColors = ['#cc4444','#4488cc','#44aa44','#cccc44','#cc66aa','#6644cc','#cc8844'];
  let bx = shelfX + 6;
  for(let i = 0; i < 7; i++){
    const bw = 14 + (i % 3) * 4;
    const bh = (i < 4) ? 46 : 48;
    const by = (i < 4) ? shelfY + 12 : shelfY + 70;
    ctx.fillStyle = bookColors[i];
    ctx.fillRect(bx, by, bw, bh);
    bx += bw + 6;
  }

  // --- Dresser (on floor, left side) ---
  const drW = 120, drH = 120;
  const drX = 40;
  const drY = H - 48 - drH; // sit on floor
  ctx.fillStyle = '#7B5B3A';
  ctx.fillRect(drX, drY, drW, drH);           // dresser body
  ctx.fillStyle = '#5B3B1A';
  ctx.fillRect(drX + 8, drY + 10, drW - 16, 30);   // drawer 1
  ctx.fillRect(drX + 8, drY + 46, drW - 16, 30);   // drawer 2
  ctx.fillRect(drX + 8, drY + 82, drW - 16, 30);   // drawer 3
  // drawer knobs
  ctx.fillStyle = '#ccaa66';
  ctx.fillRect(drX + Math.floor(drW/2) - 6, drY + 20, 12, 8);
  ctx.fillRect(drX + Math.floor(drW/2) - 6, drY + 56, 12, 8);
  ctx.fillRect(drX + Math.floor(drW/2) - 6, drY + 92, 12, 8);

  // --- Lamp on dresser ---
  ctx.fillStyle = '#aa8822';
  ctx.fillRect(drX + Math.floor(drW/2) - 4, drY - 16, 8, 16);   // lamp neck
  ctx.fillStyle = '#ccaa44';
  ctx.fillRect(drX + Math.floor(drW/2) - 22, drY - 40, 44, 26);  // lampshade
  ctx.fillStyle = '#ffffcc';
  ctx.fillRect(drX + Math.floor(drW/2) - 16, drY - 36, 32, 18);  // lamp glow

  // --- Picture frame (upper-right wall) ---
  const pfX = W - 280, pfY = 50;
  ctx.fillStyle = '#aa8844';
  ctx.fillRect(pfX, pfY, 140, 110);           // frame
  ctx.fillStyle = '#334455';
  ctx.fillRect(pfX + 12, pfY + 12, 116, 86);  // picture inside
  // simple landscape in picture
  ctx.fillStyle = '#446644';
  ctx.fillRect(pfX + 12, pfY + 60, 116, 38);  // green hill
  ctx.fillStyle = '#ffffaa';
  ctx.fillRect(pfX + 80, pfY + 22, 16, 16);   // sun in picture

  // --- Wall clock (left-center wall) ---
  const clkX = 60, clkY = Math.floor(H/2) - 80;
  ctx.fillStyle = '#aa7744';
  ctx.fillRect(clkX, clkY, 60, 60);             // clock body
  ctx.fillStyle = '#eeddcc';
  ctx.fillRect(clkX + 8, clkY + 8, 44, 44);    // clock face
  ctx.fillStyle = '#333333';
  ctx.fillRect(clkX + 28, clkY + 12, 4, 20);   // hour hand
  ctx.fillRect(clkX + 28, clkY + 28, 16, 4);   // minute hand
  // pendulum
  ctx.fillStyle = '#aa7744';
  ctx.fillRect(clkX + 26, clkY + 60, 8, 40);
  ctx.fillStyle = '#ccaa44';
  ctx.fillRect(clkX + 22, clkY + 96, 16, 16);

  // --- Rug on floor ---
  ctx.fillStyle = '#884466';
  ctx.fillRect(400, H - 46, 400, 12);
  ctx.fillStyle = '#aa6688';
  ctx.fillRect(420, H - 46, 360, 4);
  ctx.fillRect(420, H - 38, 360, 4);

  ctx.restore();
}

function drawBed(b){
  if(!b.active && b.alpha<=0) return;
  ctx.save();
  ctx.globalAlpha = b.alpha;
  ctx.imageSmoothingEnabled = false;

  const x = Math.floor(b.x), y = Math.floor(b.y), w = Math.floor(b.w), h = Math.floor(b.h);
  const groundTop = H - 48;

  // --- Atari-style bed: chunky solid blocks, limited palette ---

  // Bed legs (brown, thick rectangles)
  const legW = Math.max(8, Math.floor(w * 0.06));
  let legH = groundTop - (y + h); if(legH < 8) legH = 8;
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + legW, y + h, legW, legH);
  ctx.fillRect(x + w - legW * 2, y + h, legW, legH);

  // Headboard & footboard (darker brown, solid blocks)
  const boardW = Math.max(8, Math.floor(w * 0.06));
  const boardH = Math.max(10, Math.floor(h * 0.6));
  ctx.fillStyle = '#5C3317';
  ctx.fillRect(x, y - boardH, boardW, boardH + h + legH);
  ctx.fillRect(x + w - boardW, y - Math.floor(boardH * 0.5), boardW, Math.floor(boardH * 0.5) + h + legH);

  // Bed frame rail (solid brown bar under mattress)
  ctx.fillStyle = '#6B3A1F';
  ctx.fillRect(x, y + h - 4, w, Math.max(4, Math.floor(h * 0.15)));

  // Mattress (solid white/cream block)
  ctx.fillStyle = '#EEEECC';
  ctx.fillRect(x + boardW, y, w - boardW * 2, h);

  // Blanket (bold solid color, covers most of mattress)
  const blanketH = Math.max(8, Math.floor(h * 0.7));
  ctx.fillStyle = '#CC3333';
  ctx.fillRect(x + boardW, y, w - boardW * 2, blanketH);

  // Blanket stripe (one bold stripe across middle for retro detail)
  const stripeH = Math.max(4, Math.floor(blanketH * 0.25));
  ctx.fillStyle = '#FF6644';
  ctx.fillRect(x + boardW, y + Math.floor((blanketH - stripeH) / 2), w - boardW * 2, stripeH);

  // Pillow (small white block at head end)
  const pW = Math.max(16, Math.floor((w - boardW * 2) * 0.22));
  const pH = Math.max(8, Math.floor(h * 0.5));
  ctx.fillStyle = '#FFFFEE';
  ctx.fillRect(x + w - boardW - pW - 4, y + 2, pW, pH);

  ctx.restore();
}

function drawBoy(){
  const frame = sprite.frames[sprite.frameIndex] || null;
  if (frame) {
    ctx.save();
    ctx.translate(boy.x, boy.y);
    const tilt = Math.max(-0.25, Math.min(0.25, boy.vy / 20));
    ctx.rotate(tilt);
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frame, -boy.w / 2, -boy.h / 2, boy.w, boy.h);
    ctx.imageSmoothingEnabled = prev;
    ctx.restore();
  } else {
    // fallback simple shape
    ctx.save();
    ctx.translate(boy.x, boy.y);
    ctx.fillStyle = '#3366cc'; roundRect(ctx, -boy.w / 2, 6, boy.w, boy.h - 12, 6, true, false);
    ctx.fillStyle = '#ffcc88'; ctx.beginPath(); ctx.arc(0, -6, 12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function roundRect(ctx,x,y,w,h,r,fill,stroke){ if(r===undefined) r=6; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); if(fill) ctx.fill(); if(stroke) ctx.stroke(); }

function findBedUnder(){ for(const b of beds){ if(!b.active || b.alpha<0.2) continue; const top=b.y; const left=b.x-2; const right=b.x+b.w+2; const feetY = boy.y + boy.h/2 - (boy.feetOffset||0); if(feetY>=top-6 && feetY<=top+12){ if(boy.x>left && boy.x<right) return b; } } return null; }

const keys = {};
window.addEventListener('keydown', e=>{
  keys[e.key]=true;
  if(e.code==='Space'){
    if(e.repeat) return;
    e.preventDefault();
    if(boy.grounded && !gameOver){
      const bed = findBedUnder();
      boy.jumpedFromBed = bed ? bed.id : null;
      boy.vy = BOUNCE_V * SPACE_JUMP_MULT;
      boy.grounded = false;
      playBounce();
      sprite.frameIndex = (sprite.frameIndex + 1) % sprite.frames.length;
    }
  }
});
window.addEventListener('keyup', e=>{ keys[e.key]=false; });

// pointer handler for in-canvas restart
canvas.addEventListener('pointerdown', e=>{
  if(!gameOver || !gameOverButton) return;
  const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
  const cx = (e.clientX - rect.left) * scaleX; const cy = (e.clientY - rect.top) * scaleY;
  if(cx>=gameOverButton.x && cx<=gameOverButton.x+gameOverButton.w && cy>=gameOverButton.y && cy<=gameOverButton.y+gameOverButton.h){ reset(); }
});
canvas.addEventListener('pointermove', e=>{
  if(!gameOver || !gameOverButton){ canvas.style.cursor='default'; return; }
  const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
  const cx = (e.clientX - rect.left) * scaleX; const cy = (e.clientY - rect.top) * scaleY;
  if(cx>=gameOverButton.x && cx<=gameOverButton.x+gameOverButton.w && cy>=gameOverButton.y && cy<=gameOverButton.y+gameOverButton.h) canvas.style.cursor='pointer'; else canvas.style.cursor='default';
});

function updateBeds(dt){ for(const b of beds) if(!b.active && b.alpha>0){ b.alpha -= dt/600; if(b.alpha<0) b.alpha=0; } }

let removalCount = 0;
function removeRandomBed(){
  const active = beds.filter(b=>b.active);
  if(active.length===0) return;
  const idx = Math.floor(Math.random()*active.length);
  active[idx].active=false;
  playBedRemove();
  removalCount++;
  // Every 2nd removal, respawn a random inactive bed
  if(removalCount % 2 === 0){
    const inactive = beds.filter(b=>!b.active);
    if(inactive.length>0){
      const pick = inactive[Math.floor(Math.random()*inactive.length)];
      pick.active = true;
      pick.alpha = 1;
    }
  }
}

function physics(){
  if(keys.ArrowLeft && !keys.ArrowRight) boy.vx = -4; else if(keys.ArrowRight && !keys.ArrowLeft) boy.vx = 4; else { boy.vx *= 0.92; if(Math.abs(boy.vx)<0.05) boy.vx=0; }
  boy.x += boy.vx; if(boy.x < -80) boy.x = W + 80; if(boy.x > W + 80) boy.x = -80;
  if(!boy.grounded){ boy.vy += GRAV; boy.y += boy.vy; }
  const bed = findBedUnder(); if(bed){ const top = bed.y; const feetY = boy.y + boy.h/2 - (boy.feetOffset||0);
    if(boy.vy>0 && feetY >= top - 2){ boy.y = top - (boy.h/2 - (boy.feetOffset||0)) - 0.1; boy.vy=0; if(boy.jumpedFromBed != null && boy.jumpedFromBed !== bed.id){ score += 10; updateScore(); } boy.lastBed = bed.id; boy.jumpedFromBed = null; boy.grounded = true; }
    else if(boy.vy <= 0){ /* moving up and overlapping: ignore */ }
    else { boy.y = top - boy.h/2 - 0.1; boy.vy = 0; boy.grounded = true; }
  } else { boy.grounded = false; }
  if(boy.y - boy.h/2 > H) gameOver = true;
}

function draw(){ ctx.clearRect(0,0,W,H); drawBackground(); ctx.fillStyle='#7b5a3c'; ctx.fillRect(0,H-48,W,48); for(const b of beds) drawBed(b); drawBoy();
  // score (large, centered at top)
  ctx.save(); ctx.fillStyle='#fff'; ctx.font='bold 72px monospace'; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText(String(score), W / 2, 10); ctx.restore();
  // scanlines
  ctx.save(); ctx.globalCompositeOperation='overlay'; ctx.fillStyle='rgba(0,0,0,0.04)'; for(let y=0;y<H;y+=4) ctx.fillRect(0,y,W,1); ctx.restore(); // vignette
  ctx.save(); const vg = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)/6,W/2,H/2,Math.max(W,H)/1.1); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(0.75,'rgba(0,0,0,0.06)'); vg.addColorStop(1,'rgba(0,0,0,0.25)'); ctx.globalCompositeOperation='multiply'; ctx.fillStyle = vg; ctx.fillRect(0,0,W,H); ctx.restore();
}

function showGameOver(){
  // Full solid black overlay covering the entire canvas
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Game Over', W/2, H/2 - 30);
  ctx.font = '24px monospace';
  ctx.fillText(`Final score: ${score}`, W/2, H/2 + 10);
  ctx.restore();

  // draw in-canvas Restart button (unchanged)
  const btnW = Math.min(300, Math.floor(W * 0.18));
  const btnH = Math.min(64, Math.floor(H * 0.08));
  const bx = Math.round(W/2 - btnW/2);
  const by = Math.round(H/2 + 60);
  const r = 10;
  ctx.save();
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.lineTo(bx + btnW - r, by);
  ctx.quadraticCurveTo(bx + btnW, by, bx + btnW, by + r);
  ctx.lineTo(bx + btnW, by + btnH - r);
  ctx.quadraticCurveTo(bx + btnW, by + btnH, bx + btnW - r, by + btnH);
  ctx.lineTo(bx + r, by + btnH);
  ctx.quadraticCurveTo(bx, by + btnH, bx, by + btnH - r);
  ctx.lineTo(bx, by + r);
  ctx.quadraticCurveTo(bx, by, bx + r, by);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Restart', bx + btnW/2, by + btnH/2);
  ctx.restore();
  gameOverButton = { x: bx, y: by, w: btnW, h: btnH };
  playGameOver();
}

function loop(ts){ const dt = ts - lastTime; lastTime = ts; if(gameOver){ showGameOver(); return; } removeTimer += dt; if(removeTimer > removeInterval){ removeTimer = 0; removeRandomBed(); } physics(); updateBeds(dt); // sprite frame update
  if(ts - sprite.lastFrameTime > sprite.frameInterval){ sprite.frameIndex = (sprite.frameIndex + 1) % sprite.frames.length; sprite.lastFrameTime = ts; }
  draw(); requestAnimationFrame(loop);
}

// Audio helpers
let audioCtx;
function ensureAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playBounce(){ try{ ensureAudio(); const t = audioCtx.currentTime; const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type='square'; o.frequency.setValueAtTime(620,t); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.14,t+0.002); g.gain.exponentialRampToValueAtTime(0.0001,t+0.12); o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+0.14); }catch(e){ /* ignore audio errors */ } }
function playGameOver(){ try{ ensureAudio(); const t = audioCtx.currentTime; const freqs=[300,220,170]; freqs.forEach((f,i)=>{ const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type='square'; o.frequency.setValueAtTime(f,t+i*0.08); g.gain.setValueAtTime(0.0001,t+i*0.08); g.gain.linearRampToValueAtTime(0.18,t+i*0.08+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+i*0.08+0.28); o.connect(g); g.connect(audioCtx.destination); o.start(t+i*0.08); o.stop(t+i*0.08+0.32); }); }catch(e){ /* ignore audio errors */ } }
function playStart(){ try{ ensureAudio(); const t = audioCtx.currentTime; const o1=audioCtx.createOscillator(); const g1=audioCtx.createGain(); o1.type='square'; o1.frequency.setValueAtTime(440,t); g1.gain.setValueAtTime(0.0001,t); g1.gain.linearRampToValueAtTime(0.18,t+0.01); g1.gain.exponentialRampToValueAtTime(0.0001,t+0.16); const o2=audioCtx.createOscillator(); const g2=audioCtx.createGain(); o2.type='square'; o2.frequency.setValueAtTime(660,t+0.08); g2.gain.setValueAtTime(0.0001,t+0.08); g2.gain.linearRampToValueAtTime(0.14,t+0.09); g2.gain.exponentialRampToValueAtTime(0.0001,t+0.22); o1.connect(g1); g1.connect(audioCtx.destination); o2.connect(g2); g2.connect(audioCtx.destination); o1.start(t); o1.stop(t+0.16); o2.start(t+0.08); o2.stop(t+0.28); }catch(e){ /* ignore audio errors */ } }
function playBedRemove(){ try{ ensureAudio(); const t=audioCtx.currentTime; const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type='square'; o.frequency.setValueAtTime(920,t); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.12,t+0.002); g.gain.exponentialRampToValueAtTime(0.0001,t+0.12); o.frequency.exponentialRampToValueAtTime(320,t+0.12); o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+0.14); }catch(e){ /* ignore audio errors */ } }

// Title music helpers (kept minimal)
let _titleMusicInterval = null; let _titleMusicPlaying = false;
function playTitleMusic(){ if(_titleMusicPlaying) return; try{ ensureAudio(); _titleMusicPlaying = true; const pattern=[{f:523.25,d:0.6},{f:659.25,d:0.45},{f:783.99,d:0.45},{f:659.25,d:0.6},{f:523.25,d:1.0}]; const scheduleOnce = ()=>{ const start = audioCtx.currentTime + 0.02; let t = start; for(const note of pattern){ const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); const lf = audioCtx.createBiquadFilter(); o.type='square'; o.frequency.setValueAtTime(note.f,t); lf.type='lowpass'; lf.frequency.setValueAtTime(1200,t); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.06,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+note.d); o.connect(lf); lf.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+note.d+0.02); t+=note.d; } return t-start; }; const dur = scheduleOnce(); _titleMusicInterval = window.setInterval(()=>{ try{ scheduleOnce(); }catch(e){ console.debug(e); } }, Math.max(600, Math.floor(dur*1000))); }catch(e){ _titleMusicPlaying=false; } }
function stopTitleMusic(){ try{ if(_titleMusicInterval){ window.clearInterval(_titleMusicInterval); _titleMusicInterval=null; } }finally{ _titleMusicPlaying=false; } }

// Start flow
createSpriteFrames(); initBeds(); updateScore();
const titleScreen = document.getElementById('title-screen'); const startBtn = document.getElementById('start-btn');
function startGame(){ if(titleScreen) titleScreen.style.display='none'; if(canvas) canvas.style.visibility='visible'; const uiEl = document.getElementById('ui'); if(uiEl) uiEl.style.display='flex'; try{ stopTitleMusic(); }catch(e){ /* ignore */ } try{ if(startBtn && typeof startBtn.blur==='function') startBtn.blur(); if(canvas && typeof canvas.focus==='function') canvas.focus(); }catch(e){ /* ignore focus errors */ } playStart(); reset(); }
if(startBtn) startBtn.addEventListener('click', startGame);

// Try to resume audio or wait for gesture
function tryPlayTitleMusicWithGestureUnlock(){ try{ playTitleMusic(); return; }catch(e){ /* ignore */ } const unlock = ()=>{ try{ playTitleMusic(); }catch(err){ /* ignore */ } window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); }; window.addEventListener('pointerdown', unlock, {passive:true}); window.addEventListener('keydown', unlock, {passive:true}); }
// Only attempt to start title music if a title screen element exists.
// This prevents the title music from being triggered during gameplay.
try{
  const tsEl = document.getElementById('title-screen');
  if (tsEl) {
    ensureAudio();
    if (audioCtx && typeof audioCtx.resume === 'function'){
      audioCtx.resume().then(()=>{
        try{ playTitleMusic(); }catch(e){ tryPlayTitleMusicWithGestureUnlock(); }
      }).catch(()=>{ tryPlayTitleMusicWithGestureUnlock(); });
    } else {
      tryPlayTitleMusicWithGestureUnlock();
    }
  }
}catch(e){ /* ignore audio setup errors */ }

// expose restart DOM button as a fallback
if(restartBtn) restartBtn.addEventListener('click', ()=>{ reset(); });

// initial console hint
console.log('Mattress Hop ready — use Arrow keys to steer. Press Space to jump.');
