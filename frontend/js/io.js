var IO = {

    /**
     * This is called when the page is displayed. It connects the Socket.IO client
     * to the Socket.IO server
     */
    init: () => {
        IO.socket = io.connect();
        IO.bindEvents();
    },

    /**
     * While connected, Socket.IO will listen to the following events emitted
     * by the Socket.IO server, then run the appropriate function.
     */
    bindEvents : () => {
        IO.socket.on('connected', IO.onConnected );
        IO.socket.on('newGameCreated', IO.onNewGameCreated );
        IO.socket.on(`stateRefresh`, IO.stateRefresh);
        IO.socket.on('playerJoinedRoom', IO.playerJoinedRoom );
        IO.socket.on(`clientDisconnectFromRoom`, IO.clientDisconnectFromRoom);
        IO.socket.on('beginNewGame', IO.beginNewGame );
        IO.socket.on('error', IO.error );
    },

    /**
     * The client is successfully connected!
     */
    onConnected : () => {
        // Cache a copy of the client's socket.IO session ID on the App
        App.mySocketId = IO.socket.socket.sessionid;
        // console.log(data.message);
    },

    /**
     * A new game has been created and a random game ID has been generated.
     * @param data {{ gameId: int, mySocketId: * }}
     */
    onNewGameCreated : (data) => {
        App.Host.gameInit(data);
    },

    stateRefresh : (data) => {
        console.log(data);
    },

    clientDisconnectFromRoom : (data) => {
        App[App.myRole].updateWaitingScreen(`disconnect`, data);
    },

    /**
     * A player has successfully joined the game.
     * @param data {{playerName: string, gameId: int, mySocketId: int}}
     */
    playerJoinedRoom : (data) => {
        // When a player joins a room, do the updateWaitingScreen funciton.
        // There are two versions of this function: one for the 'host' and
        // another for the 'player'.
        //
        // So on the 'host' browser window, the App.Host.updateWiatingScreen function is called.
        // And on the player's browser, App.Player.updateWaitingScreen is called.
        alert(`player joined room event`);
        App[App.myRole].updateWaitingScreen(`connect`, data);
    },



    /**
     * Both players have joined the game.
     * @param data
     */
    beginNewGame : (data) => {
        App[App.myRole].gameCountdown(data);
    },

    /**
     * An error has occurred.
     * @param data
     */
    error : (data) => {
        console.log(data);
    }

};

IO.init();