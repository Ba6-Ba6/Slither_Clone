export class Projectile {
  constructor({ id, ownerId, x, y, angle, config, color, charge = 0, power = 1, cost = 0 }) {
    this.id = id;
    this.ownerId = ownerId;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.charge = Math.max(0, Math.min(1, charge));
    this.power = power;
    this.cost = cost;
    this.radius = config.baseRadius + config.chargeRadius * this.charge;
    this.vx = Math.cos(angle) * (config.baseSpeed + config.chargeSpeed * this.charge);
    this.vy = Math.sin(angle) * (config.baseSpeed + config.chargeSpeed * this.charge);
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
