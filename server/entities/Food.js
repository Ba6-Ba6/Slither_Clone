import { rand } from "../utils.js";

export function createFood(id, world, options = {}) {
  const radius = options.radius ?? rand(4, 7);
  const colors = ["#6cf6ff", "#ffdc62", "#ff73df", "#85ff8f", "#b78cff", "#ffffff"];

  return {
    id,
    x: options.x ?? rand(world.padding, world.width - world.padding),
    y: options.y ?? rand(world.padding, world.height - world.padding),
    radius,
    growth: options.growth ?? rand(6, 12),
    score: options.score ?? rand(4, 9),
    color: options.color ?? colors[Math.floor(Math.random() * colors.length)]
  };
}
