// /js/mechanics/MarketMechanic.js

class MarketMechanic {
  constructor(game) {
    this.game = game;
  }

  startSell(item) {
    // Send a sellItem message to the server containing the Item(s) to be sold
    console.log(item);
    const catchMessage = {
      type: "action",
      player: { id: this.game.localPlayer.id },
      data: { actionType: "sellItem", item: item },
    };
    this.game.networkManager.sendMessage(catchMessage);
  }
  handleItemSellEvent(data) {
    if (data.playerId === this.game.localPlayer.id) {
      switch (data.event) {
        case "itemSold":
          this.game.uiManager.marketUI.renderMarketItems();
          break;
        default:
          console.warn("Unknown Item Sell event:", data.event);
      }
    }
  }
}

export default MarketMechanic;
