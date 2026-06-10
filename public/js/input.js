export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2, left: false, right: false };
    this.shootQueued = false;

    window.addEventListener("keydown", e => {
      if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k === " " || k === "s" || k === "arrowdown") this.shootQueued = true;
    });

    window.addEventListener("keyup", e => this.keys.delete(e.key.toLowerCase()));

    canvas.addEventListener("mousemove", e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    canvas.addEventListener("mousedown", e => {
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) {
        this.mouse.right = true;
        this.shootQueued = true;
      }
    });

    window.addEventListener("mouseup", e => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });

    canvas.addEventListener("contextmenu", e => e.preventDefault());
  }

  buildInput(camera) {
    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2;
    const aimAngle = Math.atan2(this.mouse.y - centerY, this.mouse.x - centerX);

    const shoot = this.shootQueued;
    this.shootQueued = false;

    return {
      aimAngle,
      left: this.keys.has("a") || this.keys.has("arrowleft"),
      right: this.keys.has("d") || this.keys.has("arrowright"),
      boost: this.keys.has("w") || this.keys.has("arrowup") || this.mouse.left,
      shoot
    };
  }
}
