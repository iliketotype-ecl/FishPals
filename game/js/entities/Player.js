// /js/entities/Player.js
class Player {
  constructor(game, data = {}) {
    this.game = game;
    this.id = data.id || this.getPlayerId();
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.direction = data.direction || "down";
    this.renderX = this.x;
    this.renderY = this.y;
    this.playerFacingWater = data.facingWater || false;
    this.balance = data.balance || 0;
    this.inventory = data.inventory || [];
  }

  generateUniqueId() {
    const localPlayerId =
      "player-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    localStorage.setItem("Player", localPlayerId);
    return localPlayerId; // Return the generated ID
  }

  getPlayerId() {
    // Retrieve existing ID from localStorage or generate a new one
    let localPlayerId = localStorage.getItem("Player");
    if (!localPlayerId) {
      localPlayerId = this.generateUniqueId(); // Generate new ID if not found
    }
    return localPlayerId;
  }

  update(deltaTime) {
    // Update player state
    const t = deltaTime / 100;
    this.renderX += (this.x - this.renderX) * t;
    this.renderY += (this.y - this.renderY) * t;
  }

  updateData(data) {
    this.x = data.x;
    this.y = data.y;
    this.direction = data.direction;
    this.playerFacingWater = data.facingWater;
    this.balance = data.balance;
  }

  move(direction) {
    // Send movement to server via NetworkManager
    if (!this.game.fishingMechanic.isFishing) {
      const moveMessage = {
        type: "move",
        player: { id: this.id },
        data: direction,
      };
      this.game.networkManager.sendMessage(moveMessage);
    }
  }
  playerFacingTile() {
    let x = this.x;
    let y = this.y;

    // Adjust based on the direction the player is facing
    switch (this.direction) {
      case "up":
        y -= 1;
        break;
      case "down":
        y += 1;
        break;
      case "left":
        x -= 1;
        break;
      case "right":
        x += 1;
        break;
      default:
        console.log("Unknown direction:", this.direction);
    }

    return { x, y };
  }
}

export default Player;
