export class NetworkClient {
  constructor() {
    this.socket = null;
    this.id = null;
    this.connected = false;
    this.latestState = null;
    this.onInit = null;
    this.onState = null;
    this.onStatus = null;
  }

  connect(name) {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    this.socket = new WebSocket(`${protocol}://${location.host}`);

    this.socket.addEventListener("open", () => {
      this.connected = true;
      this.status("Connected");
      this.socket.send(JSON.stringify({ type: "join", name }));
    });

    this.socket.addEventListener("message", event => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === "init") {
        this.id = msg.id;
        this.onInit?.(msg);
      }

      if (msg.type === "state") {
        this.latestState = msg;
        this.onState?.(msg);
      }

      if (msg.type === "error") this.status(msg.message || "Server error");
    });

    this.socket.addEventListener("close", () => {
      this.connected = false;
      this.status("Disconnected. Refresh to reconnect.");
    });
  }

  sendInput(input) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.id) return;
    this.socket.send(JSON.stringify({ type: "input", input }));
  }

  status(text) {
    this.onStatus?.(text);
  }
}
