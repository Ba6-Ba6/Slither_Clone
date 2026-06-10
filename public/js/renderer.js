export class Renderer {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.camera = camera;
    this.width = innerWidth;
    this.height = innerHeight;
    this.dpr = 1;
    this.smoothSnakes = new Map();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.width = innerWidth;
    this.height = innerHeight;
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clear() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, this.width, this.height);
    g.addColorStop(0, "#050812");
    g.addColorStop(0.55, "#071023");
    g.addColorStop(1, "#040611");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  render(state, myId, input = null) {
    this.clear();
    if (!state) {
      this.drawEmptyBackdrop();
      return;
    }

    const visualState = this.smoothState(state);
    const me = visualState.snakes.find(s => s.id === myId);
    if (me) this.camera.follow(me, 1 / 60);

    this.ctx.save();
    this.applyCamera();
    this.drawWorld(visualState.world);
    this.drawFood(visualState.food);
    this.drawProjectiles(visualState.projectiles);
    for (const snake of visualState.snakes) this.drawSnake(snake, snake.id === myId);
    this.ctx.restore();

    this.drawMinimap(visualState, myId);
    this.drawHUD(visualState, myId, input);
    if (me && !me.alive) this.drawDeathNotice();
  }

  smoothState(state) {
    const liveIds = new Set(state.snakes.map(s => s.id));
    for (const id of this.smoothSnakes.keys()) {
      if (!liveIds.has(id)) this.smoothSnakes.delete(id);
    }

    const snakes = state.snakes.map(target => {
      const prev = this.smoothSnakes.get(target.id);
      if (!prev || !prev.points?.length || prev.points.length !== target.points.length || !target.alive) {
        const copy = structuredClone(target);
        this.smoothSnakes.set(target.id, copy);
        return copy;
      }

      const a = 0.34;
      const sm = {
        ...target,
        x: lerp(prev.x, target.x, a),
        y: lerp(prev.y, target.y, a),
        angle: lerpAngle(prev.angle, target.angle, a),
        radius: lerp(prev.radius, target.radius, a),
        points: target.points.map((p, i) => {
          const q = prev.points[i] || p;
          return { x: lerp(q.x, p.x, a), y: lerp(q.y, p.y, a) };
        })
      };
      this.smoothSnakes.set(target.id, structuredClone(sm));
      return sm;
    });

    return { ...state, snakes };
  }

  applyCamera() {
    const ctx = this.ctx;
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.camera.scale, this.camera.scale);
    ctx.translate(-this.camera.x, -this.camera.y);
  }

  drawEmptyBackdrop() {
    const ctx = this.ctx;
    ctx.fillStyle = "#071022";
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawWorld(world) {
    const ctx = this.ctx;
    ctx.fillStyle = "#071022";
    ctx.fillRect(0, 0, world.width, world.height);

    const view = this.getViewBounds(80);
    const grid = 360;
    ctx.strokeStyle = "rgba(255,255,255,0.032)";
    ctx.lineWidth = 1;

    const startX = Math.max(0, Math.floor(view.left / grid) * grid);
    const endX = Math.min(world.width, Math.ceil(view.right / grid) * grid);
    const startY = Math.max(0, Math.floor(view.top / grid) * grid);
    const endY = Math.min(world.height, Math.ceil(view.bottom / grid) * grid);

    ctx.beginPath();
    for (let x = startX; x <= endX; x += grid) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += grid) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(160,190,255,0.42)";
    ctx.lineWidth = 9;
    ctx.strokeRect(world.padding, world.padding, world.width - world.padding * 2, world.height - world.padding * 2);
  }

  drawFood(food) {
    const ctx = this.ctx;
    const view = this.getViewBounds(120);
    for (const f of food) {
      if (f.x < view.left || f.x > view.right || f.y < view.top || f.y > view.bottom) continue;
      ctx.fillStyle = f.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawProjectiles(projectiles) {
    const ctx = this.ctx;
    for (const p of projectiles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.22 + (p.charge || 0) * 0.16;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (2.1 + (p.charge || 0) * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawSnake(snake, isMe) {
    const ctx = this.ctx;
    if (!snake.points || snake.points.length < 2) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = snake.alive ? 1 : 0.28;

    const view = this.getViewBounds(300);
    const head = snake.points[0];
    if (head.x < view.left || head.x > view.right || head.y < view.top || head.y > view.bottom) {
      // Still draw if a huge snake body might cross the screen, but skip small faraway snakes.
      if (snake.radius < 24) { ctx.restore(); return; }
    }

    ctx.strokeStyle = snake.color;
    ctx.lineWidth = snake.radius * 2;
    ctx.beginPath();
    for (let i = snake.points.length - 1; i >= 0; i--) {
      const p = snake.points[i];
      if (i === snake.points.length - 1) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    ctx.strokeStyle = snake.darkColor || snake.color;
    ctx.lineWidth = Math.max(2, snake.radius * 0.50);
    ctx.beginPath();
    for (let i = snake.points.length - 1; i >= 0; i--) {
      const p = snake.points[i];
      if (i === snake.points.length - 1) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    this.drawHead(snake, isMe);

    if (snake.type === "bot") this.drawBotRing(snake);
    this.drawName(snake);

    ctx.restore();
  }

  drawHead(snake, isMe) {
    const ctx = this.ctx;
    const h = snake.points[0];
    const r = snake.radius;

    ctx.fillStyle = snake.color;
    ctx.beginPath();
    ctx.arc(h.x, h.y, r * 1.13, 0, Math.PI * 2);
    ctx.fill();

    if (isMe) {
      ctx.strokeStyle = "rgba(255,255,255,0.78)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.x, h.y, r * 1.55, 0, Math.PI * 2);
      ctx.stroke();
    }

    const forward = { x: Math.cos(snake.angle), y: Math.sin(snake.angle) };
    const side = { x: -Math.sin(snake.angle), y: Math.cos(snake.angle) };
    const eyeR = Math.max(2.8, Math.min(6.2, r * 0.22));
    const eyeForward = r * 0.55;
    const eyeSide = r * 0.46;

    const eyes = [
      { x: h.x + forward.x * eyeForward + side.x * eyeSide, y: h.y + forward.y * eyeForward + side.y * eyeSide },
      { x: h.x + forward.x * eyeForward - side.x * eyeSide, y: h.y + forward.y * eyeForward - side.y * eyeSide }
    ];

    ctx.fillStyle = "white";
    ctx.beginPath();
    for (const e of eyes) ctx.arc(e.x, e.y, eyeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111";
    ctx.beginPath();
    for (const e of eyes) ctx.arc(e.x + forward.x * 1.6, e.y + forward.y * 1.6, eyeR * 0.48, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBotRing(snake) {
    const ctx = this.ctx;
    const h = snake.points[0];
    let color = "rgba(120,255,150,0.38)";
    if (snake.aiState === "attack") color = "rgba(255,100,100,0.52)";
    if (snake.aiState === "defend") color = "rgba(100,170,255,0.52)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x, h.y, snake.radius * 1.7, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawName(snake) {
    const ctx = this.ctx;
    const h = snake.points[0];
    ctx.font = `${Math.max(12, Math.min(22, snake.radius * 0.72))}px Arial`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.84)";
    ctx.fillText(snake.name, h.x, h.y - snake.radius * 2.25);
  }

  drawMinimap(state, myId) {
    const ctx = this.ctx;
    const size = 190;
    const mapH = size * state.world.height / state.world.width;
    const x = 14;
    const y = this.height - mapH - 14;
    const sx = size / state.world.width;
    const sy = mapH / state.world.height;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    ctx.fillRect(x, y, size, mapH);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.strokeRect(x, y, size, mapH);

    ctx.fillStyle = "rgba(255,255,255,0.14)";
    for (let i = 0; i < state.food.length; i += 28) {
      const f = state.food[i];
      ctx.fillRect(x + f.x * sx, y + f.y * sy, 1.1, 1.1);
    }

    for (const s of state.snakes) {
      if (!s.alive) continue;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(x + s.x * sx, y + s.y * sy, s.id === myId ? 4 : 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "10px Arial";
    ctx.textAlign = "left";
    ctx.fillText("MAP", x + 7, y + 14);
    ctx.restore();
  }

  drawHUD(state, myId, input) {
    const me = state.snakes.find(s => s.id === myId);
    if (!me) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(this.width / 2 - 185, this.height - 55, 370, 38);

    const charge = input?.getChargeFraction?.() || 0;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(this.width / 2 - 172, this.height - 43, 160, 14);
    ctx.fillStyle = charge > 0.66 ? "#ff7070" : charge > 0.25 ? "#ffd45c" : "#7ee8ff";
    ctx.fillRect(this.width / 2 - 172, this.height - 43, 160 * charge, 14);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.strokeRect(this.width / 2 - 172, this.height - 43, 160, 14);

    const mode = me.growthMode || "balanced";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Shot charge`, this.width / 2 - 172, this.height - 47);
    ctx.fillText(`Growth: ${mode}  [1 length · 2 balanced · 3 thick]`, this.width / 2 + 2, this.height - 32);
    ctx.restore();
  }

  drawDeathNotice() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(this.width / 2 - 150, this.height / 2 - 24, 300, 48);
    ctx.fillStyle = "white";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("You died. Respawning...", this.width / 2, this.height / 2 + 6);
    ctx.restore();
  }

  getViewBounds(padding = 0) {
    const inv = 1 / this.camera.scale;
    return {
      left: this.camera.x - this.width * 0.5 * inv - padding,
      right: this.camera.x + this.width * 0.5 * inv + padding,
      top: this.camera.y - this.height * 0.5 * inv - padding,
      bottom: this.camera.y + this.height * 0.5 * inv + padding
    };
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
}
