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

    this.radius = config.snake.baseRadius;
    this.score = 0;
    this.alive = true;
    this.respawnTimer = 0;
    this.shotCooldown = rand(0, 0.5);

    this.input = {
      aimAngle: angle,
      left: false,
      right: false,
      boost: false,
      shoot: false
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
    const stride = this.points.length > 180 ? 3 : this.points.length > 90 ? 2 : 1;
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
      radius: this.radius,
      length: Math.round(this.length),
      score: Math.floor(this.score),
      alive: this.alive,
      color: this.color,
      darkColor: this.darkColor,
      aiState: this.ai.state,
      points
    };
  }

  setInput(input) {
    this.input.aimAngle = Number.isFinite(input.aimAngle) ? input.aimAngle : this.input.aimAngle;
    this.input.left = !!input.left;
    this.input.right = !!input.right;
    this.input.boost = !!input.boost;
    this.input.shoot = !!input.shoot;
  }

  computeRadius() {
    const extra = Math.sqrt(Math.max(0, this.length - this.config.snake.startLength)) * this.config.snake.radiusGrowth;
    return clamp(this.config.snake.baseRadius + extra, this.config.snake.baseRadius, this.config.snake.maxRadius);
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

    const boosting = this.input.boost && this.length > this.config.snake.minLength + 80;
    const speedBase = this.type === "bot" ? this.config.snake.speed * this.config.bots.speedMultiplier : this.config.snake.speed;
    const sizeDrag = 1 - clamp((this.radius - this.config.snake.baseRadius) / 95, 0, 0.13);
    const speed = (boosting ? this.config.snake.boostSpeed : speedBase) * sizeDrag;

    if (boosting) this.length -= this.config.snake.boostDrainPerSecond * dt;

    if (this.length > this.config.snake.softMaxLength) {
      this.length -= this.config.snake.passiveDecayAboveSoftCap * dt;
    }

    this.length = clamp(this.length, this.config.snake.minLength, this.config.snake.hardMaxLength);

    this.x += Math.cos(this.angle) * speed * dt;
    this.y += Math.sin(this.angle) * speed * dt;

    this.points.unshift({ x: this.x, y: this.y });
    this.trimTail();

    if (this.input.shoot) {
      game.tryShoot(this);
      this.input.shoot = false;
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
    const fullness = clamp(this.length / this.config.snake.softMaxLength, 0, 1);
    const scaling = 1 - fullness * 0.68;
    this.length = clamp(this.length + amount * scaling, this.config.snake.minLength, this.config.snake.hardMaxLength);
  }

  kill(secondsUntilRespawn) {
    this.alive = false;
    this.respawnTimer = secondsUntilRespawn;
  }

  cutAt(index, projectile, game) {
    if (!this.alive) return;

    const safeIndex = Math.max(8, Math.min(index, this.points.length - 1));
    const removed = this.points.slice(safeIndex);
    if (removed.length < 4) return;

    this.points.length = safeIndex;
    this.length = Math.max(this.config.snake.minLength, this.length - this.config.projectile.cutLength);

    this.x += Math.cos(projectile.angle) * this.config.projectile.knockback;
    this.y += Math.sin(projectile.angle) * this.config.projectile.knockback;
    this.angle = lerpAngle(this.angle, projectile.angle + rand(-0.6, 0.6), 0.28);

    const stride = Math.max(1, Math.floor(removed.length / this.config.projectile.foodScatter));
    for (let i = 0; i < removed.length; i += stride) {
      const p = removed[i];
      game.spawnFoodAt(
        p.x + Math.cos(projectile.angle) * rand(5, 70) + rand(-28, 28),
        p.y + Math.sin(projectile.angle) * rand(5, 70) + rand(-28, 28),
        this.color,
        true
      );
    }
  }
}
