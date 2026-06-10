import { NetworkClient } from "./net.js";
import { InputManager } from "./input.js";
import { Camera } from "./camera.js";
import { Renderer } from "./renderer.js";
import { UI } from "./ui.js";

const canvas = document.getElementById("game");
const camera = new Camera();
const renderer = new Renderer(canvas, camera);
const input = new InputManager(canvas);
const net = new NetworkClient();
const ui = new UI();

let currentState = null;
let running = false;
let lastFrame = performance.now();
let inputTimer = 0;

ui.joinButton.addEventListener("click", join);
ui.nameInput.addEventListener("keydown", event => {
  if (event.key === "Enter") join();
});

function join() {
  if (running) return;
  running = true;
  ui.hideJoin();
  net.connect(ui.nameInput.value || "Player");
}

net.onStatus = text => ui.setStatus(text);
net.onInit = msg => {
  ui.setStatus(`Online · Your ID: ${msg.id.slice(0, 5)}`);
};
net.onState = state => {
  currentState = state;
  ui.renderLeaderboard(state, net.id);
};

function findMe() {
  if (!currentState || !net.id) return null;
  return currentState.snakes.find(s => s.id === net.id) || null;
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  const me = findMe();
  if (me) camera.follow(me, dt);

  inputTimer += dt;
  if (inputTimer >= 1 / 30) {
    inputTimer = 0;
    net.sendInput(input.buildInput(camera));
  }

  renderer.render(currentState, net.id);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
