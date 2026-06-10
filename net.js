# Slither Online Modular

A modular Node.js + WebSocket multiplayer Slither-style game.

This version is designed to be easier to modify than a single-file HTML game. The server owns the simulation; browsers only send inputs and render the latest state.

## Current features

- Online multiplayer over WebSockets
- Server-authoritative movement, growth, shooting, collision and scoring
- Mouse steering
- Left mouse / W boost
- Right mouse / Space / S shooting
- Larger 10000 x 7000 map
- Slower length and width growth, with soft length cap
- Bots with eating, attacking, defending and wandering states
- Food, death drops, respawns, minimap and leaderboard
- Modular files for easier expansion

## Folder structure

```text
server.js                       Main HTTP/WebSocket entry point
server/config.js                Main game configuration
server/Game.js                  Authoritative game simulation
server/entities/Snake.js        Snake movement, growth and damage
server/entities/Projectile.js   Shot projectile
server/entities/Food.js         Food factory
server/systems/SpatialHash.js   Fast broad-phase query system
public/index.html               Browser page
public/style.css                Browser UI styling
public/js/main.js               Client boot loop
public/js/net.js                WebSocket client
public/js/input.js              Keyboard/mouse input
public/js/camera.js             Camera follow logic
public/js/renderer.js           Canvas renderer
public/js/ui.js                 HUD and leaderboard
```

## Local testing

Install Node.js 18 or later.

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

Open the same URL in two browser tabs to test multiplayer locally.

## Render deployment

Create or update your GitHub repository so `package.json` is at the top level.

Render settings:

```text
Service type: Web Service
Runtime: Node
Build Command: npm install
Start Command: npm start
Root Directory: leave blank if package.json is at the repo root
Instance Type: Free is fine for testing
Environment Variables: none required
```

After deploy, share the Render URL with friends. Each browser controls one snake.

## Controls

```text
Mouse position: steer
Hold left mouse: boost
W: boost
Right mouse: shoot
Space: shoot
S: shoot
A / D: optional keyboard turning
Left / Right arrows: optional keyboard turning
```

Shooting costs 100 length. A hit cuts length from the target and converts the removed section into food.

## How to change balance

Most balance values are in:

```text
server/config.js
```

Useful values:

```js
world.width / world.height       Map size
food.targetCount                 Food amount
snake.startLength                Spawn size
snake.softMaxLength              Growth starts slowing here
snake.hardMaxLength              Absolute length cap
snake.radiusGrowth               Width growth rate
projectile.cost                  Shooting length cost
projectile.cutLength             Damage done by a shot
bots.targetCount                 Number of bots
```

## Adding features later

Recommended pattern:

1. Add a config section in `server/config.js`.
2. Add server logic in `server/Game.js` or a new system file.
3. Add entity-specific logic in `server/entities/`.
4. Send only the minimal required state in `Game.getState()`.
5. Render the new feature in `public/js/renderer.js`.
6. Add controls in `public/js/input.js` only if player input is needed.

Keep the server authoritative for anything competitive: movement, damage, scores, food, death and projectiles.
