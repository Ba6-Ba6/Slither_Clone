import { clamp, angleDiff, lerpAngle, rand } from "../utils.js";

export class Snake {
  constructor({ id, name, type, x, y, angle, color, darkColor, config }) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.color = color;
    this.darkColor = darkColor;
    this.config = config;

    this.length = config.snake.startLength;
    if (type === "bot") this.length *= 0.85;

    this.thickness = 0;
    this.radius = config.snake.baseRadius;
    this.score = 0;
    this.alive = true;
    this.respawnTimer = 0;
    this.shotCooldown = rand(0, 0.5);
    this.growthMode = "balanced";

    this.vx = 0;
    this.vy = 0;
    this.spin = 0;

    this.input = {
      aimAngle: angle,
      left: false,
      right: false,
      boost: false,
      shoot: false,
      shotCharge: 0,
      growthMode: "balanced"
    };

    this.ai = {
      state: "eat",
      timer: 0,
      wanderAngle: angle,
      targetId: null,
      targetFoodId: null
    };

    this.points = [];
    const count = Math.ceil(this.length / config.snake.segmentSpacing);
    for (let i = 0; i < count; i++) {
      this.points.push({
        x: x - Math.cos(angle) * i * config.snake.segmentSpacing,
        y: y - Math.sin(angle) * i * config.snake.segmentSpacing
      });
    }
  }

  get head() {
    return this.points[0] || { x: this.x, y: this.y };
  }

  getSerializable() {
    const stride = this.points.length > 220 ? 4 : this.points.length > 140 ? 3 : this.points.length > 70 ? 2 : 1;
    const points = [];
    for (let i = 0; i < this.points.length; i += stride) {
      points.push({ x: Math.round(this.points[i].x), y: Math.round(this.points[i].y) });
    }

    return {
      id: this.id,
      name: this.name,
      type: this.type,
      x: Math.round(this.x),
      y: Math.round(this.y),
      angle: this.angle,
      radius: Math.round(this.radius * 10) / 10,
      length: Math.round(this.length),
      thickness: Math.round(this.thickness),
      score: Math.floor(this.score),
      alive: this.alive,
      color: this.color,
      darkColor: this.darkColor,
      aiState: this.ai.state,
      growthMode: this.growthMode,
      cooldown: Math.round(this.shotCooldown * 100) / 100,
      points
    };
  }

  setInput(input) {
    this.input.aimAngle = Number.isFinite(input.aimAngle) ? input.aimAngle : this.input.aimAngle;
    this.input.left = !!input.left;
    this.input.right = !!input.right;
    this.input.boost = !!input.boost;
    this.input.shoot = !!input.shoot;
    this.input.shotCharge = clamp(Number(input.shotCharge) || 0, 0, 1);

    if (["length", "balanced", "thick"].includes(input.growthMode)) {
      this.input.growthMode = input.growthMode;
      this.growthMode = input.growthMode;
    }
  }

  computeRadius() {
    const lengthExtra = Math.sqrt(Math.max(0, this.length - this.config.snake.startLength)) * this.config.snake.lengthRadiusGrowth;
    const thickExtra = Math.sqrt(Math.max(0, this.thickness)) * this.config.snake.thicknessRadiusGrowth;
    return clamp(this.config.snake.baseRadius + lengthExtra + thickExtra, this.config.snake.baseRadius, this.config.snake.maxRadius);
  }

  update(dt, game) {
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0 && this.type === "player") game.respawnSnake(this);
      return;
    }

    this.radius = this.computeRadius();
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);

    if (this.type === "bot") game.updateBotAI(this, dt);

    const desired = this.input.aimAngle;
    const turnLimit = this.config.snake.turnRate * (this.type === "bot" ? this.config.bots.turnRateMultiplier : 1) * dt;
    this.angle += clamp(angleDiff(this.angle, desired), -turnLimit, turnLimit);

    if (this.input.left) this.angle -= this.config.snake.turnRate * 0.75 * dt;
    if (this.input.right) this.angle += this.config.snake.turnRate * 0.75 * dt;

    this.angle += this.spin * dt;
    this.spin *= Math.pow(0.08, dt);

    const boosting = this.input.boost && this.length > this.config.snake.minLength + 80;
    const speedBase = this.type === "bot" ? this.config.snake.speed * this.config.bots.speedMultiplier : this.config.snake.speed;
    const scoreDrag = clamp(this.score * this.config.snake.scoreSlowdown, 0, 0.34);
    const radiusDrag = clamp((this.radius - this.config.snake.baseRadius) * this.config.snake.radiusSlowdown, 0, 0.22);
    const drag = 1 - scoreDrag - radiusDrag;
    const speed = (boosting ? this.config.snake.boostSpeed : speedBase) * clamp(drag, 0.48, 1);

    if (boosting) this.length -= this.config.snake.boostDrainPerSecond * dt;

    if (this.length > this.config.snake.softMaxLength) {
      this.length -= this.config.snake.passiveDecayAboveSoftCap * dt;
    }

    this.length = clamp(this.length, this.config.snake.minLength, this.config.snake.hardMaxLength);
    this.thickness = clamp(this.thickness, 0, 12000);

    this.vx *= Math.pow(0.035, dt);
    this.vy *= Math.pow(0.035, dt);

    this.x += (Math.cos(this.angle) * speed + this.vx) * dt;
    this.y += (Math.sin(this.angle) * speed + this.vy) * dt;

    this.points.unshift({ x: this.x, y: this.y });
    this.trimTail();

    if (this.input.shoot) {
      game.tryShoot(this, this.input.shotCharge);
      this.input.shoot = false;
      this.input.shotCharge = 0;
    }
  }

  trimTail() {
    let travelled = 0;
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1];
      const b = this.points[i];
      travelled += Math.hypot(a.x - b.x, a.y - b.y);

      if (travelled > this.length) {
        this.points.length = i + 1;
        break;
      }
    }
  }

  addLength(amount) {
    const mode = this.config.snake.growthModes[this.growthMode] || this.config.snake.growthModes.balanced;
    const fullness = clamp(this.length / this.config.snake.softMaxLength, 0, 1);
    const lengthScaling = 1 - fullness * 0.82;
    const lengthGain = amount * mode.length * lengthScaling;
    const thickGain = amount * mode.thickness * 3.2;

    this.length = clamp(this.length + lengthGain, this.config.snake.minLength, this.config.snake.hardMaxLength);
    this.thickness = clamp(this.thickness + thickGain, 0, 12000);
  }

  kill(secondsUntilRespawn) {
    this.alive = false;
    this.respawnTimer = secondsUntilRespawn;
    this.vx = 0;
    this.vy = 0;
    this.spin = 0;
  }

  applyProjectileHit(index, projectile, game) {
    if (!this.alive) return;

    const hitIndex = Math.max(5, Math.min(index, this.points.length - 1));
    const pconf = this.config.projectile;
    const dirX = Math.cos(projectile.angle);
    const dirY = Math.sin(projectile.angle);

    const resistance = 1 + this.radius * pconf.targetRadiusResistance + Math.sqrt(Math.max(0, this.score)) * pconf.targetScoreResistance;
    const impulse = (pconf.baseKnockback + pconf.chargeKnockback * projectile.charge) * projectile.power / resistance;

    this.vx += dirX * impulse * 2.2;
    this.vy += dirY * impulse * 2.2;
    this.spin += rand(-0.9, 0.9) * projectile.power / resistance;
    this.angle = lerpAngle(this.angle, projectile.angle + rand(-0.7, 0.7), 0.18 * projectile.power / resistance);

    const segmentCount = Math.min(this.points.length - hitIndex, Math.floor(pconf.segmentFlingLength * (0.8 + projectile.charge * 1.3)));
    const maxOffset = impulse * 0.72;

    for (let i = hitIndex; i < hitIndex + segmentCount && i < this.points.length; i++) {
      const local = (i - hitIndex) / Math.max(1, segmentCount);
      const taper = Math.sin(local * Math.PI);
      const side = (Math.random() - 0.5) * impulse * 0.18 * taper;
      const sideX = -dirY;
      const sideY = dirX;
      this.points[i].x += dirX * maxOffset * taper + sideX * side;
      this.points[i].y += dirY * maxOffset * taper + sideY * side;
    }

    const lostThickness = Math.min(this.thickness * 0.08, 22 + projectile.charge * 55);
    this.thickness = Math.max(0, this.thickness - lostThickness);

    const looseCount = Math.floor(rand(pconf.looseFoodMin, pconf.looseFoodMax + projectile.charge * 8));
    for (let n = 0; n < looseCount; n++) {
      const sample = this.points[Math.min(this.points.length - 1, hitIndex + Math.floor(rand(0, Math.max(1, segmentCount))))];
      if (!sample) continue;
      game.spawnFoodAt(
        sample.x + dirX * rand(20, 100) + rand(-35, 35),
        sample.y + dirY * rand(20, 100) + rand(-35, 35),
        this.color,
        true
      );
    }
  }
}
