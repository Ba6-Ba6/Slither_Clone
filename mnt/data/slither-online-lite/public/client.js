'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const playersEl = document.getElementById('players');
const leaderboardEl = document.getElementById('leaderboard');
const nameInput = document.getElementById('nameInput');
const nameButton = document.getElementById('nameButton');

let W = innerWidth;
let H = innerHeight;
let dpr = 1;
let myId = null;
let world = { width: 3600, height: 2400, padding: 50 };
let state = { players: [], food: [] };
let connected = false;
let camera = { x: world.width / 2, y: world.height / 2, scale: 1 };

const keys = new Set();

function resize() {
  W = innerWidth;
  H = innerHeight;
  dpr = Math.max(1, Math.min(2, devicePixelRatio || 1));
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

addEventListener('resize', resize);
resize();

addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  keys.add(event.key.toLowerCase());
});

addEventListener('keyup', event => {
  keys.delete(event.key.toLowerCase());
});

const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
const socket = new WebSocket(protocol + location.host);

socket.addEventListener('open', () => {
  connected = true;
  statusEl.textContent = 'Connected';
});

socket.addEventListener('close', () => {
  connected = false;
  statusEl.textContent = 'Disconnected. Refresh to reconnect.';
});

socket.addEventListener('message', event => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'init') {
    myId = msg.id;
    world = msg.world;
  }

  if (msg.type === 'full') {
    statusEl.textContent = msg.message;
  }

  if (msg.type === 'state') {
    state = msg;
    world = msg.world;
    updateHud();
  }
});

nameButton.addEventListener('click', sendName);
nameInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') sendName();
});

function sendName() {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: 'name', name: nameInput.value }));
  nameInput.blur();
}

setInterval(() => {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify({
    type: 'input',
    left: keys.has('a') || keys.has('arrowleft'),
    right: keys.has('d') || keys.has('arrowright'),
    boost: keys.has('w') || keys.has('arrowup')
  }));
}, 1000 / 30);

function me() {
  return state.players.find(p => p.id === myId);
}

function updateHud() {
  const self = me();
  scoreEl.textContent = 'Score: ' + (self ? self.score : 0);
  playersEl.textContent = 'Players: ' + state.players.length;

  const sorted = [...state.players].sort((a, b) => b.score - a.score).slice(0, 8);
  leaderboardEl.innerHTML = '<strong>Leaderboard</strong><br>' + sorted.map((p, i) => {
    const marker = p.id === myId ? ' •' : '';
    const dead = p.alive ? '' : ' (respawn)';
    return `${i + 1}. ${escapeHtml(p.name)}${marker}: ${p.score}${dead}`;
  }).join('<br>');
}

function escapeHtml(text) {
  return String(text).replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[c]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function updateCamera() {
  const self = me();
  const target = self || state.players[0];
  if (!target) return;

  const targetScale = Math.max(0.55, Math.min(1.05, Math.min(W / 1100, H / 850)));
  camera.x = lerp(camera.x, target.x, 0.09);
  camera.y = lerp(camera.y, target.y, 0.09);
  camera.scale = lerp(camera.scale, targetScale, 0.05);
}

function worldToScreenStart() {
  ctx.translate(W / 2, H / 2);
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(-camera.x, -camera.y);
}

function drawArena() {
  ctx.fillStyle = '#071022';
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;

  const grid = 160;
  for (let x = 0; x <= world.width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }

  for (let y = 0; y <= world.height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 6;
  ctx.strokeRect(world.padding, world.padding, world.width - world.padding * 2, world.height - world.padding * 2);
}

function drawFood() {
  for (const f of state.food) {
    ctx.fillStyle = `hsl(${f.hue}, 95%, 65%)`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSnake(p) {
  if (!p.points || p.points.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = p.alive ? 1 : 0.32;

  ctx.strokeStyle = p.colour;
  ctx.lineWidth = p.radius * 2;
  ctx.beginPath();

  for (let i = p.points.length - 1; i >= 0; i--) {
    const point = p.points[i];
    if (i === p.points.length - 1) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }

  ctx.stroke();

  ctx.strokeStyle = p.darkColour;
  ctx.lineWidth = Math.max(2, p.radius * 0.55);
  ctx.beginPath();

  for (let i = p.points.length - 1; i >= 0; i--) {
    const point = p.points[i];
    if (i === p.points.length - 1) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }

  ctx.stroke();

  const head = p.points[0];
  ctx.fillStyle = p.colour;
  ctx.beginPath();
  ctx.arc(head.x, head.y, p.radius * 1.1, 0, Math.PI * 2);
  ctx.fill();

  const forward = { x: Math.cos(p.angle), y: Math.sin(p.angle) };
  const side = { x: -Math.sin(p.angle), y: Math.cos(p.angle) };
  const eyeForward = p.radius * 0.52;
  const eyeSide = p.radius * 0.45;
  const eyeR = Math.max(3, Math.min(5, p.radius * 0.22));

  const e1 = {
    x: head.x + forward.x * eyeForward + side.x * eyeSide,
    y: head.y + forward.y * eyeForward + side.y * eyeSide
  };
  const e2 = {
    x: head.x + forward.x * eyeForward - side.x * eyeSide,
    y: head.y + forward.y * eyeForward - side.y * eyeSide
  };

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(e1.x, e1.y, eyeR, 0, Math.PI * 2);
  ctx.arc(e2.x, e2.y, eyeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(e1.x + forward.x * 1.3, e1.y + forward.y * 1.3, eyeR * 0.45, 0, Math.PI * 2);
  ctx.arc(e2.x + forward.x * 1.3, e2.y + forward.y * 1.3, eyeR * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = `${Math.max(13, p.radius)}px Arial`;
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.9;
  ctx.fillText(p.name, head.x, head.y - p.radius * 2.1);

  if (!p.alive) {
    ctx.fillText(`Respawn ${p.respawnIn.toFixed(1)}`, head.x, head.y + p.radius * 2.6);
  }

  ctx.restore();
}

function drawMinimap() {
  const size = 165;
  const mapH = size * world.height / world.width;
  const x = W - size - 14;
  const y = H - mapH - 14;
  const sx = size / world.width;
  const sy = mapH / world.height;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  ctx.fillRect(x, y, size, mapH);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.strokeRect(x, y, size, mapH);

  for (const p of state.players) {
    if (!p.alive) continue;
    ctx.fillStyle = p.id === myId ? '#ffffff' : p.colour;
    ctx.beginPath();
    ctx.arc(x + p.x * sx, y + p.y * sy, p.id === myId ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#050812';
  ctx.fillRect(0, 0, W, H);

  updateCamera();

  ctx.save();
  worldToScreenStart();
  drawArena();
  drawFood();

  const sorted = [...state.players].sort((a, b) => (a.id === myId ? 1 : 0) - (b.id === myId ? 1 : 0));
  for (const p of sorted) drawSnake(p);

  ctx.restore();
  drawMinimap();

  if (!connected) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'white';
    ctx.font = '28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Connecting...', W / 2, H / 2);
  }

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
