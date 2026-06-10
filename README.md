# Slither Online Modular

Upload-ready multiplayer Slither-style game using Node.js, Express, WebSockets and a modular browser client.

## Controls

Mouse movement: steer

Left mouse / W / Up Arrow: boost

Hold right mouse, Space, S, or Down Arrow: charge shot

Release the held shot button: fire charged orb

1: prioritise length growth

2: balanced growth

3: prioritise thickness growth

## Current feature set

- Authoritative server simulation
- Modular server and client structure
- Larger 16000 x 11000 map
- Slower length growth to prevent map-filling snakes
- Separate thickness growth system
- Larger snakes become thicker and slower
- Higher score increases shot fling power but also slows movement
- Larger/thicker snakes resist flinging more strongly
- Charged shots cost more length and fling harder
- Projectiles fling and bend snake sections instead of simply severing the whole tail
- Smooth damped camera with look-ahead
- Client-side visual smoothing for lower jitter
- Spatial hash collision/food systems for performance
- Bots, food, leaderboard, minimap, deaths and respawns

## Local testing

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

Open multiple browser windows to test multiple players.

## Render deployment

Use these settings:

```text
Service type: Web Service
Runtime: Node
Build Command: npm install
Start Command: npm start
Root Directory: blank if package.json is at repo root
Instance Type: Free is fine for testing
Environment Variables: none required
```

The repo root should contain:

```text
package.json
server.js
render.yaml
README.md
server/
public/
```

Do not upload the zip itself to GitHub. Extract it and upload the contents so `package.json` is visible on the first page of the repo.

## Where to configure balance

Main gameplay balance is in:

```text
server/config.js
```

Useful sections:

```text
world      map size
snake      movement, growth, thickness and slowdown
projectile shooting cost, charge power and fling behaviour
food       food amount and growth values
bots       bot population and behaviour
collision  body sample and spatial grid settings
```
