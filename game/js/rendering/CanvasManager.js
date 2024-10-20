// /js/rendering/CanvasManager.js
class CanvasManager {
  constructor() {
    this.canvas = document.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.initCanvas();
  }

  initCanvas() {
    this.resizeCanvas();
    globalThis.addEventListener("resize", this.resizeCanvas.bind(this));
  }

  resizeCanvas() {
    this.canvas.width = globalThis.innerWidth;
    this.canvas.height = globalThis.innerHeight;
    // Additional scaling if needed
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

export default CanvasManager;
