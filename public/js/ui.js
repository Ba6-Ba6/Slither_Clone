export class UI {
  constructor() {
    this.statusEl = document.getElementById("status");
    this.leaderboardEl = document.getElementById("leaderboard");
    this.joinPanel = document.getElementById("joinPanel");
    this.nameInput = document.getElementById("nameInput");
    this.joinButton = document.getElementById("joinButton");
  }

  setStatus(text) {
    this.statusEl.textContent = text;
  }

  hideJoin() {
    this.joinPanel.classList.add("hidden");
  }

  renderLeaderboard(state, myId) {
    if (!state?.leaderboard) return;

    const lines = state.leaderboard.map((p, i) => {
      const marker = p.id === myId ? "• " : "";
      return `<div>${i + 1}. ${marker}${escapeHtml(p.name)} — ${p.score}</div>`;
    });

    this.leaderboardEl.innerHTML = `<strong>Leaderboard</strong>${lines.join("")}`;
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}
