import { CONFIG } from "./config.js";
import { Snake } from "./entities/Snake.js";
import { Projectile } from "./entities/Projectile.js";
import { createFood } from "./entities/Food.js";
import { SpatialHash } from "./systems/SpatialHash.js";
import { rand, clamp, distance, angleTo, angleDiff, randomName } from "./utils.js";

const COLORS = [
  ["#3dbfff", "#126ca0"],
  ["#ff5050", "#9d2020"],
  ["#83ffb0", "#267a45"],
  ["#ffd45c", "#8d6912"],
  ["#d39bff", "#6e3d99"],
  ["#ff8ac7", "#9e3c70"],
  ["#a6b7ff", "#4d5bb0"],
  ["#ffad66", "#a55b22"]
];

export class Game {
  constructor() {
    this.config = CONFIG;
    this.players = new Map();
    this.snakes = new Map();
    this.food = new Map();
    this.projectiles = new Map();
    this.nextFoodId = 1;
    this.nextProjectileId = 1;
    this.nextBotId = 1;
    this.foodGrid = new SpatialHash(CONFIG.food.cellSize);
    this.bodyGrid = new SpatialHash(CONFIG.collision.bodyCellSize);
    this.time = 0;

    this.ensureFood();
    this.ensureBots();
  }

  addPlayer(socket, name = "") {
    const id = crypto.randomUUID();
    const color = COLORS[this.players.size % COLORS.length];
    const spot = this.randomSpawnPoint();
    const snake = new Snake({
      id,
      name: this.sanitizeName(name) || randomName(),
      type: "player",
      x: spot.x,
      y: spot.y,
      angle: rand(0, Math.PI * 2),
      color: color[0],
      darkColor: color[1],
      config: this.config
    });

    this.players.set(id, { id, socket });
    this.snakes.set(id, snake);
    return id;
  }

  removePlayer(id) {
    this.players.delete(id);
    this.snakes.delete(id);
  }

  setPlayerInput(id, input) {
    const snake = this.snakes.get(id);
    if (!snake || snake.type !== "player") return;
    snake.setInput(input || {});
  }

  sanitizeName(name) {
    if (typeof name !== "string") return "";
    return name.trim().replace(/[<>]/g, "").slice(0, 16);
  }

  randomSpawnPoint() {
    return {
      x: rand(this.config.world.padding + 200, this.config.world.width - this.config.world.padding - 200),
      y: rand(this.config.world.padding + 200, this.config.world.height - this.config.world.padding - 200)
    };
  }

  respawnSnake(snake) {
    const spot = this.randomSpawnPoint();
    snake.x = spot.x;
    snake.y = spot.y;
    snake.angle = rand(0, Math.PI * 2);
    snake.length = this.config.snake.startLength;
    snake.radius = this.config.snake.baseRadius;
    snake.points = [];
    snake.alive = true;
    snake.shotCooldown = 0.4;

    const count = Math.ceil(snake.length / this.config.snake.segmentSpacing);
    for (let i = 0; i < count; i++) {
      snake.points.push({
        x: snake.x - Math.cos(snake.angle) * i * this.config.snake.segmentSpacing,
        y: snake.y - Math.sin(snake.angle) * i * this.config.snake.segmentSpacing
      });
    }
  }

  spawnFoodAt(x, y, color = null, corpse = false) {
    const food = createFood(this.nextFoodId++, this.config.world, {
      x: clamp(x, this.config.world.padding, this.config.world.width - this.config.world.padding),
      y: clamp(y, this.config.world.padding, this.config.world.height - this.config.world.padding),
      radius: corpse ? rand(5, 8) : undefined,
      growth: corpse ? rand(7, 11) : undefined,
      score: corpse ? rand(6, 12) : undefined,
      color
    });
    this.food.set(food.id, food);
    return food;
  }

  ensureFood() {
    while (this.food.size < this.config.food.targetCount) {
      const food = createFood(this.nextFoodId++, this.config.world, {
        radius: rand(this.config.food.radiusMin, this.config.food.radiusMax),
        growth: rand(this.config.food.growthMin, this.config.food.growthMax),
        score: rand(this.config.food.scoreMin, this.config.food.scoreMax)
      });
      this.food.set(food.id, food);
    }
  }

  ensureBots() {
    if (!this.config.bots.enabled) return;
    let liveBots = 0;
    for (const snake of this.snakes.values()) {
      if (snake.type === "bot") liveBots++;
    }

    while (liveBots < this.config.bots.targetCount) {
      const id = `bot-${this.nextBotId++}`;
      const c = COLORS[(this.nextBotId + 2) % COLORS.length];
      const spot = this.randomSpawnPoint();
      const bot = new Snake({
        id,
        name: `Bot ${this.nextBotId - 1}`,
        type: "bot",
        x: spot.x,
        y: spot.y,
        angle: rand(0, Math.PI * 2),
        color: c[0],
        darkColor: c[1],
        config: this.config
      });
      this.snakes.set(id, bot);
      liveBots++;
    }
  }

  rebuildGrids() {
    this.foodGrid.clear();
    for (const f of this.food.values()) this.foodGrid.insert(f.x, f.y, f);

    this.bodyGrid.clear();
    const step = this.config.collision.bodySampleStep;
    for (const snake of this.snakes.values()) {
      if (!snake.alive) continue;
      for (let i = 5; i < snake.points.length; i += step) {
        const p = snake.points[i];
        this.bodyGrid.insert(p.x, p.y, { snake, index: i, x: p.x, y: p.y, radius: snake.radius });
      }
    }
  }

  update(dt) {
    this.time += dt;
    this.ensureFood();
    this.ensureBots();
    this.rebuildGrids();

    for (const snake of this.snakes.values()) snake.update(dt, this);

    this.rebuildGrids();
    this.updateProjectiles(dt);
    this.handleFoodEating();
    this.handleCollisions();
  }

  updateBotAI(bot, dt) {
    bot.ai.timer -= dt;
    const head = bot.head;
    const danger = this.findBotDanger(bot);

    if (danger) {
      bot.ai.state = "defend";
      bot.input.aimAngle = angleTo(danger, head);
      bot.input.boost = bot.length > this.config.snake.minLength + 120;
      return;
    }

    const enemy = this.findBotEnemy(bot);
    const food = this.findBotFood(bot);

    if (enemy && (bot.length > enemy.length * 0.82 || distance(head, enemy.head) < 420)) {
      bot.ai.state = "attack";
      const lead = {
        x: enemy.head.x + Math.cos(enemy.angle) * 120,
        y: enemy.head.y + Math.sin(enemy.angle) * 120
      };
      bot.input.aimAngle = angleTo(head, lead);
      bot.input.boost = distance(head, enemy.head) < 530 && bot.length > this.config.snake.minLength + 120;

      const aimError = Math.abs(angleDiff(bot.angle, angleTo(head, enemy.head)));
      if (this.config.projectile.enabled && aimError < 0.22 && Math.random() < this.config.bots.shootChance) {
        bot.input.shoot = true;
      }
      return;
    }

    if (food) {
      bot.ai.state = "eat";
      bot.input.aimAngle = angleTo(head, food);
      bot.input.boost = false;
      return;
    }

    bot.ai.state = "wander";
    if (bot.ai.timer <= 0) {
      bot.ai.wanderAngle += rand(-1.2, 1.2);
      bot.ai.timer = rand(0.7, 1.6);
    }
    bot.input.aimAngle = bot.ai.wanderAngle;
    bot.input.boost = false;

    const margin = 420;
    let wallX = 0;
    let wallY = 0;
    if (head.x < this.config.world.padding + margin) wallX += 1;
    if (head.x > this.config.world.width - this.config.world.padding - margin) wallX -= 1;
    if (head.y < this.config.world.padding + margin) wallY += 1;
    if (head.y > this.config.world.height - this.config.world.padding - margin) wallY -= 1;
    if (wallX || wallY) bot.input.aimAngle = Math.atan2(wallY, wallX);
  }

  findBotFood(bot) {
    const nearby = this.foodGrid.query(bot.head.x, bot.head.y, this.config.bots.vision);
    let best = null;
    let bestScore = -Infinity;
    for (const f of nearby) {
      const d = distance(bot.head, f);
      const angleScore = 1 - Math.abs(angleDiff(bot.angle, angleTo(bot.head, f))) / Math.PI;
      const score = f.growth * 7 + angleScore * 90 - d * 0.12;
      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    }
    return best;
  }

  findBotEnemy(bot) {
    let best = null;
    let bestScore = -Infinity;
    for (const snake of this.snakes.values()) {
      if (snake === bot || !snake.alive) continue;
      const d = distance(bot.head, snake.head);
      if (d > this.config.bots.aggressionVision) continue;
      const sizeScore = (bot.length - snake.length) * 0.12;
      const playerBonus = snake.type === "player" ? 90 : 0;
      const score = playerBonus + sizeScore - d * 0.13;
      if (score > bestScore) {
        bestScore = score;
        best = snake;
      }
    }
    return best;
  }

  findBotDanger(bot) {
    const probe = {
      x: bot.head.x + Math.cos(bot.angle) * 170,
      y: bot.head.y + Math.sin(bot.angle) * 170
    };

    if (
      probe.x < this.config.world.padding + 140 ||
      probe.y < this.config.world.padding + 140 ||
      probe.x > this.config.world.width - this.config.world.padding - 140 ||
      probe.y > this.config.world.height - this.config.world.padding - 140
    ) {
      return probe;
    }

    const bodies = this.bodyGrid.query(probe.x, probe.y, bot.radius + 95);
    for (const b of bodies) {
      if (b.snake === bot) continue;
      if (Math.hypot(probe.x - b.x, probe.y - b.y) < bot.radius + b.radius + 55) return b;
    }
    return null;
  }

  tryShoot(snake) {
    if (!this.config.projectile.enabled) return false;
    const pconf = this.config.projectile;
    if (!snake.alive || snake.length < this.config.snake.minLength + pconf.cost + 20 || snake.shotCooldown > 0) return false;

    snake.length -= pconf.cost;
    snake.shotCooldown = pconf.cooldown;
    const start = {
      x: snake.head.x + Math.cos(snake.angle) * (snake.radius + 20),
      y: snake.head.y + Math.sin(snake.angle) * (snake.radius + 20)
    };

    const projectile = new Projectile({
      id: this.nextProjectileId++,
      ownerId: snake.id,
      x: start.x,
      y: start.y,
      angle: snake.angle,
      config: pconf,
      color: snake.color
    });

    this.projectiles.set(projectile.id, projectile);
    return true;
  }

  updateProjectiles(dt) {
    for (const projectile of [...this.projectiles.values()]) {
      projectile.update(dt);

      if (
        !projectile.alive ||
        projectile.x < this.config.world.padding ||
        projectile.y < this.config.world.padding ||
        projectile.x > this.config.world.width - this.config.world.padding ||
        projectile.y > this.config.world.height - this.config.world.padding
      ) {
        this.projectiles.delete(projectile.id);
        continue;
      }

      const bodies = this.bodyGrid.query(projectile.x, projectile.y, projectile.radius + this.config.snake.maxRadius + 35);
      for (const b of bodies) {
        if (b.snake.id === projectile.ownerId || !b.snake.alive) continue;
        if (Math.hypot(projectile.x - b.x, projectile.y - b.y) < projectile.radius + b.radius) {
          b.snake.cutAt(b.index, projectile, this);
          const owner = this.snakes.get(projectile.ownerId);
          if (owner && owner.alive) {
            owner.score += 35;
            owner.addLength(14);
          }
          this.projectiles.delete(projectile.id);
          break;
        }
      }
    }
  }

  handleFoodEating() {
    const eaten = new Set();
    for (const snake of this.snakes.values()) {
      if (!snake.alive) continue;
      const radius = snake.radius + 24;
      const nearby = this.foodGrid.query(snake.head.x, snake.head.y, radius + 15);
      for (const f of nearby) {
        if (eaten.has(f.id)) continue;
        if (distance(snake.head, f) < radius + f.radius) {
          eaten.add(f.id);
          snake.addLength(f.growth);
          snake.score += f.score;
        }
      }
    }
    for (const id of eaten) this.food.delete(id);
  }

  handleCollisions() {
    for (const snake of this.snakes.values()) {
      if (!snake.alive) continue;
      const h = snake.head;

      if (
        h.x < this.config.world.padding ||
        h.y < this.config.world.padding ||
        h.x > this.config.world.width - this.config.world.padding ||
        h.y > this.config.world.height - this.config.world.padding
      ) {
        this.killSnake(snake, null);
        continue;
      }

      const bodies = this.bodyGrid.query(h.x, h.y, snake.radius + this.config.snake.maxRadius + 25);
      for (const b of bodies) {
        if (!b.snake.alive) continue;
        if (b.snake === snake) continue; // pass through own body
        if (Math.hypot(h.x - b.x, h.y - b.y) < snake.radius + b.radius * 0.82) {
          this.killSnake(snake, b.snake);
          break;
        }
      }
    }
  }

  killSnake(snake, killer) {
    const stride = Math.max(2, Math.floor(snake.points.length / 30));
    for (let i = 0; i < snake.points.length; i += stride) {
      const p = snake.points[i];
      this.spawnFoodAt(p.x + rand(-25, 25), p.y + rand(-25, 25), snake.color, true);
    }

    if (killer && killer.alive && killer !== snake) {
      killer.score += snake.type === "player" ? 120 : 55;
      killer.addLength(snake.type === "player" ? 55 : 24);
    }

    if (snake.type === "player") {
      snake.kill(this.config.snake.respawnSeconds);
    } else {
      this.snakes.delete(snake.id);
      setTimeout(() => this.ensureBots(), this.config.bots.respawnSeconds * 1000);
    }
  }

  getState() {
    const snakes = [...this.snakes.values()].map(s => s.getSerializable());
    const food = [...this.food.values()].map(f => ({
      id: f.id,
      x: Math.round(f.x),
      y: Math.round(f.y),
      r: Math.round(f.radius),
      color: f.color
    }));
    const projectiles = [...this.projectiles.values()].map(p => ({
      id: p.id,
      x: Math.round(p.x),
      y: Math.round(p.y),
      r: p.radius,
      color: p.color
    }));

    return {
      type: "state",
      now: Date.now(),
      world: this.config.world,
      snakes,
      food,
      projectiles,
      leaderboard: snakes
        .filter(s => s.alive)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(s => ({ id: s.id, name: s.name, score: s.score, type: s.type }))
    };
  }
}
