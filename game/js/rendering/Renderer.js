// /js/rendering/Renderer.js
class Renderer {
  constructor(game) {
    this.game = game;
    this.canvas = null;
    this.ctx = null;
    this.stage = null;
    this.players = [];
    this.img = null;
    this.map = null;

    // Tile Dimensions
    this.tileWidth = 64;
    this.tileHeight = 32; // Half the tile width for isometric view
  }

  setCanvas(canvas, ctx, stage) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.stage = stage;
  }

  setPlayers(players) {
    this.players = players;
  }

  setImage(img) {
    this.img = img;
  }

  setMap(map) {
    this.map = map;
  }

  draw() {
    if (!this.map) return; // Ensure gameMap is initialized
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.translate(
      this.game.offsetX + this.canvas.width / 2,
      this.game.offsetY + this.canvas.height / 2
    );
    this.ctx.scale(this.game.scale, this.game.scale);

    // Draw the map
    this.map.draw(this.ctx, this.img);

    // Draw players
    this.drawPlayers();
    this.ctx.restore();
  }

  tileToScreen(x, y) {
    const screenX = (x - y) * (this.tileWidth / 2);
    const screenY = ((x + y) * this.tileHeight) / 2;
    return { x: screenX, y: screenY };
  }

  createIsometricTilePath(ctx, x, y) {
    ctx.beginPath();
    ctx.moveTo(x, y + this.tileHeight / 2);
    ctx.lineTo(x + this.tileWidth / 2, y);
    ctx.lineTo(x + this.tileWidth, y + this.tileHeight / 2);
    ctx.lineTo(x + this.tileWidth / 2, y + this.tileHeight);
    ctx.closePath();
  }

  drawPlayers() {
    this.players.forEach((player) => {
      const interpolatedX = player.renderX;
      const interpolatedY = player.renderY;
      const { x: screenX, y: screenY } = this.tileToScreen(
        interpolatedX,
        interpolatedY
      );

      // Adjust player position to be centered on the tile
      const playerX = screenX + this.tileWidth / 4; // Center horizontally
      const playerY = screenY - this.tileHeight / 4; // Place on top of the tile

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

      this.ctx.drawImage(
        this.img,
        spriteX,
        spriteY,
        32,
        32,
        playerX,
        playerY,
        32,
        32
      );

      // Draw the fishing prompt if the player is facing water
      this.drawFishingPrompt(player);
      this.drawFishingLine(player);
    });
  }

  drawFishingPrompt(player) {
    if (
      player.playerFacingWater &&
      player.id == this.game.localPlayer.id &&
      !this.game.fishingMechanic.isFishing
    ) {
      // Draw the "Press 'F' to start Fishing" text above the player
      const { x: screenX, y: screenY } = this.tileToScreen(player.x, player.y);
      this.ctx.fillStyle = "white"; // Set text color to white
      this.ctx.font = "10px 'Press Start 2P'"; // Use the desired font
      this.ctx.textAlign = "center"; // Center the text above the player

      // Draw text slightly above the player's head (adjust as needed)
      this.ctx.fillText(
        "Press 'F' to start Fishing",
        screenX + this.tileWidth / 2,
        screenY - 10
      );
    }
  }

  drawFishingLine(player) {
    if (
      player.playerFacingWater &&
      player.id == this.game.localPlayer.id &&
      this.game.fishingMechanic.isFishing
    ) {
      // Get the screen coordinates of the player's position
      const { x: screenX, y: screenY } = this.tileToScreen(player.x, player.y);

      // Get the tile the player is facing
      const { x: tileX, y: tileY } = player.playerFacingTile();
      const { x: tileXPos, y: tileYPos } = this.tileToScreen(tileX, tileY);

      // Set the style for the fishing line
      this.ctx.strokeStyle = "lightblue"; // Light blue color for fishing line
      this.ctx.lineWidth = 1.5; // Thin line for fishing line
      this.ctx.setLineDash([5, 5]); // Dashed line effect

      const time = Date.now() / 1000;
      const swayOffset = Math.sin(time * 3) * 1.5; // Slight swaying effect

      // Calculate the control point for the Bezier curve (to create slack)
      const controlX = (screenX + tileXPos) / 2; // Midpoint between player and tile
      const controlY = (screenY + tileYPos) / 2 + 5 + swayOffset; // Slight slack (adjust 20 as needed)

      // Draw the Bezier curve (fishing line with slack)
      this.ctx.beginPath();
      this.ctx.moveTo(
        screenX + this.tileWidth / 2,
        screenY + this.tileHeight / 2
      ); // Start at player center
      this.ctx.quadraticCurveTo(
        controlX,
        controlY, // Control point for the curve
        tileXPos + this.tileWidth / 2,
        tileYPos + this.tileHeight / 2 + swayOffset // End point at the tile
      );
      this.ctx.stroke(); // Render the curved line

      // Draw the bobber at the end of the fishing line
      this.ctx.beginPath();
      this.ctx.arc(
        tileXPos + this.tileWidth / 2,
        tileYPos + this.tileHeight / 2 + swayOffset, // Position of the bobber
        3,
        0,
        Math.PI * 2 // Draw a small bobber (3px radius)
      );
      this.ctx.fillStyle = "red"; // Bobber or hook color
      this.ctx.fill();

      this.ctx.setLineDash([]); // Reset the dash
    }
  }
}

export default Renderer;
