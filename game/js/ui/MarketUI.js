// /js/ui/MarketUI.js
class MarketUI {
  constructor(game) {
    this.game = game;

    // Initialize DOM elements
    this.marketModal = document.getElementById("fish-market-modal");
    this.marketCloseButton = document.getElementById("fish-market-close");
    this.marketItemsContainer = document.getElementById(
      "market-items-container"
    );
    this.playerMoneyDisplay = document.getElementById("player-money");
    this.marketButton = document.getElementById("market-button");

    // Bind event listeners
    this.marketButton.addEventListener("click", this.openMarket.bind(this));
    this.marketCloseButton.addEventListener(
      "click",
      this.closeMarket.bind(this)
    );

    // Close the modal when clicking outside of it
    globalThis.addEventListener("click", (event) => {
      if (event.target === this.marketModal) {
        this.closeMarket();
      }
    });
  }

  openMarket() {
    this.marketModal.style.display = "block";
    this.renderMarketItems();
    this.updatePlayerMoney();
  }

  closeMarket() {
    this.marketModal.style.display = "none";
  }

  renderMarketItems() {
    // Clear the container
    this.marketItemsContainer.innerHTML = "";

    // Get the player's inventory
    const inventory = this.game.localPlayer.inventory;
    console.log("Inventory: ", inventory);

    // Filter to only include fish items
    const fishItems = inventory.filter((item) => item.type === "Fish");
    this.updatePlayerMoney();

    if (fishItems.length === 0) {
      // Display a message if no fish to sell
      const noFishMessage = document.createElement("p");
      noFishMessage.innerText = "You have no fish to sell!";
      this.marketItemsContainer.appendChild(noFishMessage);
    } else {
      // Create an element for each fish item
      fishItems.forEach((item) => {
        const itemElement = document.createElement("div");
        itemElement.className = "market-item";

        itemElement.innerHTML = `
            <img src="${item.img}" alt="${item.name}">
            <div>
              <p><strong>${item.name}</strong></p>
              <p>Quantity: ${item.quantity}</p>
              <p>Value per unit: $${item.value}</p>
            </div>
            <button class="sell-button">Sell All</button>
          `;

        // Add event listener for the sell button
        const sellButton = itemElement.querySelector(".sell-button");
        sellButton.addEventListener("click", () =>
          this.game.marketMechanic.startSell(item)
        );

        this.marketItemsContainer.appendChild(itemElement);
      });
    }
  }

  sellFish(item) {
    // Calculate the total value
    const totalValue = item.quantity * item.value;

    // Update the player's money
    this.game.playerMoney += totalValue;

    // Remove the item from the inventory
    item.quantity = 0;

    // Remove items with zero quantity
    this.game.localPlayer.inventory = this.game.localPlayer.inventory.filter(
      (i) => i.quantity > 0
    );
    // Update the UI
    this.renderMarketItems();
    this.game.uiManager.inventoryUI.renderInventory();
  }

  updatePlayerMoney() {
    this.playerMoneyDisplay.innerText = this.game.localPlayer.balance;
  }
}

export default MarketUI;
