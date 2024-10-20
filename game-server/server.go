package main

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"sync"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"github.com/gorilla/websocket"
)

// Initialize loggers for different levels.
var (
    InfoLogger    *log.Logger
    WarningLogger *log.Logger
    ErrorLogger   *log.Logger
    DebugLogger   *log.Logger
)

// Initialize the loggers.
func init() {
    InfoLogger = log.New(os.Stdout, "INFO: ", log.Ldate|log.Ltime|log.Lshortfile)
    WarningLogger = log.New(os.Stdout, "WARNING: ", log.Ldate|log.Ltime|log.Lshortfile)
    ErrorLogger = log.New(os.Stderr, "ERROR: ", log.Ldate|log.Ltime|log.Lshortfile)
    DebugLogger = log.New(os.Stdout, "DEBUG: ", log.Ldate|log.Ltime|log.Lshortfile)

    	// Replace with your MySQL connection details
	dsn := "root:Ele!10126593@tcp(127.0.0.1:3306)/fish_pals"
	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		ErrorLogger.Fatalf("Error connecting to database: %v", err)
	}

	// Test the database connection
	err = db.Ping()
	if err != nil {
		ErrorLogger.Fatalf("Database connection failed: %v", err)
	}

	InfoLogger.Println("MySQL database connection established")
}

// **WebSocket Upgrader**
// Upgrades HTTP connections to WebSocket connections.
// The `CheckOrigin` function is set to allow connections from any origin.
// In a production environment, you should restrict this for security.
var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true
    },
}

// **Synchronization Mutex**
// A mutex to protect shared resources like the `players` map and `fishingChannels`.
var mu sync.Mutex

// **Players Map**
// Stores connected players with their unique IDs as keys.
var players = make(map[string]*Player)

// **Game Map**
// A 2D slice representing the game world grid, consisting of tiles.
var gameMap [][]Tile

// **Broadcast Channel**
// A channel to handle incoming messages from players.
// The server listens to this channel and processes messages accordingly.
var broadcast = make(chan Message)

var db *sql.DB

// **Message Structure**
// Defines the format of messages exchanged between server and clients.
type Message struct {
    Type   string      `json:"type"`   // Type of message (e.g., "join", "move", "action")
    Player *Player     `json:"player"` // Player data associated with the message
    Data   interface{} `json:"data"`   // Additional data (e.g., movement direction, action details)
}

// **Player Structure**
// Represents each connected player.
type Player struct {
    ID        string          `json:"id"`           // Unique identifier for the player
    Conn      *websocket.Conn `json:"-"`            // WebSocket connection (not serialized to JSON)
    X         int             `json:"x"`            // X-coordinate on the game map
    Y         int             `json:"y"`            // Y-coordinate on the game map
    Direction string          `json:"direction"`    // Direction the player is facing
    FacingWater bool          `json:"facingWater"`  // Returns if player is facing water
	Inventory []Item          `json:"inventory"`    // Inventory of fish the player has
    Balance   int             `json:"balance"`      // User's money
}

// **Item Structure**
// Represents each item the player has in their inventory.
type Item struct {
    Type   string `json:"type"`
    Name   string `json:"name"`
    Quantity int   `json:"quantity"`
    Value  int    `json:"value"`
    Img    string `json:"img"`
}


// **Tile Structure**
// Represents each tile on the game map.
type Tile struct {
    X          int    `json:"x"`          // X-coordinate of the tile
    Y          int    `json:"y"`          // Y-coordinate of the tile
    Type       int    `json:"type"`       // Type of tile: 0 (Water), 1 (Sand), 2 (Grass)
    Visibility string `json:"visibility"` // Visibility status: 'unexplored', 'explored', 'visible'
}

// **Fish Structure**
// Represents fish that can be caught by players.
type Fish struct {
    Type   string `json:"type"`
    Name   string `json:"name"`   // Name of the fish
    Rarity int    `json:"rarity"` // Rarity of the fish (lower is rarer)
    Value  int    `json:"value"`  // Monetary value of the fish
    Img    string `json:"img"`    // Image path of the fish
}

// **Predefined List of Fish**
// A slice containing different types of fish available in the game.
var fishList = []Fish{
    {"Fish", "Redfish", 10, 15, "./assets/redfish.png"},
    {"Fish", "Commonfish", 95, 2, "./assets/commonfish.png"},
    {"Fish", "Guppie", 90, 1, "./assets/guppie.png"},
    {"Fish", "Clownfish", 5, 20, "./assets/clownfish.png"},
    {"Fish", "Rarefish", 1, 100, "./assets/rarefish.png"},
}

// **Fishing Channels Map**
// Stores channels for each player engaged in fishing.
// Used to communicate between the fishing process and the player's catch attempt.
var fishingChannels = make(map[string]chan bool)


// **Main Function**
// Entry point of the server application.
func main() {
    DebugLogger.Println("Starting server initialization")
    rand.Seed(time.Now().UnixNano())
    generateGameMap()
    go handleMessages()
    go periodicSave(1 * time.Minute)

    http.HandleFunc("/ws", handleConnections)
    fmt.Println("Server started on :8081")
    DebugLogger.Println("Server listening on port 8081")
    err := http.ListenAndServe(":8081", nil)
    if err != nil {
        ErrorLogger.Println("Error starting server:", err)
    }
}

// **Handle WebSocket Connections**
// Handles new incoming WebSocket connections from clients.
func handleConnections(w http.ResponseWriter, r *http.Request) {
    DebugLogger.Printf("New connection attempt from %s", r.RemoteAddr)

    ws, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        ErrorLogger.Println("Error upgrading to WebSocket:", err)
        return
    }
    defer ws.Close()

    var msg Message
    err = ws.ReadJSON(&msg)
    if err != nil || msg.Type != "join" || msg.Player == nil {
        WarningLogger.Println("Invalid join message")
        return
    }

    playerID := msg.Player.ID
    InfoLogger.Printf("Player joined: %s\n", playerID)

    // Load or create player state
    player, err := loadPlayerState(playerID)
    if err != nil {
        WarningLogger.Printf("Failed to load player state for %s: %v", playerID, err)
        // Create a new player if not found
        player = &Player{ID: playerID, Conn: ws, X: rand.Intn(50), Y: rand.Intn(50)}
        for isTileWater(player) {
            player.X = rand.Intn(50)
            player.Y = rand.Intn(50)
        }
        DebugLogger.Printf("Assigned new starting position for player %s: (%d, %d)", playerID, player.X, player.Y)
    } else {
        player.Conn = ws
        InfoLogger.Printf("Loaded player state for %s", playerID)
    }

    mu.Lock()
    players[playerID] = player
    mu.Unlock()

    sendInitialGameState(player)
    notifyPlayerUpdate(player, "newPlayer")

    // Listen for messages from the player
    for {
        err := ws.ReadJSON(&msg)
        if err != nil {
            ErrorLogger.Printf("Error reading JSON from player %s: %v", playerID, err)
            break
        }
        msg.Player = player
        broadcast <- msg
    }

    // Save player state on disconnect
    mu.Lock()
    if err := savePlayerState(player); err != nil {
        ErrorLogger.Printf("Failed to save player state for %s: %v", playerID, err)
    } else {
        InfoLogger.Printf("Successfully saved player state for %s", playerID)
    }
    delete(players, playerID)
    mu.Unlock()

    DebugLogger.Printf("Player %s disconnected", playerID)
    notifyPlayerLeft(playerID)
}



func savePlayerState(player *Player) error {
    InfoLogger.Printf("Successfully saved player state for %s", player.ID)
    query := `
        INSERT INTO players (player_id, x, y, direction, facing_water, balance)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE x = VALUES(x), y = VALUES(y), direction = VALUES(direction), 
                                facing_water = VALUES(facing_water), balance = VALUES(balance)
    `
    _, err := db.Exec(query, player.ID, player.X, player.Y, player.Direction, player.FacingWater, player.Balance)
    if err != nil {
        return fmt.Errorf("failed to save player state: %v", err)
    }

    // Save inventory
    for _, item := range player.Inventory {
        // Save inventory with the new 'type' column
        invQuery := `
            INSERT INTO inventory (player_id, item_name, quantity, value, img, type)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), value = VALUES(value), img = VALUES(img), type = VALUES(type)
        `
        _, err := db.Exec(invQuery, player.ID, item.Name, item.Quantity, item.Value, item.Img, item.Type)
        if err != nil {
            return fmt.Errorf("failed to save inventory for player %s: %v", player.ID, err)
        }
    }
    return nil
}


func loadPlayerState(playerID string) (*Player, error) {
    player := &Player{ID: playerID}

    // Load player state
    query := `SELECT x, y, direction, facing_water, balance FROM players WHERE player_id = ?`
    row := db.QueryRow(query, playerID)
    if err := row.Scan(&player.X, &player.Y, &player.Direction, &player.FacingWater, &player.Balance); err != nil {
        if err == sql.ErrNoRows {
            return nil, fmt.Errorf("player not found")
        }
        return nil, fmt.Errorf("failed to load player state: %v", err)
    }

    // Load inventory 
    invQuery := `SELECT item_name, quantity, value, img, IFNULL(type, 'Unknown') FROM inventory WHERE player_id = ?`
    rows, err := db.Query(invQuery, playerID)
    if err != nil {
        return nil, fmt.Errorf("failed to load inventory: %v", err)
    }
    defer rows.Close()
    
    for rows.Next() {
        var item Item
        if err := rows.Scan(&item.Name, &item.Quantity, &item.Value, &item.Img, &item.Type); err != nil {
            return nil, fmt.Errorf("failed to scan inventory item: %v", err)
        }
        player.Inventory = append(player.Inventory, item)
    }
    


    return player, nil
}


func periodicSave(interval time.Duration) {
	for {
		time.Sleep(interval)
		mu.Lock()
		for _, player := range players {
			if err := savePlayerState(player); err != nil {
				ErrorLogger.Printf("Failed to save player state: %v", err)
			}
		}
		mu.Unlock()
	}
}

// **Send Initial Game State**
// Sends the current game map and list of players to a newly connected player.
func sendInitialGameState(player *Player) {
    mu.Lock()
    defer mu.Unlock()

    // Prepare the game state data.
    gameState := map[string]interface{}{
        "gameMap": gameMap,
        "players": getAllPlayers(),
		"inventory": player.Inventory,
    }

    // Create and send the initial game state message.
    initialMessage := Message{
        Type: "gameState",
        Data: gameState,
        Player: player,
    }
    err := player.Conn.WriteJSON(initialMessage)
    if err != nil {
        ErrorLogger.Println("Error sending initial game state:", err)
    }
}

// **Get All Players**
// Returns a slice of all players (excluding their WebSocket connections).
func getAllPlayers() []*Player {
    allPlayers := []*Player{}
    for _, p := range players {
        allPlayers = append(allPlayers, &Player{
            ID:        p.ID,
            X:         p.X,
            Y:         p.Y,
            Direction: p.Direction,
        })
    }
    return allPlayers
}

// **Notify Player Update**
// Sends a message to all other players about a new player or player updates.
func notifyPlayerUpdate(player *Player, updateType string) {
    mu.Lock()
    defer mu.Unlock()

    // Create the update message.
    msg := Message{
        Type:   updateType,
        Player: &Player{
            ID:        player.ID,
            X:         player.X,
            Y:         player.Y,
            Direction: player.Direction,
            FacingWater: player.FacingWater,
            Balance:    player.Balance,
        },
    }

    // Send the update message to all other players.
    for id, p := range players {
        if id != player.ID {
            err := p.Conn.WriteJSON(msg)
            if err != nil {
                ErrorLogger.Printf("Error notifying player %s: %v\n", id, err)
                p.Conn.Close()
                delete(players, id)
            }
        }
    }
}

// **Notify Player Left**
// Informs all players that a player has disconnected.
func notifyPlayerLeft(playerID string) {
    mu.Lock()
    defer mu.Unlock()

    // Create the player left message.
    msg := Message{
        Type: "playerLeft",
        Data: playerID,
    }

    // Send the message to all other players.
    for id, p := range players {
        if id != playerID {
            err := p.Conn.WriteJSON(msg)
            if err != nil {
                ErrorLogger.Printf("Error notifying player %s: %v\n", id, err)
                p.Conn.Close()
                delete(players, id)
            }
        }
    }
}

// **Handle Messages**
// Listens to the broadcast channel and processes incoming messages.
func handleMessages() {
    DebugLogger.Println("Message handler started")
    for {
        msg := <-broadcast
        DebugLogger.Printf("Processing message: %+v", msg)
        switch msg.Type {
        case "move":
            handleMove(msg)
        case "action":
            handleAction(msg)
        case "catchAttempt":
            handleCatchAttempt(msg)
        default:
            WarningLogger.Println("Unknown message type:", msg.Type)
        }
    }
}

// **Handle Move**
// Processes movement commands from players.
func handleMove(msg Message) {
    player := msg.Player
    direction, ok := msg.Data.(string)
    if !ok {
        WarningLogger.Println("Invalid move data")
        return
    }
    DebugLogger.Printf("Player %s attempting to move %s", player.ID, direction)

    newX, newY := player.X, player.Y

    switch direction {
    case "up":
        newY -= 1
    case "down":
        newY += 1
    case "left":
        newX -= 1
    case "right":
        newX += 1
    default:
        WarningLogger.Println("Unknown direction:", direction)
        return
    }

    if isValidMove(newX, newY) {
        mu.Lock()
        player.X = newX
        player.Y = newY
        player.Direction = direction
        player.FacingWater = isTileWater(player)
        mu.Unlock()
        DebugLogger.Printf("Player %s moved to (%d, %d), facing %s", player.ID, newX, newY, direction)

        movementMessage := Message{
            Type:   "playerUpdate",
            Player: player,
        }
        broadcastMessageToAll(movementMessage)
    } else {
        DebugLogger.Printf("Invalid move attempt by player %s to (%d, %d)", player.ID, newX, newY)
        errMsg := Message{
            Type: "error",
            Data: "Invalid move",
        }
        player.Conn.WriteJSON(errMsg)
    }
}

// **Is Valid Move**
// Checks if the new position is within bounds and not a water tile.
func isValidMove(x, y int) bool {
    if y < 0 || y >= len(gameMap) || x < 0 || x >= len(gameMap[0]) {
        return false
    }
    if gameMap[y][x].Type == 0 {
        return false
    }
    return true
}

// **Handle Action**
// Processes action commands from players (e.g., fishing).
func handleAction(msg Message) {
    player := msg.Player
    actionData, ok := msg.Data.(map[string]interface{})
    if !ok {
        WarningLogger.Println("Invalid action data")
        return
    }
    actionType, ok := actionData["actionType"].(string)
    if !ok {
        WarningLogger.Println("Invalid action type")
        return
    }
    DebugLogger.Printf("Player %s attempting action: %s", player.ID, actionType)
    switch actionType {
    case "fish":
        handleFishing(player)
    case "sellItem":
        itemData, ok := actionData["item"].(map[string]interface{})
        if !ok {
            WarningLogger.Println("Invalid item data for sell action")
            return
        }
        item, err := mapToItem(itemData)
        if err != nil {
            WarningLogger.Printf("Error converting item data: %v", err)
            return
        }
        handleSellItem(player, item)
    default:
        WarningLogger.Println("Unknown action type:", actionType)
    }
}



// **Handle Fishing**
// Initiates the fishing process for the player.
func handleFishing(player *Player) {
    facingX, facingY := getFacingTile(player)
    DebugLogger.Printf("Player %s attempting to fish at (%d, %d)", player.ID, facingX, facingY)
    if !isWithinBounds(facingX, facingY) || gameMap[facingY][facingX].Type != 0 {
        DebugLogger.Printf("Invalid fishing attempt by player %s", player.ID)
        errMsg := Message{
            Type: "error",
            Data: "You can't fish here!",
        }
        player.Conn.WriteJSON(errMsg)
        return
    }

    go startFishingProcess(player)
}

// **Handle Catch Attempt**
// Handles the player's attempt to catch a fish.
func handleCatchAttempt(msg Message) {
    player := msg.Player
    mu.Lock()
    if ch, ok := fishingChannels[player.ID]; ok {
        ch <- true // Signal that the player attempted to catch the fish.
    }
    mu.Unlock()
}

func checkInventoryForSale(player *Player, itemToSell Item) (bool, error) {
    mu.Lock()
    defer mu.Unlock()

    for _, inventoryItem := range player.Inventory {
        if inventoryItem.Name == itemToSell.Name {
            if inventoryItem.Quantity >= itemToSell.Quantity {
                return true, nil
            } else {
                return false, fmt.Errorf("insufficient quantity: have %d, want to sell %d", inventoryItem.Quantity, itemToSell.Quantity)
            }
        }
    }
    return false, fmt.Errorf("item not found in inventory")
}

// **Handle Selling Items**
// Handles selling the player's item and adds to their balance
// Updated handleSellItem function
func handleSellItem(player *Player, item Item) {
    DebugLogger.Printf("Entered handleSellItem for player %s with item: %+v\n", player.ID, item)

    canSell, err := checkInventoryForSale(player, item)
    if err != nil {
        ErrorLogger.Printf("Error checking inventory for player %s: %v", player.ID, err)
        errorMessage := Message{
            Type: "error",
            Data: err.Error(),
        }
        _ = player.Conn.WriteJSON(errorMessage)
        return
    }

    DebugLogger.Printf("Can sell item: %t\n", canSell)

    if canSell {
        mu.Lock()
        defer mu.Unlock()

        // Update player balance
        addToPlayerBalance(player, item)

        // Update player inventory
        removeItemFromInventory(player, item)

        DebugLogger.Printf("Successfully sold item for player %s. New balance: %d\n", player.ID, player.Balance)

        // Send inventory update message
        inventoryMessage := Message{
            Type:   "inventoryUpdate",
            Player: player,
            Data:   player.Inventory,
        }
        if err := player.Conn.WriteJSON(inventoryMessage); err != nil {
            ErrorLogger.Printf("Error sending inventory update to player %s: %v", player.ID, err)
            return
        }

        // Send balance update message
        balanceMessage := Message{
            Type:   "playerUpdate",
            Player: player,
        }
        if err := player.Conn.WriteJSON(balanceMessage); err != nil {
            ErrorLogger.Printf("Error sending balance update to player %s: %v", player.ID, err)
            return
        }

        // Send sell event message
        sellMessage := Message{
            Type:   "sellEvent",
            Player: player,
            Data: map[string]interface{}{
                "event":    "itemSold",
                "playerId": player.ID,
                "item":     item,
            },
        }
        if err := player.Conn.WriteJSON(sellMessage); err != nil {
            ErrorLogger.Printf("Error sending sell message to player %s: %v", player.ID, err)
        }
        savePlayerState(player)
    }
}


// **Add to Player Balance**
// Adds the total value of the sold items to the player's balance
func addToPlayerBalance(player *Player, item Item) {
    totalValue := item.Value * item.Quantity // Calculate total value
    DebugLogger.Printf("DEBUG: Adding total value to balance for player %s. Current balance: %d, Total value: %d", player.ID, player.Balance, totalValue)

    player.Balance += totalValue

    // Update balance in the database
    balQuery := `
        UPDATE players 
        SET balance = ? 
        WHERE player_id = ?
    `
    _, err := db.Exec(balQuery, player.Balance, player.ID)
    if err != nil {
        ErrorLogger.Printf("Failed to update balance in DB for player %s: %v", player.ID, err)
    }

    DebugLogger.Printf("DEBUG: New balance for player %s: %d", player.ID, player.Balance)
}



// **Get Facing Tile**
// Determines the tile in front of the player based on their direction.
func getFacingTile(player *Player) (int, int) {
    x, y := player.X, player.Y
    switch player.Direction {
    case "up":
        y -= 1
    case "down":
        y += 1
    case "left":
        x -= 1
    case "right":
        x += 1
    }
    return x, y
}

// **Is Within Bounds**
// Checks if the given coordinates are within the game map.
func isWithinBounds(x, y int) bool {
    return x >= 0 && x < len(gameMap[0]) && y >= 0 && y < len(gameMap)
}

// **Is player facing water tile**
// Determines if the tile in front of a player is water.
func isTileWater(player *Player) bool {
    facingX, facingY := getFacingTile(player)

    if !isWithinBounds(facingX, facingY) {
        return false
    }

    // Ensure you are checking for the correct water type (Type == 0 means water in your map)
    if gameMap[facingY][facingX].Type == 0 {
        return true
    }

    return false
}

func mapToItem(m map[string]interface{}) (Item, error) {
    item := Item{}
    
    if t, ok := m["type"].(string); ok {
        item.Type = t
    } else {
        return item, fmt.Errorf("invalid type")
    }
    
    if n, ok := m["name"].(string); ok {
        item.Name = n
    } else {
        return item, fmt.Errorf("invalid name")
    }
    
    if q, ok := m["quantity"].(float64); ok {
        item.Quantity = int(q)
    } else {
        return item, fmt.Errorf("invalid quantity")
    }
    
    if v, ok := m["value"].(float64); ok {
        item.Value = int(v)
    } else {
        return item, fmt.Errorf("invalid value")
    }
    
    if i, ok := m["img"].(string); ok {
        item.Img = i
    } else {
        return item, fmt.Errorf("invalid img")
    }
    
    return item, nil

}
// **Start Fishing Process**
// Simulates the fishing process, including waiting for a fish to bite and handling the catch attempt.
func startFishingProcess(player *Player) {
    DebugLogger.Printf("Starting fishing process for player %s", player.ID)
    timeToCatch := time.Duration(rand.Intn(5)+1) * time.Second
    time.Sleep(timeToCatch)

    biteChance := 0.8
    if rand.Float64() <= biteChance {
        DebugLogger.Printf("Fish bite for player %s", player.ID)
        biteMessage := Message{
            Type:   "fishingEvent",
            Player: player,
            Data: map[string]interface{}{
                "event":    "start",
                "playerId": player.ID,
            },
        }
        player.Conn.WriteJSON(biteMessage)

        catchWindow := 3 * time.Second
        responseChan := make(chan bool)
        mu.Lock()
        fishingChannels[player.ID] = responseChan
        mu.Unlock()

        select {
        case <-responseChan:
            DebugLogger.Printf("Player %s attempted to catch fish", player.ID)
            caughtFish := selectRandomFish()
            DebugLogger.Printf("Player %s caught %s", player.ID, caughtFish.Name)

            addItemToInventory(player, Item{
                Type:     caughtFish.Type,
                Name:     caughtFish.Name,
                Quantity: 1,
                Value:    caughtFish.Value,
                Img:      caughtFish.Img,
            })

            savePlayerState(player)

            inventoryMessage := Message{
                Type:   "inventoryUpdate",
                Player: player,
                Data:   player.Inventory,
            }
            player.Conn.WriteJSON(inventoryMessage)

            catchMessage := Message{
                Type:   "fishingEvent",
                Player: player,
                Data: map[string]interface{}{
                    "event":    "catch",
                    "playerId": player.ID,
                    "fish":     caughtFish,
                },
            }
            player.Conn.WriteJSON(catchMessage)

        case <-time.After(catchWindow):
            DebugLogger.Printf("Player %s failed to catch fish (timeout)", player.ID)
            timeoutMessage := Message{
                Type:   "fishingEvent",
                Player: player,
                Data: map[string]interface{}{
                    "event":    "fail",
                    "playerId": player.ID,
                },
            }
            player.Conn.WriteJSON(timeoutMessage)
        }

        mu.Lock()
        delete(fishingChannels, player.ID)
        mu.Unlock()
    } else {
        DebugLogger.Printf("No fish bite for player %s", player.ID)
        noBiteMessage := Message{
            Type:   "fishingEvent",
            Player: player,
            Data: map[string]interface{}{
                "event":    "fail",
                "playerId": player.ID,
            },
        }
        player.Conn.WriteJSON(noBiteMessage)
    }
}


func addItemToInventory(player *Player, item Item) {
    mu.Lock()
    defer mu.Unlock()

    // Check if the item already exists in the inventory
    for i, invItem := range player.Inventory {
        if invItem.Name == item.Name {
            // Increase the quantity
            player.Inventory[i].Quantity += item.Quantity

            // Update the item quantity in the database
            invQuery := `
                UPDATE inventory 
                SET quantity = ? 
                WHERE player_id = ? AND item_name = ?
            `
            _, err := db.Exec(invQuery, player.Inventory[i].Quantity, player.ID, item.Name)
            if err != nil {
                ErrorLogger.Printf("Failed to update inventory in DB for player %s: %v", player.ID, err)
            }
            return
        }
    }

    // If the item doesn't exist, add it to the inventory
    player.Inventory = append(player.Inventory, item)

    // Insert the new item into the database
    invQuery := `
        INSERT INTO inventory (player_id, item_name, quantity, value, img, type)
        VALUES (?, ?, ?, ?, ?, ?)
    `
    _, err := db.Exec(invQuery, player.ID, item.Name, item.Quantity, item.Value, item.Img, item.Type)
    if err != nil {
        ErrorLogger.Printf("Failed to add new item to DB for player %s: %v", player.ID, err)
    }
}


func removeItemFromInventory(player *Player, item Item) {
    DebugLogger.Println("Entered removeItemFromInventory")

    // Iterate through the inventory
    for i := 0; i < len(player.Inventory); i++ {
        invItem := player.Inventory[i]

        if invItem.Name == item.Name {
            DebugLogger.Printf("Found item in inventory: %+v", invItem)

            // Ensure the quantity to remove does not exceed available quantity
            if item.Quantity > invItem.Quantity {
                DebugLogger.Printf("Error: Attempted to remove %d but only %d available", item.Quantity, invItem.Quantity)
                return
            }

            // Decrease the quantity
            player.Inventory[i].Quantity -= item.Quantity
            DebugLogger.Printf("Updated quantity of %s: %d", invItem.Name, player.Inventory[i].Quantity)

            // Update the inventory in the database
            invQuery := `
                UPDATE inventory 
                SET quantity = ? 
                WHERE player_id = ? AND item_name = ?
            `
            _, err := db.Exec(invQuery, player.Inventory[i].Quantity, player.ID, item.Name)
            if err != nil {
                ErrorLogger.Printf("Failed to update inventory in DB for player %s: %v", player.ID, err)
            }

            // Remove the item if the quantity reaches 0
            if player.Inventory[i].Quantity <= 0 {
                DebugLogger.Printf("Quantity of %s reached 0, removing from inventory", invItem.Name)
                player.Inventory = append(player.Inventory[:i], player.Inventory[i+1:]...)

                // Delete the item from the database
                delQuery := `
                    DELETE FROM inventory 
                    WHERE player_id = ? AND item_name = ?
                `
                _, err := db.Exec(delQuery, player.ID, item.Name)
                if err != nil {
                    ErrorLogger.Printf("Failed to delete item from DB for player %s: %v", player.ID, err)
                }
            }
            return
        }
    }

    DebugLogger.Printf("Item %s not found in inventory, no changes made", item.Name)
}





// **Select Random Fish**
// Randomly selects a fish based on their rarity.
func selectRandomFish() Fish {
    totalWeight := 0
    for _, fish := range fishList {
        totalWeight += fish.Rarity
    }
    randNum := rand.Intn(totalWeight)
    for _, fish := range fishList {
        if randNum < fish.Rarity {
            return fish
        }
        randNum -= fish.Rarity
    }
    // Default to the last fish if none is selected.
    return fishList[len(fishList)-1]
}

// **Broadcast Message To All**
// Sends a message to all connected players.
func broadcastMessageToAll(msg Message) {
    mu.Lock()
    defer mu.Unlock()
    for _, player := range players {
        err := player.Conn.WriteJSON(msg)
        if err != nil {
            ErrorLogger.Printf("Error broadcasting to player %s: %v\n", player.ID, err)
            player.Conn.Close()
            delete(players, player.ID)
        }
    }
}

// **Generate Game Map**
// Initializes the game map and adds water and sand layers.
func generateGameMap() {
    width := 50  // Width of the map
    height := 50 // Height of the map
    gameMap = initializeMap(width, height)
    addWaterLayer(gameMap)
    addSandLayer(gameMap)
    // The grass layer is set by default in initializeMap.
}

// **Initialize Map**
// Creates a 2D slice of Tiles, initially all grass.
func initializeMap(width, height int) [][]Tile {
    gameMap := make([][]Tile, height)
    for y := 0; y < height; y++ {
        row := make([]Tile, width)
        for x := 0; x < width; x++ {
            row[x] = Tile{
                X:          x,
                Y:          y,
                Type:       2, // Grass
                Visibility: "unexplored",
            }
        }
        gameMap[y] = row
    }
    return gameMap
}

// **Add Water Layer**
// Adds a layer of water tiles in the center of the map.
func addWaterLayer(gameMap [][]Tile) {
    height := len(gameMap)
    width := len(gameMap[0])
    startX := width / 3
    endX := (2 * width) / 3
    startY := height / 3
    endY := (2 * height) / 3

    for y := startY; y < endY; y++ {
        for x := startX; x < endX; x++ {
            gameMap[y][x].Type = 0 // Water
        }
    }
}

// **Add Sand Layer**
// Surrounds water tiles with sand tiles.
func addSandLayer(gameMap [][]Tile) {
    height := len(gameMap)
    width := len(gameMap[0])

    for y := 0; y < height; y++ {
        for x := 0; x < width; x++ {
            if gameMap[y][x].Type == 2 && isAdjacentToWater(gameMap, x, y) {
                gameMap[y][x].Type = 1 // Sand
            }
        }
    }
}

// **Is Adjacent To Water**
// Checks if a given tile is adjacent to a water tile.
func isAdjacentToWater(gameMap [][]Tile, x, y int) bool {
    directions := [][2]int{
        {0, 1}, {1, 0}, {0, -1}, {-1, 0},   // Adjacent tiles
        {-1, -1}, {1, 1}, {-1, 1}, {1, -1}, // Diagonal tiles
    }

    height := len(gameMap)
    width := len(gameMap[0])

    for _, d := range directions {
        nx, ny := x+d[0], y+d[1]
        if nx >= 0 && nx < width && ny >= 0 && ny < height {
            if gameMap[ny][nx].Type == 0 {
                return true
            }
        }
    }
    return false
}
