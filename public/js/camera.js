function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.scale = 0.85;
    this.ready = false;
  }

  follow(target, dt) {
    if (!target) return;

    const head = target.points?.[0] || target;
    const lookAhead = clamp((target.radius || 10) * 9, 90, 260);
    const targetX = head.x + Math.cos(target.angle || 0) * lookAhead;
    const targetY = head.y + Math.sin(target.angle || 0) * lookAhead;

    if (!this.ready) {
      this.x = targetX;
      this.y = targetY;
      this.ready = true;
    }

    // Critically damped camera. This feels smoother than direct lerp on uneven network updates.
    const stiffness = 22;
    const damping = 9.2;
    const ax = (targetX - this.x) * stiffness - this.vx * damping;
    const ay = (targetY - this.y) * stiffness - this.vy * damping;

    this.vx += ax * dt;
    this.vy += ay * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const scoreZoom = clamp((target.score || 0) / 9000, 0, 0.18);
    const radiusZoom = clamp(((target.radius || 10) - 10) * 0.006, 0, 0.26);
    const targetScale = clamp(0.94 - scoreZoom - radiusZoom, 0.38, 1.05);
    const scaleT = 1 - Math.pow(0.02, dt);
    this.scale += (targetScale - this.scale) * scaleT;
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
