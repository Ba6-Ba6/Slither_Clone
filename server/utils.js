export function rand(min, max) {
  return Math.random() * (max - min) + min;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function angleTo(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function angleDiff(current, target) {
  return ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

export function lerpAngle(current, target, amount) {
  return current + angleDiff(current, target) * amount;
}

export function randomName() {
  const left = ["Neon", "Viper", "Orbit", "Ghost", "Nova", "Byte", "Worm", "Comet", "Ash", "Glint"];
  const right = ["One", "Two", "Fang", "Loop", "Dash", "Line", "Tail", "Drift", "Pulse", "Coil"];
  return left[Math.floor(Math.random() * left.length)] + right[Math.floor(Math.random() * right.length)];
}
