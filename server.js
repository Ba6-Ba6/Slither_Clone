'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.status(200).send('ok'));

const WORLD = {
  width: 3600,
  height: 2400,
  padding: 50
};

const TICK_RATE = 30;
const STATE_RATE = 20;
const DT = 1 / TICK_RATE;

const SETTINGS = {
  maxPlayers: 12,
  maxFood: 380,
  baseSpeed: 175,
  boostSpeed: 260,
  turnSpeed: 3.25,
  segmentSpacing: 8,
  startLength: 260,
  minBoostLength: 150,
  boostDrainPerSecond: 55,
  foodGrowth: 32,
  foodScore: 10,
  baseRadius: 13,
  maxRadius: 28,
  collisionSkipSegments: 10,
  respawnSeconds: 3,
  cellSize: 160
};

const players = new Map();
let food = [];
let bodyGrid = new Map();
let nextFoodId = 1;

function nowSeconds() {
  return Date.now() / 1000;
}

function id() {
  return Math.random().toString(36).slice(2, 10);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleDiff(a, b) {
  return ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

function safeSpawnPoint() {
  for (let attempt = 0; attempt < 80; attempt++) {
    const p = {
      x: rand(WORLD.padding + 120, WORLD.width - WORLD.padding - 120),
      y: rand(WORLD.padding + 120, WORLD.height - WORLD.padding - 120)
    };

    let clear = true;
    for (const player of players.values()) {
      if (!player.alive) continue;
      if (distance(p, player.head()) < 360) {
        clear = false;
        break;
      }
    }

    if (clear) return p;
  }

  return {
    x: WORLD.width / 2 + rand(-300, 300),
    y: WORLD.height / 2 + rand(-200, 200)
  };
}

function makePlayer(socket) {
  const spawn = safeSpawnPoint();
  const angle = rand(0, Math.PI * 2);
  const playerId = id();
  const hue = Math.floor(rand(0, 360));
  const colour = `hsl(${hue}, 90%, 62%)`;
  const darkColour = `hsl(${hue}, 80%, 34%)`;

  const player = {
    id: playerId,
    socket,
    name: `Player ${players.size + 1}`,
    x: spawn.x,
    y: spawn.y,
    angle,
    colour,
    darkColour,
    score: 0,
    length: SETTINGS.startLength,
    radius: SETTINGS.baseRadius,
    alive: true,
    respawnAt: 0,
    input: { left: false, right: false, boost: false },
    points: [],
    head() {
      return this.points[0] || { x: this.x, y: this.y };
    }
  };

  for (let i = 0; i < 40; i++) {
    player.points.push({
      x: spawn.x - Math.cos(angle) * i * SETTINGS.segmentSpacing,
      y: spawn.y - Math.sin(angle) * i * SETTINGS.segmentSpacing
    });
  }

  return player;
}

function respawnPlayer(player) {
  const spawn = safeSpawnPoint();
  player.x = spawn.x;
  player.y = spawn.y;
  player.angle = rand(0, Math.PI * 2);
  player.length = SETTINGS.startLength;
  player.radius = SETTINGS.baseRadius;
  player.alive = true;
  player.input.left = false;
  player.input.right = false;
  player.input.boost = false;
  player.points = [];

  for (let i = 0; i < 40; i++) {
    player.points.push({
      x: spawn.x - Math.cos(player.angle) * i * SETTINGS.segmentSpacing,
      y: spawn.y - Math.sin(player.angle) * i * SETTINGS.segmentSpacing
    });
  }
}

function spawnFood(x = null, y = null, value = 1) {
  food.push({
    id: nextFoodId++,
    x: x ?? rand(WORLD.padding + 40, WORLD.width - WORLD.padding - 40),
    y: y ?? rand(WORLD.padding + 40, WORLD.height - WORLD.padding - 40),
    r: rand(4, 8),
    value,
    hue: Math.floor(rand(0, 360))
  });
}

function maintainFood() {
  while (food.length < SETTINGS.maxFood) spawnFood();
}

function killPlayer(player, killer = null) {
  if (!player.alive) return;

  player.alive = false;
  player.respawnAt = nowSeconds() + SETTINGS.respawnSeconds;

  for (let i = 0; i < player.points.length; i += 3) {
    const p = player.points[i];
    spawnFood(p.x + rand(-10, 10), p.y + rand(-10, 10), 1.5);
  }

  if (killer && killer !== player && killer.alive) {
    killer.score += 100;
    killer.length += 45;
  }
}

function computeRadius(player) {
  const extra = Math.sqrt(Math.max(0, player.length - SETTINGS.startLength)) * 0.32;
  return clamp(SETTINGS.baseRadius + extra, SETTINGS.baseRadius, SETTINGS.maxRadius);
}

function trimTail(player) {
  let travelled = 0;

  for (let i = 1; i < player.points.length; i++) {
    travelled += distance(player.points[i - 1], player.points[i]);

    if (travelled > player.length) {
      player.points.length = i + 1;
      return;
    }
  }
}

function updatePlayer(player, dt) {
  if (!player.alive) {
    if (nowSeconds() >= player.respawnAt) respawnPlayer(player);
    return;
  }

  if (player.input.left && !player.input.right) player.angle -= SETTINGS.turnSpeed * dt;
  if (player.input.right && !player.input.left) player.angle += SETTINGS.turnSpeed * dt;

  player.radius = computeRadius(player);

  let speed = SETTINGS.baseSpeed;
  if (player.input.boost && player.length > SETTINGS.minBoostLength) {
    speed = SETTINGS.boostSpeed;
    player.length -= SETTINGS.boostDrainPerSecond * dt;
  }

  player.x += Math.cos(player.angle) * speed * dt;
  player.y += Math.sin(player.angle) * speed * dt;
  player.points.unshift({ x: player.x, y: player.y });
  trimTail(player);

  if (
    player.x < WORLD.padding ||
    player.y < WORLD.padding ||
    player.x > WORLD.width - WORLD.padding ||
    player.y > WORLD.height - WORLD.padding
  ) {
    killPlayer(player);
  }
}

function cellKey(cx, cy) {
  return `${cx},${cy}`;
}

function cellFor(x, y) {
  return {
    cx: Math.floor(x / SETTINGS.cellSize),
    cy: Math.floor(y / SETTINGS.cellSize)
  };
}

function gridInsert(grid, x, y, item) {
  const c = cellFor(x, y);
  const key = cellKey(c.cx, c.cy);
  let bucket = grid.get(key);
  if (!bucket) {
    bucket = [];
    grid.set(key, bucket);
  }
  bucket.push(item);
}

function gridQuery(grid, x, y, radius) {
  const minCx = Math.floor((x - radius) / SETTINGS.cellSize);
  const maxCx = Math.floor((x + radius) / SETTINGS.cellSize);
  const minCy = Math.floor((y - radius) / SETTINGS.cellSize);
  const maxCy = Math.floor((y + radius) / SETTINGS.cellSize);
  const results = [];

  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const bucket = grid.get(cellKey(cx, cy));
      if (bucket) results.push(...bucket);
    }
  }

  return results;
}

function rebuildBodyGrid() {
  bodyGrid = new Map();

  for (const owner of players.values()) {
    if (!owner.alive) continue;

    for (let i = SETTINGS.collisionSkipSegments; i < owner.points.length; i += 4) {
      const p = owner.points[i];
      gridInsert(bodyGrid, p.x, p.y, {
        owner,
        index: i,
        x: p.x,
        y: p.y,
        radius: owner.radius
      });
    }
  }
}

function handleFood() {
  const eatenIds = new Set();

  for (const player of players.values()) {
    if (!player.alive) continue;

    const head = player.head();
    const eatRadius = player.radius + 20;

    for (const f of food) {
      if (eatenIds.has(f.id)) continue;
      if (Math.hypot(head.x - f.x, head.y - f.y) < eatRadius + f.r) {
        eatenIds.add(f.id);
        player.length += SETTINGS.foodGrowth * f.value;
        player.score += SETTINGS.foodScore * f.value;
      }
    }
  }

  if (eatenIds.size) {
    food = food.filter(f => !eatenIds.has(f.id));
  }
}

function handleCollisions() {
  rebuildBodyGrid();

  for (const player of players.values()) {
    if (!player.alive) continue;

    const head = player.head();
    const nearby = gridQuery(bodyGrid, head.x, head.y, player.radius + SETTINGS.maxRadius + 20);

    for (const b of nearby) {
      if (b.owner === player) continue; // Players can pass through themselves.
      if (!b.owner.alive) continue;

      const hitDistance = player.radius + b.radius * 0.78;
      if (Math.hypot(head.x - b.x, head.y - b.y) < hitDistance) {
        killPlayer(player, b.owner);
        break;
      }
    }
  }
}

function gameTick() {
  for (const player of players.values()) updatePlayer(player, DT);
  handleFood();
  handleCollisions();
  maintainFood();
}

function publicState() {
  return {
    type: 'state',
    world: WORLD,
    players: [...players.values()].map(p => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      angle: p.angle,
      colour: p.colour,
      darkColour: p.darkColour,
      score: Math.floor(p.score),
      length: Math.floor(p.length),
      radius: p.radius,
      alive: p.alive,
      respawnIn: p.alive ? 0 : Math.max(0, p.respawnAt - nowSeconds()),
      points: p.points.filter((_, i) => i % 2 === 0)
    })),
    food: food.map(f => ({ id: f.id, x: f.x, y: f.y, r: f.r, hue: f.hue }))
  };
}

function broadcastState() {
  const packet = JSON.stringify(publicState());
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(packet);
  }
}

wss.on('connection', socket => {
  if (players.size >= SETTINGS.maxPlayers) {
    socket.send(JSON.stringify({ type: 'full', message: 'Server is full.' }));
    socket.close();
    return;
  }

  const player = makePlayer(socket);
  players.set(player.id, player);

  socket.send(JSON.stringify({
    type: 'init',
    id: player.id,
    world: WORLD,
    settings: {
      tickRate: TICK_RATE,
      stateRate: STATE_RATE
    }
  }));

  socket.on('message', raw => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'input') {
      player.input.left = !!msg.left;
      player.input.right = !!msg.right;
      player.input.boost = !!msg.boost;
    }

    if (msg.type === 'name') {
      const clean = String(msg.name || '').trim().slice(0, 18);
      if (clean) player.name = clean;
    }
  });

  socket.on('close', () => {
    players.delete(player.id);
  });
});

maintainFood();
setInterval(gameTick, 1000 / TICK_RATE);
setInterval(broadcastState, 1000 / STATE_RATE);

server.listen(PORT, () => {
  console.log(`Slither Online Lite running on port ${PORT}`);
});
