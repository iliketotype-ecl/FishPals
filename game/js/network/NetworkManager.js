// /js/network/NetworkManager.js
class NetworkManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
  }

  connect() {
    this.socket = new WebSocket("ws://localhost:8081/ws");

    // Attach event listeners
    this.socket.addEventListener("open", this.onSocketOpen.bind(this));
    this.socket.addEventListener("message", this.onSocketMessage.bind(this));
    this.socket.addEventListener("close", this.onSocketClose.bind(this));
    this.socket.addEventListener("error", this.onSocketError.bind(this));
  }

  onSocketOpen(event) {
    console.log("Connected to the WebSocket server");

    // Send a 'join' message to the server
    const joinMessage = {
      type: "join",
      player: {
        id: this.game.localPlayer.id,
        x: this.game.localPlayer.x,
        y: this.game.localPlayer.y,
        direction: this.game.localPlayer.direction,
      },
    };
    this.sendMessage(joinMessage);
  }

  onSocketMessage(event) {
    const message = JSON.parse(event.data);
    this.handleServerMessage(message);
  }

  onSocketClose(event) {
    console.log("Disconnected from the WebSocket server");
    // Attempt to reconnect after a delay
    setTimeout(() => {
      console.log("Attempting to reconnect...");
      this.connect();
    }, 5000); // Reconnect after 5 seconds
  }

  onSocketError(error) {
    console.error("WebSocket error:", error);
  }

  handleServerMessage(message) {
    switch (message.type) {
      case "gameState":
        this.game.updateGameState(message.data);
        this.game.updatePlayer(message.player);
        break;
      case "playerUpdate":
        this.game.updatePlayer(message.player);
        break;
      case "newPlayer":
        this.game.addNewPlayer(message.player);
        break;
      case "playerLeft":
        this.game.removePlayer(message.data);
        break;
      case "fishingEvent":
        this.game.fishingMechanic.handleFishingEvent(message.data);
        break;
      case "sellEvent":
        this.game.marketMechanic.handleItemSellEvent(message.data);
        break;
      case "inventoryUpdate":
        this.game.updateInventory(message.data);
        break;
      default:
        console.warn("Unknown message type:", message.type);
    }
  }

  sendMessage(message) {
    this.socket.send(JSON.stringify(message));
  }
}

export default NetworkManager;
