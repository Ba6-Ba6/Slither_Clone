export const CONFIG = {
  tickRate: 30,
  sendRate: 20,
  maxPlayers: 16,

  world: {
    width: 10000,
    height: 7000,
    padding: 90
  },

  snake: {
    startLength: 300,
    minLength: 120,
    softMaxLength: 2200,
    hardMaxLength: 3000,
    segmentSpacing: 10,
    baseRadius: 10,
    maxRadius: 25,
    radiusGrowth: 0.11,
    speed: 235,
    boostSpeed: 345,
    turnRate: 5.4,
    boostDrainPerSecond: 58,
    passiveDecayAboveSoftCap: 14,
    respawnSeconds: 2.5
  },

  food: {
    targetCount: 900,
    radiusMin: 4,
    radiusMax: 7,
    growthMin: 6,
    growthMax: 12,
    scoreMin: 4,
    scoreMax: 9,
    cellSize: 260
  },

  projectile: {
    enabled: true,
    cost: 100,
    cooldown: 0.85,
    speed: 820,
    radius: 11,
    lifeSeconds: 1.55,
    cutLength: 165,
    knockback: 115,
    foodScatter: 16
  },

  bots: {
    enabled: true,
    targetCount: 10,
    respawnSeconds: 4,
    speedMultiplier: 0.92,
    turnRateMultiplier: 0.72,
    vision: 1050,
    aggressionVision: 780,
    shootChance: 0.018
  },

  collision: {
    bodySampleStep: 4,
    bodyCellSize: 240,
    headGraceSegments: 10
  }
};
