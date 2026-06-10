# Slither Online Lite

A simplified authoritative online multiplayer Slither-style game. It is designed as a clean base project that can be extended later with bots, projectiles, rooms, skins, chat, or stronger anti-cheat.

## What is included

- Node.js server using Express and WebSockets.
- Browser client using Canvas and vanilla JavaScript.
- Authoritative server-side movement, food, growth, collisions, deaths, and respawns.
- One shared online arena for all connected players.
- Name setting, scoreboard, leaderboard, and minimap.
- Ready-to-upload project structure for Render or similar Node/WebSocket hosts.

## Folder structure

```text
slither-online-lite/
├─ package.json
├─ server.js
├─ render.yaml
├─ README.md
└─ public/
   ├─ index.html
   ├─ style.css
   └─ client.js
```

## Local setup

Install Node.js 20 or later.

Open a terminal in this folder and run:

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

To test multiplayer locally, open the same address in two browser tabs or two different browsers.

## Controls

```text
A / D or Left Arrow / Right Arrow = turn
W or Up Arrow = boost
```

The objective is to eat orbs, grow, and force other players to hit your body. Players can pass through their own body.

## Playing with friends online

You need to deploy this folder to a host that supports Node.js WebSockets. A static site host is not enough, because the game requires a running server.

### Recommended simple route: Render

1. Create a free Render account.
2. Upload this folder to a GitHub repository.
3. In Render, choose **New > Web Service**.
4. Connect the GitHub repository.
5. Use these settings:

```text
Environment: Node
Build Command: npm install
Start Command: npm start
Plan: Free is fine for testing
```

6. Deploy the service.
7. Share the Render URL with friends.

Render will provide a URL similar to:

```text
https://your-service-name.onrender.com
```

Everyone who opens that URL joins the same arena.

### Notes about free hosting

Free services may sleep after inactivity. The first player joining after a sleep may need to wait while the server starts again. Once players are connected and sending traffic, it should remain usable for casual testing.

## Direct upload notes

Do not upload only the `public` folder. The server needs `server.js`, `package.json`, and the `public` folder together.

Do not upload `node_modules`. Hosts install dependencies automatically using `npm install`.

## How the multiplayer works

The browser only sends input:

```text
turn left
turn right
boost
```

The server controls:

```text
movement
snake body trails
food
collisions
scores
deaths
respawns
```

This is better than letting each browser control its own snake, because it keeps the game state consistent for all users and makes basic cheating harder.

## Good next features to add

Suggested order:

1. Add private rooms or room codes.
2. Add bots when fewer than 2 real players are online.
3. Add projectile orbs.
4. Add skins and colours.
5. Add mobile controls.
6. Add interpolation for smoother motion.
7. Add persistent usernames or high scores.
8. Add a main menu and lobby screen.

## Troubleshooting

If the page loads but multiplayer does not work, the host probably does not support WebSockets or the WebSocket route is blocked.

If deployment fails, check that `package.json` is in the project root and that the start command is:

```bash
npm start
```

If the game feels laggy, reduce these values in `server.js`:

```js
maxFood
maxPlayers
STATE_RATE
```

If the game feels too empty, increase `WORLD.width`, `WORLD.height`, or `maxFood`.
