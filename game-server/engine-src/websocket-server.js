"use strict";

const GameSocket = requireModule("gamesocket");
const WebsocketSocketHandler = requireModule("websocket-server-socket-handler")
const AccountDatabase = requireModule("account-database");

const { Server } = require("ws");

const WebsocketServer = function() {

  /*
   *
   * Class WebsocketServer
   *
   * Container for the websocket server that accepts incoming HTTP connections
   * and upgrades them to websocket connections
   *
   */

  // Create the websocket server
  this.websocket = new Server({
    "noServer": true,
    "perMessageDeflate": this.__getCompressionConfiguration()
  });

  // Reference the database
  // AccountDatabase agora é o adapter Supabase (não usa mais CONFIG.DATABASE.ACCOUNT_DATABASE)
  this.accountDatabase = new AccountDatabase();

  // The handler for sockets
  this.socketHandler = new WebsocketSocketHandler();

  // The main websocket server listener
  this.websocket.on("connection", this.__handleConnection.bind(this));
  this.websocket.on("close", this.__handleClose.bind(this));
  
}

WebsocketServer.prototype.getDataDetails = function() {

  /*
   * Function WebsocketServer.getDataDetails
   * Returns data details of the websocket server
   */

  // Expose this information
  return new Object({
    "sockets": this.socketHandler.getTotalConnectedSockets()
  });

}

WebsocketServer.prototype.upgrade = function(request, socket, head, accountName) {

  /*
   * Function WebsocketServer.upgrade
   * Upgrades an accepted HTTP connection to WS
   */

  console.log("Attempting to upgrading request from %s to WS.".format(socket.id));

  // Otherwise handle the upgrade with the submitted account information
  this.websocket.handleUpgrade(request, socket, head, function upgradeWebsocket(websocket) {

    console.log("Upgrade succesful for socket with id %s.".format(socket.id));

    // Tell the websocket server the connection upgrade is succesful
    this.websocket.emit("connection", websocket, request, accountName);

  }.bind(this));

}

WebsocketServer.prototype.close = function() {

  /*
   * Function WebsocketServer.close
   * Call to the web socket server to close it
   */

  console.log("The websocket server has started to close.");

  // Terminate all remaining socket connections
  this.socketHandler.disconnectClients();

  // Close the websocket server after all clients were forcefully terminated
  this.websocket.close();
  
}

WebsocketServer.prototype.__handleClose = function() {

  /*
   * Function WebsocketServer.__handleClose
   * Callback fired when the websocket server is closed
   */

  console.log("The websocket server has closed.");

  // The database may be closed
  this.accountDatabase.close();

}

WebsocketServer.prototype.__handleConnection = function(socket, request, session) {

  /*
   * Function WebsocketServer.__handleConnection
   * Handles an incoming websocket connection that was upgraded from HTTP with a valid JWT.
   * `session` = { userId, characterId, email } vindo do AuthService.
   */

  // Create a new class that wraps the connected socket
  let gameSocket = new GameSocket(socket, session.characterId);
  gameSocket.session = session;
  gameSocket.characterId = session.characterId;
  gameSocket.userId = session.userId;

  // The server is full
  if(this.socketHandler.isOverpopulated()) {
    return gameSocket.closeError("The server is currently overpopulated. Please try again later.");
  }

  // Server is in the process of shutting down: do not accept any new connections
  if(gameServer.isShutdown()) {
    return gameSocket.closeError("The server is going offline. Please try again later.");
  }

  // The socket can be accepted
  this.__acceptConnection(gameSocket, session);

}

WebsocketServer.prototype.__acceptConnection = function(gameSocket, session) {

  /*
   * Function WebsocketServer.__acceptConnection
   * Accepts the connection of the websocket
   */

  // Get the socket address
  let { address, family, port } = gameSocket.getAddress();

  console.log("A client joined the server: %s (character %s).".format(address, session.characterId));

  // Attach the socket listeners for socket closure
  gameSocket.socket.on("close", this.__handleSocketClose.bind(this, gameSocket));

  // Try logging in to a character
  this.__handleLoginRequest(gameSocket, session);

}

WebsocketServer.prototype.__handleLoginRequest = function(gameSocket, session) {

  /*
   * Function WebsocketServer.__handleLoginRequest
   * Handles a login request from a socket. Carrega o personagem do Supabase.
   */

  this.accountDatabase.getCharacter(session, function getPlayerAccount(error, result) {

    // There was an error getting the player account
    if(error) {
      console.warn("Falha ao carregar personagem %s: %s", session.characterId, error.message);
      return gameSocket.terminate();
    }

    let character = JSON.parse(result.character);

    // Accept the gamesocket
    this.__acceptCharacterConnection(gameSocket, character);

  }.bind(this));

}

WebsocketServer.prototype.__getCompressionConfiguration = function() {

  /*
   * Function WebsocketServer.__getCompressionConfiguration
   * Returns the compression options for zlib used in ws
   */

  // Compression is disabled
  if(!CONFIG.SERVER.COMPRESSION.ENABLED) {
    return false;
  }

  // Compression options: level 1 is sufficient to reach ~85% percent compression for chunks
  return new Object({
    "clientNoContextTakeover": true,
    "serverNoContextTakeover": true,
    "threshold": CONFIG.SERVER.COMPRESSION.THRESHOLD,
    "zlibDeflateOptions": {
      "level": CONFIG.SERVER.COMPRESSION.LEVEL 
    }
  });

}

WebsocketServer.prototype.__acceptCharacterConnection = function(gameSocket, data) {

  /*
   * Function WebsocketServer.__acceptConnection
   * Handles a login request from a socket
   */

  // Save a reference to the game socket
  this.socketHandler.referenceSocket(gameSocket);

  // Attempt to get the player again in case of a race condition
  let existingPlayer = gameServer.world.creatureHandler.getPlayerByName(data.properties.name);

  // Not existing in the world: create a new player
  if(existingPlayer === null) {
    return gameServer.world.creatureHandler.createNewPlayer(gameSocket, data);
  }

  // What to do when this player is already online
  switch(CONFIG.SERVER.ON_ALREADY_ONLINE) {
    case "replace": return existingPlayer.socketHandler.attachController(gameSocket);
    case "spectate": return existingPlayer.socketHandler.addSpectator(gameSocket); 
  }

  // Default behavior is closing the new socket
  return gameSocket.closeError("This character is already online.");

}

WebsocketServer.prototype.__handleSocketClose = function(gameSocket) {

  /*
   * Function WebsocketServer.__handleSocketClose
   * Closes a game socket and removes the player from the game world
   */

  console.log("A client has left the server: %s.".format(gameSocket.__address));

  // Dereference from the list of gamesockets
  this.socketHandler.dereferenceSocket(gameSocket);

  // Socket closed without being referenced to a player (e.g., spectating)
  if(gameSocket.player === null) {
    return;
  }

  // If the player is not in combat we can immediately remove the player
  if(!gameSocket.player.isInCombat() || gameServer.isClosed()) {
    return this.__removePlayer(gameSocket);
  }

  let logoutEvent = gameServer.world.eventQueue.addEvent(
    this.__removePlayer.bind(this, gameSocket),
    gameSocket.player.combatLock.remainingFrames()
  );

  return gameSocket.player.socketHandler.setLogoutEvent(logoutEvent);

}

WebsocketServer.prototype.__removePlayer = function(gameSocket) {

  /*
   * WebsocketServer.__removePlayer
   * Removes a player from the game world and stored its informaton in the database
   */

  // Delete the player from the world
  gameServer.world.creatureHandler.removePlayerFromWorld(gameSocket);

  // Save thea character information to the database
  this.accountDatabase.saveCharacter(gameSocket, function(error) {

    if(error) {
      return console.log("Error storing player information for %s".format(gameSocket.player.getProperty(CONST.PROPERTIES.NAME)));
    }

    console.log("Stored player information for %s".format(gameSocket.player.getProperty(CONST.PROPERTIES.NAME)));

  });

}


module.exports = WebsocketServer;
