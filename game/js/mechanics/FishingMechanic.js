// /js/mechanics/FishingMechanic.js
class FishingMechanic {
  constructor(game) {
    this.game = game;
    this.isFishing = false;
  }

  startFishing() {
    if (!this.isFishing & this.game.localPlayer.playerFacingWater) {
      // Send a message to the server to start fishing
      this.isFishing = true;
      const actionMessage = {
        type: "action",
        player: { id: this.game.localPlayer.id },
        data: {
          actionType: "fish",
          direction: this.game.localPlayer.direction,
        },
      };
      this.game.networkManager.sendMessage(actionMessage);
    }
  }

  handleFishingEvent(data) {
    if (data.playerId === this.game.localPlayer.id) {
      switch (data.event) {
        case "start":
          // Start the catch window in the UI
          this.game.uiManager.fishingUI.startCatchWindow();
          break;
        case "catch":
          // Player successfully caught a fish
          this.game.uiManager.fishingUI.showFishToPlayer(data.fish);
          break;
        case "fail":
          // Player failed to catch the fish
          this.isFishing = false;
          this.game.uiManager.fishingUI.resetFishingUI();
          break;
        default:
          console.warn("Unknown fishing event:", data.event);
      }
    }
  }

  attemptCatch() {
    // Send a catch attempt message to the server
    if (this.game.uiManager.fishingUI.isVisible) {
      const catchMessage = {
        type: "catchAttempt",
        player: { id: this.game.localPlayer.id },
      };
      this.game.networkManager.sendMessage(catchMessage);
    }
  }

  failCatch() {
    // Inform the server that the catch failed
    const failMessage = {
      type: "catchFail",
      player: { id: this.game.localPlayer.id },
    };
    this.game.networkManager.sendMessage(failMessage);
    // Reset the UI
    this.game.uiManager.fishingUI.resetFishingUI();
  }

  resetState() {
    this.isFishing = false;
  }
}

export default FishingMechanic;
