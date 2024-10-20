// /js/ui/FishingUI.js
class FishingUI {
  constructor(game) {
    this.game = game;
    this.isVisible = false;
    this.isCatchWindowActive = false;
    // Initialize DOM elements
    this.fishingPopup = document.getElementById("fishing-popup");
    this.fishingPopupContent = document.getElementById("fishing-popup-content");
    this.progressBarContainer = this.fishingPopup.querySelector(
      ".progress-bar-container"
    );
    this.progressBar = document.getElementById("progress-bar");

    // Timer properties
    this.catchWindowDuration = 3000; // 3 seconds
    this.catchWindowStartTime = null;
    this.progressBarInterval = null;
  }

  confirmFishing() {
    // Start the fishing mechanic
    this.game.fishingMechanic.startFishing();
    // Update the popup message
    this.fishingPopupContent.querySelector("h2").innerText =
      "Waiting for a bite...";
  }

  startCatchWindow() {
    this.isVisible = true;
    this.isCatchWindowActive = true;
    // Display the "Press space to catch" message
    this.fishingPopup.style.display = "block";
    this.fishingPopupContent.querySelector("h2").innerText =
      "You got one! Press Space to reel it in!";
    // Show the progress bar
    this.progressBarContainer.style.display = "block";
    // Reset the progress bar width
    this.progressBar.style.width = "100%";
    // Start the timer
    this.catchWindowStartTime = Date.now();
    this.progressBarInterval = setInterval(
      this.updateProgressBar.bind(this),
      16
    ); // Approx 60 FPS

    // Add event listener for catching the fish
    document.addEventListener("keydown", this.onCatchAttempt);
  }

  updateProgressBar() {
    const elapsedTime = Date.now() - this.catchWindowStartTime;
    const remainingTime = this.catchWindowDuration - elapsedTime;
    const progressPercentage = (remainingTime / this.catchWindowDuration) * 100;

    if (remainingTime <= 0) {
      // Time's up, fail the catch
      this.onCatchTimeout();
    } else {
      // Update progress bar width
      this.progressBar.style.width = `${progressPercentage}%`;
    }
  }

  onCatchAttempt = (event) => {
    if (event.key === " " && this.isCatchWindowActive) {
      // Player attempted to catch the fish
      this.stopProgressBar();
      this.game.fishingMechanic.attemptCatch();
      this.isCatchWindowActive = false;
      document.removeEventListener("keydown", this.onCatchAttempt);
    }
  };

  onCatchTimeout() {
    // Player failed to catch the fish in time
    this.stopProgressBar();
    this.game.fishingMechanic.failCatch();
    document.removeEventListener("keydown", this.onCatchAttempt.bind(this));
  }

  stopProgressBar() {
    clearInterval(this.progressBarInterval);
    this.progressBarInterval = null;
    this.progressBarContainer.style.display = "none";
  }

  cancelFishing() {
    this.fishingPopup.style.display = "none";
    this.game.fishingMechanic.isFishing = false;
  }

  resetFishingUI() {
    // Hide the fishing popup
    this.fishingPopup.style.display = "none";
    this.fishingPopupContent.innerHTML = "<h2></h2>";
    // Reset fishing popup content
    // Hide the progress bar
    this.progressBarContainer.style.display = "none";
    // Reset fishing mechanic state
    this.game.fishingMechanic.resetState();
    this.isVisible = false;
    this.isCatchWindowActive = false;
    document.removeEventListener("keydown", this.onCatchAttempt);
  }

  showFishToPlayer(fish) {
    // Display the fish information
    this.isCatchWindowActive = false;
    this.fishingPopupContent.innerHTML = `
      <h2>Wow, you caught a ${fish.name}!</h2>
      <img src="${fish.img}" alt="${fish.name}" width="64" ">
      <div>
        <p><strong>Name:</strong> ${fish.name}</p>
        <p><strong>Value:</strong> $${fish.value}</p>
        <p><strong>Rarity:</strong> ${this.rarityToString(fish)}</p>
      </div>
      <button id="close-button">Close</button>
    `;
    // Hide the progress bar
    this.progressBarContainer.style.display = "none";
    // Bind the close button event
    const closeButton = document.getElementById("close-button");
    closeButton.addEventListener("click", () => {
      this.fishingPopup.style.display = "none";
      this.resetFishingUI();
      this.game.fishingMechanic.resetState();
    });
  }

  rarityToString(fish) {
    if (fish.rarity >= 60) {
      return "Common";
    } else if (fish.rarity >= 30) {
      return "Uncommon";
    } else if (fish.rarity >= 15) {
      return "Rare";
    } else {
      return "Ultra-Rare";
    }
  }
}

export default FishingUI;
