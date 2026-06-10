export class Projectile {
  constructor({ id, ownerId, x, y, angle, config, color }) {
    this.id = id;
    this.ownerId = ownerId;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * config.speed;
    this.vy = Math.sin(angle) * config.speed;
    this.angle = angle;
    this.radius = config.radius;
    this.life = config.lifeSeconds;
    this.color = color;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  get alive() {
    return this.life > 0;
  }
}
