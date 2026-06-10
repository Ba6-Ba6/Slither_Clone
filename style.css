function lerp(a, b, t) {
  return a + (b - a) * t;
}

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.scale = 0.9;
    this.ready = false;
  }

  follow(target, dt) {
    if (!target) return;

    if (!this.ready) {
      this.x = target.x;
      this.y = target.y;
      this.ready = true;
    }

    const t = 1 - Math.pow(0.001, dt);
    this.x = lerp(this.x, target.x, t);
    this.y = lerp(this.y, target.y, t);

    const targetScale = Math.max(0.48, Math.min(1.05, 1.0 - (target.radius - 10) * 0.008));
    this.scale = lerp(this.scale, targetScale, t);
  }

  worldToScreen(x, y) {
    return {
      x: innerWidth / 2 + (x - this.x) * this.scale,
      y: innerHeight / 2 + (y - this.y) * this.scale
    };
  }

  screenToWorld(x, y) {
    return {
      x: this.x + (x - innerWidth / 2) / this.scale,
      y: this.y + (y - innerHeight / 2) / this.scale
    };
  }
}
