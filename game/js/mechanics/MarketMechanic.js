// /js/mechanics/MarketMechanic.js

class MarketMechanic {
  constructor(game) {
    this.game = game;
  }
  /** Sends a buyItem message to the server containing the Item(s) to be bought
   *
   * @param {*} item
   */
  startBuy(item) {
    const buyMessage = {
      type: "action",
      player: { id: this.game.localPlayer.id },
      data: { actionType: "buyItem", item: item },
    };
    this.game.networkManager.sendMessage(buyMessage);
  }

  /** Sends a sellItem message to the server containing the Item(s) to be sold
   *
   * @param {*} item
   */
  startSell(item) {
    const sellMessage = {
      type: "action",
      player: { id: this.game.localPlayer.id },
      data: { actionType: "sellItem", item: item },
    };
    this.game.networkManager.sendMessage(sellMessage);
  }

  handleMarketEvent(data) {
    if (data.playerId === this.game.localPlayer.id) {
      switch (data.event) {
        case "itemSold":
          this.game.uiManager.marketUI.renderSellItems();
          break;
        case "itemBought":
          this.game.uiManager.marketUI.renderBuyItems();
          break;
        default:
          console.warn("Unknown Market event:", data.event);
      }
    }
  }
}

export default MarketMechanic;
