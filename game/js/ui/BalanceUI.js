// /js/ui/BalanceUI.js
class BalanceUI {
  constructor(game) {
    this.game = game;
    this.balanceContainer = document.getElementById("balance-container");
  }

  renderBalance() {
    this.balanceContainer.innerHTML = ""; // Clear existing items

    const playerBalanceElement = document.createElement("div");
    playerBalanceElement.className = "player-balance";
    playerBalanceElement.innerHTML = `
            <span>$${this.game.localPlayer.balance}</span>
          `;
    this.balanceContainer.appendChild(playerBalanceElement);
  }

  draw(ctx) {
    // Optionally draw inventory UI on canvas
  }
}

export default BalanceUI;
