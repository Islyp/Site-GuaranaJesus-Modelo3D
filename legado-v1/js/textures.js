import * as THREE from 'three';

// Rótulo da lata desenhado em canvas (proporção ≈ circunferência / altura do corpo)
export function createLabelTexture(renderer) {
  const W = 2048;
  const H = 896;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Fundo rosa com leve variação vertical
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#f8479a');
  bg.addColorStop(0.45, '#ec1e79');
  bg.addColorStop(1, '#c0126a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Ondas decorativas ao redor da lata
  const wave = (y, amp, freq, phase, color, width) => {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const yy = y + Math.sin((x / W) * Math.PI * 2 * freq + phase) * amp;
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  wave(640, 40, 4, 0.4, 'rgba(255,255,255,0.16)', 70);
  wave(700, 34, 4, 1.2, 'rgba(255,210,230,0.22)', 18);
  wave(160, 26, 6, 2.1, 'rgba(255,255,255,0.10)', 40);

  // Faixa inferior vinho com texto corrido
  ctx.fillStyle = '#4a0b27';
  ctx.fillRect(0, H - 96, W, 96);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, H - 104, W, 8);
  ctx.fillRect(0, 22, W, 6);

  ctx.font = '700 30px Outfit, sans-serif';
  ctx.fillStyle = '#ffd3e6';
  ctx.textBaseline = 'middle';
  const band = 'GUARANÁ JESUS  ✦  DESDE 1920  ✦  SÃO LUÍS · MARANHÃO  ✦  ';
  const spaced = (t) => t.split('').join(' ');
  const bandText = spaced(band);
  const bandW = ctx.measureText(bandText).width;
  const reps = Math.max(1, Math.round(W / bandW));
  for (let i = 0; i < reps; i++) ctx.fillText(bandText, (i * W) / reps, H - 48);

  // Frente e verso (duas marcas, uma de cada lado)
  [W * 0.25, W * 0.75].forEach((cx) => drawFace(ctx, cx));

  // Laterais: informações
  [0, W * 0.5, W].forEach((cx) => drawSide(ctx, cx));

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function drawFace(ctx, cx) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // "GUARANÁ"
  ctx.font = '700 58px Outfit, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.letterSpacing = '22px';
  ctx.fillText('GUARANÁ', cx + 11, 180);
  ctx.letterSpacing = '0px';

  // Marca "Jesus" em script com sombra
  ctx.font = '250px Pacifico, cursive';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#4a0b27';
  ctx.fillText('Jesus', cx + 10, 462);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 20;
  ctx.strokeText('Jesus', cx, 450);
  ctx.fillStyle = '#ec1e79';
  ctx.fillText('Jesus', cx, 450);

  // Slogan
  ctx.font = 'italic 500 54px Fraunces, Georgia, serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('o sonho cor-de-rosa', cx, 560);

  // Frutos de guaraná
  drawGuarana(ctx, cx - 345, 610, 40);
  drawGuarana(ctx, cx - 400, 660, 30);
  drawGuarana(ctx, cx + 350, 620, 36);

  // Volume
  ctx.font = '700 38px Outfit, sans-serif';
  ctx.fillStyle = '#ffd3e6';
  ctx.fillText('350 ml', cx, 745);
  ctx.restore();
}

function drawGuarana(ctx, x, y, r) {
  ctx.save();
  // Folha
  ctx.fillStyle = '#2f8f4e';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.9, y - r * 0.9, r * 0.9, r * 0.35, -0.7, 0, Math.PI * 2);
  ctx.fill();
  // Casca vermelha
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#ff4a4a');
  g.addColorStop(1, '#a00d1f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // Polpa branca + semente
  ctx.fillStyle = '#fffaf2';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.1, r * 0.62, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b0d0d';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.1, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x - r * 0.1, y - r * 0.02, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSide(ctx, cx) {
  ctx.save();
  ctx.translate(cx, 420);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '700 26px Outfit, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('REFRIGERANTE', 0, -80);
  ctx.fillText('DE GUARANÁ', 0, -46);
  ctx.letterSpacing = '0px';
  ctx.font = '500 22px Outfit, sans-serif';
  ctx.fillStyle = 'rgba(255,211,230,0.95)';
  ctx.fillText('Sirva gelado', 0, 10);
  // Símbolo de reciclagem simplificado
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 90, 30, 0.3, Math.PI * 2 - 0.3);
  ctx.stroke();
  ctx.font = '700 18px Outfit, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('ALU', 0, 97);
  ctx.restore();
}

// Mapa de relevo com gotas de condensação ("lata gelada")
export function createDropletsTexture() {
  const W = 1024;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const drop = (x, y, rx, ry) => {
    const g = ctx.createRadialGradient(x, y - ry * 0.2, 0, x, y, Math.max(rx, ry));
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.7, 'rgba(200,200,200,0.8)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  // Névoa fina
  for (let i = 0; i < 2600; i++) {
    const r = 0.8 + rand() * 2;
    drop(rand() * W, rand() * H, r, r);
  }
  // Gotas maiores, algumas escorrendo
  for (let i = 0; i < 180; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 3 + rand() * 7;
    drop(x, y, r, r * (1 + rand() * 0.4));
    if (rand() < 0.18) {
      const len = 20 + rand() * 60;
      ctx.fillStyle = 'rgba(210,210,210,0.55)';
      ctx.fillRect(x - r * 0.25, y, r * 0.5, len);
      drop(x, y + len, r * 0.8, r);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

// Sprite circular para as bolhas
export function createBubbleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.0)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  g.addColorStop(0.85, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(22, 22, 5, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
