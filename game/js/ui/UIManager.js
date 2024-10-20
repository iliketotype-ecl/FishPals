// /js/ui/UIManager.js
import FishingUI from "./FishingUI.js";
import InventoryUI from "./InventoryUI.js";
import MarketUI from "./MarketUI.js";
import BalanceUI from "./BalanceUI.js";

class UIManager {
  constructor(game) {
    this.game = game;
    this.fishingUI = new FishingUI(this.game);
    this.inventoryUI = new InventoryUI(this.game);
    this.marketUI = new MarketUI(this.game);
    this.balanceUI = new BalanceUI(this.game);
  }

  setPlayer(player) {
    this.player = player;
  }

  setInventory(inventory) {
    this.inventory = inventory;
  }

  update(deltaTime) {
    // Update UI elements if needed
  }

  draw(ctx) {
    // Draw UI overlays on top of the game
    this.fishingUI.draw(ctx);
    this.inventoryUI.draw(ctx);
    this.marketUI.draw(ctx);
    this.balanceUI.draw(ctx);
    // Draw other UI components
  }
}

export default UIManager;
