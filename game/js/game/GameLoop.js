// /js/game/GameLoop.js
class GameLoop {
  constructor(game) {
    this.game = game;
    this.lastUpdateTime = Date.now();
  }

  start() {
    requestAnimationFrame(this.loop.bind(this));
  }

  loop() {
    const now = Date.now();
    const deltaTime = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    this.game.update(deltaTime);
    this.game.renderer.draw();

    requestAnimationFrame(this.loop.bind(this));
  }
}

export default GameLoop;
