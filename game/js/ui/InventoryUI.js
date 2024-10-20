// /js/ui/InventoryUI.js
class InventoryUI {
  constructor(game) {
    this.game = game;
    this.inventoryContainer = document.getElementById("inventory-container");
  }

  renderInventory() {
    this.inventoryContainer.innerHTML = ""; // Clear existing items

    this.game.localPlayer.inventory.forEach((item) => {
      const itemElement = document.createElement("div");
      itemElement.className = "inventory-item";
      itemElement.innerHTML = `
          <img src="${item.img}" alt="${item.name}">
          <span>${item.name} x${item.quantity}</span>
        `;
      this.inventoryContainer.appendChild(itemElement);
    });
  }

  draw(ctx) {
    // Optionally draw inventory UI on canvas
  }
}

export default InventoryUI;
