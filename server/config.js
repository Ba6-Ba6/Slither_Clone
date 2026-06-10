export const CONFIG = {
  tickRate: 30,
  sendRate: 20,
  maxPlayers: 16,

  world: {
    width: 16000,
    height: 11000,
    padding: 120
  },

  snake: {
    startLength: 300,
    minLength: 120,
    softMaxLength: 3600,
    hardMaxLength: 5200,
    segmentSpacing: 11,
    baseRadius: 10,
    maxRadius: 56,
    lengthRadiusGrowth: 0.035,
    thicknessRadiusGrowth: 0.24,
    speed: 245,
    boostSpeed: 360,
    turnRate: 5.8,
    boostDrainPerSecond: 58,
    passiveDecayAboveSoftCap: 8,
    respawnSeconds: 2.5,
    scoreSlowdown: 0.000055,
    radiusSlowdown: 0.0045,
    growthModes: {
      length: { length: 0.92, thickness: 0.08 },
      balanced: { length: 0.62, thickness: 0.38 },
      thick: { length: 0.34, thickness: 0.66 }
    }
  },

  food: {
    targetCount: 1500,
    radiusMin: 4,
    radiusMax: 7,
    growthMin: 4,
    growthMax: 8,
    scoreMin: 4,
    scoreMax: 9,
    cellSize: 320
  },

  projectile: {
    enabled: true,
    baseCost: 70,
    chargeCost: 150,
    cooldown: 0.75,
    baseSpeed: 820,
    chargeSpeed: 190,
    baseRadius: 10,
    chargeRadius: 12,
    lifeSeconds: 1.65,
    baseKnockback: 175,
    chargeKnockback: 520,
    scorePowerScale: 0.018,
    maxScorePowerBonus: 2.6,
    targetRadiusResistance: 0.075,
    targetScoreResistance: 0.006,
    segmentFlingLength: 120,
    looseFoodMin: 2,
    looseFoodMax: 8
  },

  bots: {
    enabled: true,
    targetCount: 12,
    respawnSeconds: 4,
    speedMultiplier: 0.92,
    turnRateMultiplier: 0.72,
    vision: 1200,
    aggressionVision: 900,
    shootChance: 0.013
  },

  collision: {
    bodySampleStep: 4,
    bodyCellSize: 260,
    headGraceSegments: 10
  }
};
