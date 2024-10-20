// /js/input/InputHandler.js
class InputHandler {
  constructor(game) {
    this.game = game;
    this.player = null;
    this.init();
  }

  setPlayer(player) {
    this.player = player;
  }

  init() {
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  handleKeyDown(e) {
    if (!this.player || this.game.uiManager.fishingUI.isVisible) return;
    if (e.key === "w") this.player.move("up");
    else if (e.key === "s") this.player.move("down");
    else if (e.key === "a") this.player.move("left");
    else if (e.key === "d") this.player.move("right");
    else if (e.key === "f") {
      this.game.fishingMechanic.startFishing();
    } else {
      return;
    }
  }
}

export default InputHandler;
