// /js/game/Map.js
class Map {
  constructor(game) {
    this.game = game;
    this.gameMap = null;
    this.sightRange = 5;
  }

  setMap(gameMap) {
    this.gameMap = gameMap;
    this.updateVisibility();
  }

  updateVisibility() {
    if (!this.gameMap) return;
    const tileX = this.game.localPlayer.x;
    const tileY = this.game.localPlayer.y;
    for (let y = 0; y < this.gameMap.length; y++) {
      for (let x = 0; x < this.gameMap[y].length; x++) {
        const distance = Math.max(Math.abs(tileX - x), Math.abs(tileY - y));
        if (distance <= this.sightRange) {
          this.gameMap[y][x].visibility = "visible";
        } else if (this.gameMap[y][x].visibility === "visible") {
          this.gameMap[y][x].visibility = "explored";
        }
      }
    }
  }

  draw(ctx, img) {
    if (!this.gameMap) return;
    for (let y = 0; y < this.gameMap.length; y++) {
      for (let x = 0; x < this.gameMap[y].length; x++) {
        const tile = this.gameMap[y][x];
        const { x: screenX, y: screenY } = this.game.renderer.tileToScreen(
          x,
          y
        );

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
          this.game.renderer.createIsometricTilePath(ctx, screenX, screenY);
          ctx.clip();

          // Create a gradient
          const gradient = ctx.createLinearGradient(
            screenX,
            screenY,
            screenX,
            screenY + this.game.renderer.tileHeight
          );
          gradient.addColorStop(0, "rgba(0, 0, 0, 0.1)");
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = gradient;
          ctx.fillRect(
            screenX,
            screenY,
            this.game.renderer.tileWidth,
            this.game.renderer.tileHeight
          );

          ctx.restore();
        }
      }
    }
  }
}

export default Map;
