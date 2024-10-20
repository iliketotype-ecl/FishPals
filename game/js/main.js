// Game Setup
console.log("Game Script Loaded");

// Canvas and Rendering Context
const canvas = document.querySelector("canvas");

const stage = document.querySelector("#stage");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// Background Music
const backgroundMusic = document.getElementById("background-music");
backgroundMusic.volume = 0.5; // Set initial volume

// Other UI Elements
const muteButton = document.getElementById("mute-button");
const volumeSlider = document.getElementById("volume-slider");

// Event Listeners
muteButton.addEventListener("click", () => {
  if (backgroundMusic.muted) {
    backgroundMusic.muted = false;
    muteButton.innerText = "Mute";
  } else {
    backgroundMusic.muted = true;
    muteButton.innerText = "Unmute";
  }
});

volumeSlider.addEventListener("input", () => {
  backgroundMusic.volume = volumeSlider.value;
});

// Start Game Button
const startGameButton = document.getElementById("start-game-button");
startGameButton.addEventListener("click", () => {
  // Start the game loop or any initialization you need
  gameLoop();

  // Play background music
  backgroundMusic.play().catch((error) => {
    console.error("Failed to play background music:", error);
  });

  // Hide the start button after starting the game
  startGameButton.style.display = "none";
});

// Event listener to open the fish market
marketButton.addEventListener("click", openFishMarket);

// Function to open the fish market
function openFishMarket() {
  updateFishMarket();
  fishMarketModal.style.display = "block";
}

// Function to update fish market with player's inventory
function updateFishMarket() {
  marketItemsContainer.innerHTML = ""; // Clear the container

  // Display each fish item from inventory
  playerInventory.forEach((item, index) => {
    const itemElement = document.createElement("div");
    itemElement.className = "market-item";
    itemElement.innerHTML = `
      <img src="${item.img}" alt="${item.name}" width="50">
      <span>${item.name} x${item.quantity}</span>
      <button data-index="${index}" class="sell-button">Sell ($${item.value})</button>
    `;
    marketItemsContainer.appendChild(itemElement);
  });

  // Update player's money display
  playerMoneyElement.innerText = playerMoney;
}

// Event listener for selling fish
marketItemsContainer.addEventListener("click", (event) => {
  if (event.target.classList.contains("sell-button")) {
    const index = event.target.getAttribute("data-index");
    sellFish(index);
  }
});

// Function to sell a fish
function sellFish(index) {
  const fish = playerInventory[index];
  if (fish && fish.quantity > 0) {
    // Increase player's money by fish value
    playerMoney += fish.value;
    // Decrease fish quantity
    fish.quantity -= 1;

    // Remove item from inventory if quantity is 0
    if (fish.quantity === 0) {
      playerInventory.splice(index, 1);
    }

    // Update the market and inventory displays
    updateFishMarket();
    renderInventory();
  }
}

// Close the fish market when the close button is clicked
fishMarketClose.addEventListener("click", () => {
  fishMarketModal.style.display = "none";
});

// Close the fish market when clicking outside the modal
globalThis.addEventListener("click", (event) => {
  if (event.target === fishMarketModal) {
    fishMarketModal.style.display = "none";
  }
});

// Game Assets
const img = new Image();
img.onload = setup; // Run setup after image has loaded
img.src = "./assets/tileset.png";

// Game State Variables
let gameMap = null;
let tileX = 0;
let tileY = 0;
let scale = 1; // Initial scale (1 = 100%)
let offsetX = 0;
let offsetY = 0;
let isPanning = false;
let startX, startY;
let playerDirection = "left";
let playerFacingWater = false;
const sightRange = 5; // Number of tiles in all directions
let players = [];
let playerInventory = [];

let fishingState = {
  isFishing: false,
  fishReady: false,
  catchWindowActive: false,
  timeLeft: 0,
  fishBiteTimeoutId: null,
  catchWindowTimeoutId: null,
  progressBarIntervalId: null,
};

// Initialize player's money
let playerMoney = 0;

// Get fish market elements
const fishMarketModal = document.getElementById("fish-market-modal");
const marketItemsContainer = document.getElementById("market-items-container");
const playerMoneyElement = document.getElementById("player-money");
const fishMarketClose = document.getElementById("fish-market-close");

// UI Elements
const fishingPopupContent = document.getElementById("fishing-popup-content");
const fishingPopup = document.getElementById("fishing-popup");
let fishingPopupConfirm = document.getElementById("fishing-popup-confirm");
let fishingPopupDeny = document.getElementById("fishing-popup-deny");
const progressBarTextElement = document.getElementById("progress-bar-text");
const progressBarElement = document.getElementById("progress-bar");
const progressBarContainer = document.querySelector(".progress-bar-container");

// Tile Dimensions
const tileWidth = 64;
const tileHeight = 32; // Half the tile width for isometric view

/**
 * Resizes the canvas to match the window dimensions and scales the game view accordingly.
 */
function resizeCanvas() {
  canvas.width = globalThis.innerWidth;
  canvas.height = globalThis.innerHeight;

  const scaleX = globalThis.innerWidth / canvas.width;
  const scaleY = globalThis.innerHeight / canvas.height;
  const scaleToFit = Math.min(scaleX, scaleY);

  stage.style.transformOrigin = "0 0"; // Scale from the top left
  stage.style.transform = `scale(${scaleToFit})`;
}

// Initial call to setup and resize canvas
resizeCanvas();
globalThis.addEventListener("resize", resizeCanvas);

/**
 * Converts grid coordinates to screen coordinates for rendering.
 * @param {number} x - The x-coordinate on the grid.
 * @param {number} y - The y-coordinate on the grid.
 * @returns {Object} An object with x and y properties representing screen coordinates.
 */
function tileToScreen(x, y) {
  const screenX = (x - y) * (tileWidth / 2);
  const screenY = ((x + y) * tileHeight) / 2;
  return { x: screenX, y: screenY };
}

function playerFacingTile(player) {
  let x = player.x; // Use `let` so we can modify it
  let y = player.y;

  // Adjust based on the direction the player is facing
  switch (
    player.direction // Ensure you're using `player.direction`
  ) {
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
      console.log("Unknown direction:", player.direction);
  }

  // Return the modified x and y as the coordinates of the tile the player is facing
  return { x, y };
}

/**
 * Initializes the game by setting up event listeners.
 */
function setup() {
  if (!ctx) {
    console.log("No Canvas detected");
    return;
  }
  console.log("Running Setup Function");
  // We don't call draw here since the game map is not yet initialized
}

/**
 * Updates the visibility of tiles based on the player's position.
 */
function updateVisibility() {
  if (!gameMap) return;
  for (let y = 0; y < gameMap.length; y++) {
    for (let x = 0; x < gameMap[y].length; x++) {
      const distance = Math.max(Math.abs(tileX - x), Math.abs(tileY - y));
      if (distance <= sightRange) {
        gameMap[y][x].visibility = "visible";
      } else if (gameMap[y][x].visibility === "visible") {
        gameMap[y][x].visibility = "explored";
      }
    }
  }
}

function createIsometricTilePath(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x, y + tileHeight / 2);
  ctx.lineTo(x + tileWidth / 2, y);
  ctx.lineTo(x + tileWidth, y + tileHeight / 2);
  ctx.lineTo(x + tileWidth / 2, y + tileHeight);
  ctx.closePath();
}

/**
 * Draws the game scene, including the map and the players.
 */
function draw() {
  if (!gameMap) return; // Ensure gameMap is initialized
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offsetX + canvas.width / 2, offsetY + canvas.height / 2);
  ctx.scale(scale, scale);

  // Draw the map
  for (let y = 0; y < gameMap.length; y++) {
    for (let x = 0; x < gameMap[y].length; x++) {
      const tile = gameMap[y][x];
      const { x: screenX, y: screenY } = tileToScreen(x, y);

      // Draw the base tile
      if (tile.type === 0) {
        ctx.drawImage(img, 64, 0, 64, 64, screenX, screenY, 64, 64);
      } else if (tile.type === 1) {
        ctx.drawImage(img, 0, 64, 64, 64, screenX, screenY, 64, 64);
      } else if (tile.type === 2) {
        ctx.drawImage(img, 0, 0, 64, 64, screenX, screenY, 64, 64);
      }

      // Apply fog overlay if necessary
      if (tile.visibility === "explored") {
        ctx.save();
        createIsometricTilePath(ctx, screenX, screenY);
        ctx.clip();

        // Create a gradient
        const gradient = ctx.createLinearGradient(
          screenX,
          screenY,
          screenX,
          screenY + tileHeight
        );
        gradient.addColorStop(0, "rgba(0, 0, 0, 0.1)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(screenX, screenY, tileWidth, tileHeight);

        ctx.restore();
      }
    }
  }

  // Draw players
  drawPlayers();
  ctx.restore();
}

/**
 * Draws all players on the map.
 */
function drawPlayers() {
  players.forEach((player) => {
    const interpolatedX = player.renderX;
    const interpolatedY = player.renderY;
    const { x: screenX, y: screenY } = tileToScreen(
      interpolatedX,
      interpolatedY
    );

    // Adjust player position to be centered on the tile
    const playerX = screenX + tileWidth / 4; // Center horizontally
    const playerY = screenY - tileHeight / 4; // Place on top of the tile

    // Choose the correct sprite based on the direction
    let spriteX, spriteY;
    if (player.direction === "up") {
      spriteX = 64;
      spriteY = 96;
    } else if (player.direction === "down") {
      spriteX = 96;
      spriteY = 64;
    } else if (player.direction === "left") {
      spriteX = 64;
      spriteY = 96;
    } else if (player.direction === "right") {
      spriteX = 64;
      spriteY = 64;
    }

    ctx.drawImage(img, spriteX, spriteY, 32, 32, playerX, playerY, 32, 32);

    // Draw the fishing prompt if the player is facing water
    drawFishingPrompt(player);
    drawFishingLine(player);
  });
}

/**
 * Initiates player movement in the specified direction.
 * @param {string} direction - Direction to move ("up", "down", "left", "right").
 */
function movePlayer(direction) {
  const moveMessage = {
    type: "move",
    player: { id: globalThis.playerId },
    data: direction, // Send direction as data
  };
  socket.send(JSON.stringify(moveMessage));
}

/**
 * Initiates the fishing process.
 */
function fish() {
  fishingState.isFishing = true;
  const actionMessage = {
    type: "action",
    player: { id: globalThis.playerId },
    data: {
      actionType: "fish",
      direction: playerDirection,
    },
  };
  socket.send(JSON.stringify(actionMessage));
}

/**
 * Starts the fishing UI when a fish is ready.
 */
function startFishingUI() {
  console.log("startFishingUI called");
  fishingState.catchWindowActive = true;
  fishingPopup.style.display = "flex";
  fishingPopup.querySelector("h2").innerHTML =
    "You got one! Press Space to reel it in!";
  fishingPopupConfirm.style.display = "none";
  fishingPopupDeny.style.display = "none";

  // Add event listener for catch attempt
  document.addEventListener("keydown", onCatchAttempt);
}

function rarityToString(Fish) {
  if (Fish.rarity >= 60) {
    return "Common";
  } else if (Fish.rarity >= 30) {
    return "Uncommon";
  } else if (Fish.rarity >= 15) {
    return "Rare";
  } else if (Fish.rarity >= 0) {
    return "Ultra-Rare";
  }
}

/**
 * Handles showing the caught fish to the player.
 */
function showFishToPlayer(fish) {
  // Update the fishing popup
  fishingPopup.style.display = "flex"; // Use display instead of visibility

  // Clear previous content in the content container
  fishingPopupContent.innerHTML = "";

  // Create elements to display fish information
  const title = document.createElement("h2");
  title.innerHTML = `Wow, you caught a ${fish.name}!`;

  const fishImage = document.createElement("img");
  fishImage.src = fish.img;
  fishImage.alt = fish.name;
  fishImage.style.width = "64px"; // Adjust as needed
  fishImage.style.height = "auto";

  const fishInfo = document.createElement("div");
  fishInfo.innerHTML = `<p><strong>Name:</strong> ${fish.name}</p>
    <p><strong>Value:</strong> $${fish.value}</p>
    <p><strong>Rarity:</strong> ${rarityToString(fish)}</p>
  `;

  const closeButton = document.createElement("button");
  closeButton.innerText = "Close";
  closeButton.onclick = () => {
    fishingPopup.style.display = "none";
    resetFishingUI();
  };

  // Append elements to the content container
  fishingPopupContent.appendChild(title);
  fishingPopupContent.appendChild(fishImage);
  fishingPopupContent.appendChild(fishInfo);
  fishingPopupContent.appendChild(closeButton);

  // Hide confirm and deny buttons if they are present
  if (fishingPopupConfirm) fishingPopupConfirm.style.display = "none";
  if (fishingPopupDeny) fishingPopupDeny.style.display = "none";
}
/**
 * Resets the fishing UI and state.
 */
function resetFishingUI() {
  // Hide the fishing popup
  fishingPopup.style.display = "none";
  // Reset fishing popup content
  fishingPopupContent.innerHTML = `
    <h2>Do you want to start fishing?</h2>
    <button id="fishing-popup-confirm">Yes</button>
    <button id="fishing-popup-deny">No</button>
  `;
  // Re-bind event listeners for the buttons
  fishingPopupConfirm = document.getElementById("fishing-popup-confirm");
  fishingPopupDeny = document.getElementById("fishing-popup-deny");
  fishingPopupConfirm.addEventListener("click", startFishingUI);
  fishingPopupDeny.addEventListener("click", cancelFishing);
  fishingState.catchWindowActive = false;
  fishingState.isFishing = false;
}

/**
 * Handles the player's attempt to catch the fish.
 * @param {KeyboardEvent} event - The keyboard event triggered by the player's input.
 */
function onCatchAttempt(event) {
  if (event.key === " " && fishingState.catchWindowActive) {
    // Send a 'catchAttempt' message to the server
    const catchMessage = {
      type: "catchAttempt",
      player: { id: globalThis.playerId },
    };
    socket.send(JSON.stringify(catchMessage));
    // Remove the event listener to prevent multiple attempts
    document.removeEventListener("keydown", onCatchAttempt);
  }
}

/**
 * Cancels the fishing process when the player denies the fishing prompt.
 */
function cancelFishing() {
  fishingPopup.style.display = "none";
  fishingState.isFishing = false;
}

/**
 * Draws the "Press 'F' to start Fishing" prompt above the player's model.
 * @param {Object} player - The player object containing position and state.
 */
function drawFishingPrompt(player) {
  if (
    player.playerFacingWater &&
    player.id == globalThis.playerId &&
    !fishingState.isFishing
  ) {
    // Draw the "Press 'F' to start Fishing" text above the player
    const { x: screenX, y: screenY } = tileToScreen(player.x, player.y);
    ctx.fillStyle = "white"; // Set text color to white
    ctx.font = "10px 'Press Start 2P'"; // Use the desired font
    ctx.textAlign = "center"; // Center the text above the player

    // Draw text slightly above the player's head (adjust as needed)
    ctx.fillText(
      "Press 'F' to start Fishing",
      screenX + tileWidth / 2,
      screenY - 10
    );
  }
}
function drawFishingLine(player) {
  if (
    player.playerFacingWater &&
    player.id == globalThis.playerId &&
    fishingState.isFishing
  ) {
    console.log("Drawing fishing line...");

    // Get the screen coordinates of the player's position
    const { x: screenX, y: screenY } = tileToScreen(player.x, player.y);

    // Get the tile the player is facing
    const { x: tileX, y: tileY } = playerFacingTile(player);
    const { x: tileXPos, y: tileYPos } = tileToScreen(tileX, tileY);

    // Set the style for the fishing line
    ctx.strokeStyle = "lightblue"; // Light blue color for fishing line
    ctx.lineWidth = 1.5; // Thin line for fishing line
    ctx.setLineDash([5, 5]); // Dashed line effect

    const time = Date.now() / 1000;
    const swayOffset = Math.sin(time * 3) * 1.5; // Slight swaying effect

    // Calculate the control point for the Bezier curve (to create slack)
    const controlX = (screenX + tileXPos) / 2; // Midpoint between player and tile
    const controlY = (screenY + tileYPos) / 2 + 5 + swayOffset; // Slight slack (adjust 20 as needed)

    // Draw the Bezier curve (fishing line with slack)
    ctx.beginPath();
    ctx.moveTo(screenX + tileWidth / 2, screenY + tileHeight / 2); // Start at player center
    ctx.quadraticCurveTo(
      controlX,
      controlY, // Control point for the curve
      tileXPos + tileWidth / 2,
      tileYPos + tileHeight / 2 + swayOffset // End point at the tile
    );
    ctx.stroke(); // Render the curved line

    // Draw the bobber at the end of the fishing line
    ctx.beginPath();
    ctx.arc(
      tileXPos + tileWidth / 2,
      tileYPos + tileHeight / 2 + swayOffset, // Position of the bobber
      3,
      0,
      Math.PI * 2 // Draw a small bobber (3px radius)
    );
    ctx.fillStyle = "red"; // Bobber or hook color
    ctx.fill();

    ctx.setLineDash([]); // Reset the dash
  }
}

// Event listeners for panning, zooming, and movement
canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const zoomAmount = 0.05;
  if (event.deltaY < 0) {
    scale += zoomAmount; // Zoom in
  } else {
    scale = Math.max(0.1, scale - zoomAmount); // Zoom out
  }
  draw();
});

// Keyboard input for movement and fishing
document.addEventListener("keydown", (e) => {
  if (e.key === "w") movePlayer("up");
  else if (e.key === "s") movePlayer("down");
  else if (e.key === "a") movePlayer("left");
  else if (e.key === "d") movePlayer("right");
  else if (e.key === "f") fish();
});

// Event listeners for panning the canvas
canvas.addEventListener("mousedown", (event) => {
  isPanning = true;
  startX = event.clientX - offsetX;
  startY = event.clientY - offsetY;
});

canvas.addEventListener("mousemove", (event) => {
  if (!isPanning) return;
  offsetX = event.clientX - startX;
  offsetY = event.clientY - startY;
  draw();
});

canvas.addEventListener("mouseup", () => {
  isPanning = false;
});

canvas.addEventListener("mouseleave", () => {
  isPanning = false;
});

// Event listeners for fishing popup buttons
fishingPopupConfirm.addEventListener("click", startFishingUI);
fishingPopupDeny.addEventListener("click", cancelFishing);

// WebSocket connection
let socket;

function connectWebSocket() {
  socket = new WebSocket("ws://localhost:8081/ws");

  // Attach event listeners
  socket.addEventListener("open", onSocketOpen);
  socket.addEventListener("message", onSocketMessage);
  socket.addEventListener("close", onSocketClose);
  socket.addEventListener("error", onSocketError);
}

function onSocketOpen(event) {
  console.log("Connected to the WebSocket server");

  // Generate a unique player ID
  const playerId = generateUniqueId();
  globalThis.playerId = playerId; // Store it globally for access in other functions

  // Send a 'join' message to the server
  const joinMessage = {
    type: "join",
    player: {
      id: playerId,
      x: tileX,
      y: tileY,
      direction: playerDirection,
    },
  };
  socket.send(JSON.stringify(joinMessage));
}

function onSocketMessage(event) {
  const message = JSON.parse(event.data);
  handleServerMessage(message);
}

function onSocketClose(event) {
  console.log("Disconnected from the WebSocket server");
  // Attempt to reconnect after a delay
  setTimeout(function () {
    console.log("Attempting to reconnect...");
    connectWebSocket();
  }, 5000); // Reconnect after 5 seconds
}

function onSocketError(error) {
  console.error("WebSocket error:", error);
}

connectWebSocket(); // Initialize the WebSocket connection

function generateUniqueId() {
  // Simple example using current timestamp and a random number
  return "player-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function handleServerMessage(message) {
  switch (message.type) {
    case "gameState":
      updateGameState(message.data);
      break;
    case "playerUpdate":
      updatePlayer(message.player);
      break;
    case "newPlayer":
      addNewPlayer(message.player);
      break;
    case "playerLeft":
      removePlayer(message.data);
      break;
    case "fishingEvent":
      handleFishingEvent(message.data);
      break;
    case "inventoryUpdate":
      updateInventory(message.data);
      break;
    default:
      console.warn("Unknown message type:", message.type);
  }
}

function updateGameState(data) {
  // Set the game map received from the server
  gameMap = data.gameMap;

  // Update the list of players
  players = data.players;

  // Set your player's initial position and direction
  const player = players.find((p) => p.id === globalThis.playerId);
  if (player) {
    tileX = player.x;
    tileY = player.y;
    playerDirection = player.direction;
  }

  // Update visibility based on the new position
  updateVisibility();
}

function updateInventory(inventoryData) {
  playerInventory = inventoryData;
  // Update the inventory UI
  renderInventory();
}

function renderInventory() {
  const inventoryContainer = document.getElementById("inventory-container");
  inventoryContainer.innerHTML = ""; // Clear existing items

  playerInventory.forEach((item) => {
    const itemElement = document.createElement("div");
    itemElement.className = "inventory-item";
    itemElement.innerHTML = `
      <img src="${item.img}" alt="${item.name}">
      <span>${item.name} x${item.quantity}</span>
    `;
    inventoryContainer.appendChild(itemElement);
  });
}

function updatePlayer(playerData) {
  if (playerData.id === globalThis.playerId) {
    // Update your own player
    tileX = playerData.x;
    tileY = playerData.y;
    playerDirection = playerData.direction;
    playerFacingWater = playerData.facingWater;
  }

  const existingPlayer = players.find((p) => p.id === playerData.id);
  if (existingPlayer) {
    existingPlayer.x = playerData.x;
    existingPlayer.y = playerData.y;
    existingPlayer.direction = playerData.direction;
    existingPlayer.playerFacingWater = playerData.facingWater;
  } else {
    players.push(playerData);
  }
  draw();
}

function addNewPlayer(playerData) {
  players.push(playerData);
  draw();
}

function removePlayer(playerId) {
  players = players.filter((p) => p.id !== playerId);
  draw();
}

function handleFishingEvent(data) {
  if (data.playerId === globalThis.playerId) {
    switch (data.event) {
      case "start":
        startFishingUI();
        break;
      case "catch":
        resetFishingUI();
        showFishToPlayer(data.fish);
        break;
      case "fail":
        alert("The fish got away!");
        resetFishingUI();
        break;
      default:
        console.warn("Unknown fishing event:", data.event);
    }
  }
}

let lastUpdateTime = Date.now();

function interpolatePlayerPositions() {
  const now = Date.now();
  const deltaTime = now - lastUpdateTime;
  lastUpdateTime = now;

  players.forEach((player) => {
    if (player.prevX !== undefined && player.prevY !== undefined) {
      const t = deltaTime / 100;
      player.renderX = player.renderX + (player.x - player.renderX) * t;
      player.renderY = player.renderY + (player.y - player.renderY) * t;
    } else {
      player.renderX = player.x;
      player.renderY = player.y;
    }

    player.prevX = player.x;
    player.prevY = player.y;
  });
}

function gameLoop() {
  interpolatePlayerPositions();
  draw();
  requestAnimationFrame(gameLoop);
}

// Ensure event listeners are attached after the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  fishingPopupConfirm.addEventListener("click", startFishingUI);
  fishingPopupDeny.addEventListener("click", cancelFishing);
});
