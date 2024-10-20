// /js/ui/MarketUI.js
class MarketUI {
  constructor(game) {
    this.game = game;

    // Initialize DOM elements
    this.marketModal = document.getElementById("fish-market-modal");
    this.marketCloseButton = document.getElementById("fish-market-close");
    this.marketSellItemsContainer = document.getElementById(
      "market-sell-items-container"
    );
    this.marketBuyItemsContainer = document.getElementById(
      "market-buy-items-container"
    );
    this.playerMoneyDisplay = document.getElementById("player-money");
    this.marketButton = document.getElementById("market-button");
    this.sellTab = document.getElementById("sell-tab");
    this.buyTab = document.getElementById("buy-tab");

    // Bind event listeners
    this.marketButton.addEventListener("click", this.openMarket.bind(this));
    this.marketCloseButton.addEventListener(
      "click",
      this.closeMarket.bind(this)
    );
    this.sellTab.addEventListener("click", this.showSellTab.bind(this));
    this.buyTab.addEventListener("click", this.showBuyTab.bind(this));

    // Close the modal when clicking outside of it
    globalThis.addEventListener("click", (event) => {
      if (event.target === this.marketModal) {
        this.closeMarket();
      }
    });
  }

  openMarket() {
    this.marketModal.style.display = "block";
    this.renderSellItems();
    this.renderBuyItems();
    this.updatePlayerMoney();
  }

  closeMarket() {
    this.marketModal.style.display = "none";
  }

  showSellTab() {
    this.sellTab.classList.add("active");
    this.buyTab.classList.remove("active");
    this.marketSellItemsContainer.style.display = "block";
    this.marketBuyItemsContainer.style.display = "none";
  }

  showBuyTab() {
    this.sellTab.classList.remove("active");
    this.buyTab.classList.add("active");
    this.marketSellItemsContainer.style.display = "none";
    this.marketBuyItemsContainer.style.display = "block";
  }

  renderSellItems() {
    // Clear the container
    this.marketSellItemsContainer.innerHTML = "";

    // Get the player's inventory
    const inventory = this.game.localPlayer.inventory || [];
    console.log("Inventory: ", inventory);

    // Filter to only include fish items
    const fishItems = inventory.filter((item) => item.type === "Fish");
    this.updatePlayerMoney();

    if (fishItems.length === 0) {
      const noFishMessage = document.createElement("p");
      noFishMessage.innerText = "You have no fish to sell!";
      this.marketSellItemsContainer.appendChild(noFishMessage);
    } else {
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

        this.marketSellItemsContainer.appendChild(itemElement);
      });
    }
  }

  renderBuyItems() {
    // Clear the container
    this.marketBuyItemsContainer.innerHTML = "";

    // Sample items to buy
    const itemsForSale = [
      {
        type: "Fish",
        name: "Goldfish",
        quantity: 1,
        value: 10,
        img: "./assets/goldfish.png",
      },
      {
        type: "Fish",
        name: "Tuna",
        quantity: 1,
        value: 20,
        img: "./assets/tuna.png",
      },
    ];

    itemsForSale.forEach((item) => {
      const itemElement = document.createElement("div");
      itemElement.className = "market-item";

      itemElement.innerHTML = `
        <img src="${item.img}" alt="${item.name}">
        <div>
          <p><strong>${item.name}</strong></p>
          <p>Price: $${item.value}</p>
        </div>
        <button class="buy-button">Buy</button>
      `;

      // Add event listener for the buy button
      const buyButton = itemElement.querySelector(".buy-button");
      buyButton.addEventListener("click", () => this.buyItem(item));

      this.marketBuyItemsContainer.appendChild(itemElement);
    });
  }

  buyItem(item) {
    if (this.game.localPlayer.balance >= item.value) {
      // Deduct the item cost from the player's balance
      this.game.localPlayer.balance -= item.value;

      // Add the item to the player's inventory
      const existingItem = this.game.localPlayer.inventory.find(
        (i) => i.name === item.name
      );
      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        this.game.localPlayer.inventory.push({ ...item });
      }

      // Update the UI
      this.updatePlayerMoney();
      this.game.uiManager.inventoryUI.renderInventory();
    } else {
      alert("Not enough money to buy this item!");
    }
  }

  updatePlayerMoney() {
    this.playerMoneyDisplay.innerText = this.game.localPlayer.balance;
  }
}

export default MarketUI;
