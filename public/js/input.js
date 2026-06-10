export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2, left: false, right: false };
    this.growthMode = localStorage.getItem("growthMode") || "balanced";

    this.chargeStart = null;
    this.keyboardChargeStart = null;
    this.shootQueued = false;
    this.queuedCharge = 0;
    this.maxChargeSeconds = 1.85;

    window.addEventListener("keydown", e => {
      if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
      const k = e.key.toLowerCase();

      if ((k === "s" || k === "arrowdown" || k === " ") && !this.keys.has(k)) {
        this.keyboardChargeStart = performance.now();
      }

      if (k === "1") this.setGrowthMode("length");
      if (k === "2") this.setGrowthMode("balanced");
      if (k === "3") this.setGrowthMode("thick");

      this.keys.add(k);
    });

    window.addEventListener("keyup", e => {
      const k = e.key.toLowerCase();
      if (k === "s" || k === "arrowdown" || k === " ") {
        this.queueShotFromStart(this.keyboardChargeStart);
        this.keyboardChargeStart = null;
      }
      this.keys.delete(k);
    });

    canvas.addEventListener("mousemove", e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    canvas.addEventListener("mousedown", e => {
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) {
        this.mouse.right = true;
        this.chargeStart = performance.now();
      }
    });

    window.addEventListener("mouseup", e => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) {
        this.mouse.right = false;
        this.queueShotFromStart(this.chargeStart);
        this.chargeStart = null;
      }
    });

    canvas.addEventListener("contextmenu", e => e.preventDefault());
  }

  setGrowthMode(mode) {
    if (!["length", "balanced", "thick"].includes(mode)) return;
    this.growthMode = mode;
    localStorage.setItem("growthMode", mode);
  }

  queueShotFromStart(start) {
    if (!start) return;
    const held = Math.max(0, (performance.now() - start) / 1000);
    this.queuedCharge = Math.max(this.queuedCharge, Math.min(1, held / this.maxChargeSeconds));
    this.shootQueued = true;
  }

  getChargeFraction() {
    const starts = [this.chargeStart, this.keyboardChargeStart].filter(Boolean);
    if (!starts.length) return 0;
    const held = Math.max(...starts.map(s => (performance.now() - s) / 1000));
    return Math.max(0, Math.min(1, held / this.maxChargeSeconds));
  }

  buildInput(camera) {
    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2;
    const aimAngle = Math.atan2(this.mouse.y - centerY, this.mouse.x - centerX);

    const shoot = this.shootQueued;
    const shotCharge = this.queuedCharge;
    this.shootQueued = false;
    this.queuedCharge = 0;

    return {
      aimAngle,
      left: this.keys.has("a") || this.keys.has("arrowleft"),
      right: this.keys.has("d") || this.keys.has("arrowright"),
      boost: this.keys.has("w") || this.keys.has("arrowup") || this.mouse.left,
      shoot,
      shotCharge,
      growthMode: this.growthMode
    };
  }
}
