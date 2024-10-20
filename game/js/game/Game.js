// /js/game/Game.js
import Renderer from "../rendering/Renderer.js";
import InputHandler from "../input/InputHandler.js";
import NetworkManager from "../network/NetworkManager.js";
import UIManager from "../ui/UIManager.js";
import Player from "../entities/Player.js";
import Map from "./Map.js";
import GameLoop from "./GameLoop.js";
import FishingMechanic from "../mechanics/FishingMechanic.js";
import MarketMechanic from "../mechanics/MarketMechanic.js";

class Game {
  constructor() {
    console.log("Game Script Loaded");

    // Canvas and Rendering Context
    this.canvas = document.querySelector("canvas");
    this.stage = document.querySelector("#stage");
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    // Initialize game components
    this.renderer = new Renderer(this);
    this.inputHandler = new InputHandler(this);
    this.networkManager = new NetworkManager(this);
    this.uiManager = new UIManager(this);
    this.fishingMechanic = new FishingMechanic(this);
    this.marketMechanic = new MarketMechanic(this);
    this.map = new Map(this);
    this.players = [];
    this.localPlayer = null;

    // Game State Variables
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    // Initialize
    this.init();
  }

  init() {
    // Load game assets
    this.img = new Image();
    this.img.onload = this.setup.bind(this); // Run setup after image has loaded
    this.img.src = "./assets/tileset.png";

    // Initialize player
    this.localPlayer = new Player(this);
    this.players.push(this.localPlayer);

    // Initialize components with references
    this.renderer.setCanvas(this.canvas, this.ctx, this.stage);
    this.renderer.setImage(this.img);
    this.renderer.setPlayers(this.players);
    this.renderer.setMap(this.map);

    this.inputHandler.setPlayer(this.localPlayer);
    this.uiManager.setPlayer(this.localPlayer);
    this.uiManager.setInventory(this.localPlayer.inventory);
    this.updatePlayerBalance();

    // Start the game loop will be called in setup()
  }

  setup() {
    console.log("Running Setup Function");

    // Resize canvas
    this.resizeCanvas();
    globalThis.addEventListener("resize", this.resizeCanvas.bind(this));

    // Setup event listeners
    this.setupEventListeners();

    // Start the game loop
    this.gameLoop = new GameLoop(this);
    this.gameLoop.start();

    // Connect to the WebSocket server
    this.networkManager.connect();
  }

  resizeCanvas() {
    this.canvas.width = globalThis.innerWidth;
    this.canvas.height = globalThis.innerHeight;

    const scaleX = globalThis.innerWidth / this.canvas.width;
    const scaleY = globalThis.innerHeight / this.canvas.height;
    const scaleToFit = Math.min(scaleX, scaleY);

    this.stage.style.transformOrigin = "0 0"; // Scale from the top left
    this.stage.style.transform = `scale(${scaleToFit})`;
  }

  setupEventListeners() {
    // Event listeners for panning, zooming, and movement
    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      const zoomAmount = 0.05;
      if (event.deltaY < 0) {
        this.scale += zoomAmount; // Zoom in
      } else {
        this.scale = Math.max(0.1, this.scale - zoomAmount); // Zoom out
      }
      this.renderer.draw();
    });

    // Event listeners for panning the canvas
    let isPanning = false;
    let startX, startY;
    this.canvas.addEventListener("mousedown", (event) => {
      isPanning = true;
      startX = event.clientX - this.offsetX;
      startY = event.clientY - this.offsetY;
    });

    this.canvas.addEventListener("mousemove", (event) => {
      if (!isPanning) return;
      this.offsetX = event.clientX - startX;
      this.offsetY = event.clientY - startY;
      this.renderer.draw();
    });

    this.canvas.addEventListener("mouseup", () => {
      isPanning = false;
    });

    this.canvas.addEventListener("mouseleave", () => {
      isPanning = false;
    });
  }

  update(deltaTime) {
    // Update game state, interpolate positions, etc.
    this.players.forEach((player) => player.update(deltaTime));
    this.uiManager.update(deltaTime);
  }

  updateGameState(data) {
    // Update game map and players
    this.map.setMap(data.gameMap);

    // Update the list of players
    this.players = data.players.map(
      (playerData) => new Player(this, playerData)
    );
    this.renderer.setPlayers(this.players);

    // Find and set your local player
    const player = this.players.find((p) => p.id === this.localPlayer.id);
    if (player) {
      this.localPlayer = player;
      this.updateInventory(data.inventory);
    }
  }

  updatePlayer(playerData) {
    const existingPlayer = this.players.find((p) => p.id === playerData.id);
    if (existingPlayer) {
      existingPlayer.updateData(playerData);
      this.updatePlayerBalance();
    } else {
      this.addNewPlayer(playerData);
      this.updatePlayerBalance();
    }
  }

  addNewPlayer(playerData) {
    const newPlayer = new Player(this, playerData);
    this.players.push(newPlayer);
    this.renderer.setPlayers(this.players);
  }

  removePlayer(playerId) {
    this.players = this.players.filter((p) => p.id !== playerId);
    this.renderer.setPlayers(this.players);
  }

  updateInventory(data) {
    this.localPlayer.inventory = data;
    this.uiManager.inventoryUI.renderInventory();
  }

  updatePlayerBalance() {
    this.uiManager.balanceUI.renderBalance();
  }
}

export default Game;
