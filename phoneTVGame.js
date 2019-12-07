const mngr = require(`./mngr`);

var io;
var gameSocket;
let currentRooms = {};
let clientInfo = {};

/**
 * This function is called by index.js to initialize a new game instance.
 *
 * @param sio The Socket.IO library
 * @param socket The socket object for the connected client.
 */
exports.currentRooms = () => {
    return currentRooms;
}

exports.clientInfo = () => {
    return clientInfo;
}

//let hostEventKeys = [`hostCreateNewGame`, `hostPrepareGame`,]

exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
    clientInfo[gameSocket.id] = {id: gameSocket.id, connected: true};
    //gameSocket: gameSocket

    gameSocket.emit('connected', { message: "You are connected!"});

    // Host Events
    hostEvents.gameSocket = gameSocket;
    hostEvents.this = hostEvents;
    for(const key in hostEvents) {
        if(mngr.hlpFn.isFunction(hostEvents[key])){
            gameSocket.on(key, hostEvents[key]);
        }
    }

    // Player Events
    playerEvents.gameSocket = gameSocket;
    playerEvents.this = playerEvents;
    for(const key in playerEvents) {
        if(mngr.hlpFn.isFunction(playerEvents[key])){
            gameSocket.on(key, playerEvents[key]);
        }
    }

    // Common Events
    commonEvents.gameSocket = gameSocket;
    commonEvents.this = commonEvents;
    for(const key in commonEvents) {
        if(mngr.hlpFn.isFunction(commonEvents[key])){
            gameSocket.on(key, commonEvents[key]);
        }
    }
    
}

/* *******************************
   *                             *
   *       COMMON FUNCTIONS      *
   *                             *
   ******************************* */
let commonEvents = {
    disconnect: () => {
        if (mngr.hlpFn.isUndefined(clientInfo[gameSocket.id].room) || mngr.hlpFn.isUndefined(currentRooms[clientInfo[gameSocket.id].room])) {
            clientInfo[gameSocket.id] = undefined;
        } else {
            if(currentRooms[clientInfo[gameSocket.id].room].host.id == gameSocket.id) {
                hostDisconnect(clientInfo[gameSocket.id].room);
                clientInfo[gameSocket.id] = undefined;
            } else {
                clientInfo[gameSocket.id].connected = false;
            }
            
        }
    },
}

function hostDisconnect(gameId) {
    currentRooms[clientInfo[gameSocket.id].room] = undefined;
    console.log(`Todo: notify children that host Disconnected`);
}

function sendRefresh(gameId, event, data) {
    io.sockets.in(gameId).emit(event, data);
}

function sendHostData(data) {

}



/* *******************************
   *                             *
   *       HOST FUNCTIONS        *
   *                             *
   ******************************* */

let hostEvents = {
    /**
     * The 'START' button was clicked and 'hostCreateNewGame' event occurred.
     */
    hostCreateNewGame: () => {
        // Create a unique Socket.IO Room
        var thisGameId = ( Math.random() * 100000 ) | 0;
    
        // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
        gameSocket.emit('newGameCreated', {gameId: thisGameId, mySocketId: gameSocket.id});
    
        // Join the Room and wait for the players
        gameSocket.join(thisGameId.toString());
    
        currentRooms[thisGameId.toString()] = {
            gameStarted: false, 
            players: [], 
            host: clientInfo[gameSocket.id]};
        clientInfo[gameSocket.id].room = thisGameId.toString();
    },

    /*
    * Two players have joined. Alert the host!
    * @param gameId The game ID / room ID
    */
    hostPrepareGame: (gameId) => {
        var sock = gameSocket;
        var data = {
            mySocketId : sock.id,
            gameId : gameId
        };
        //console.log("All Players Present. Preparing game...");
        io.sockets.in(data.gameId).emit('beginNewGame', data);
    },
    /*
    * The Countdown has finished, and the game begins!
    * @param gameId The game ID / room ID
    */
    hostStartGame: (gameId) => {
        console.log(gameId);
        console.log('Game Started.');
        sendWord(0,gameId);
    },
    /**
     * A player answered correctly. Time for the next word.
     * @param data Sent from the client. Contains the current round and gameId (room)
     */
    hostNextRound: (data) => {
        if(data.round < wordPool.length ){
            // Send a new set of words back to the host and players.
            sendWord(data.round, data.gameId);
        } else {
            // If the current round exceeds the number of words, send the 'gameOver' event.
            io.sockets.in(data.gameId).emit('gameOver',data);
        }
    }
}


/* *****************************
   *                           *
   *     PLAYER FUNCTIONS      *
   *                           *
   ***************************** */

let playerEvents = {
    /**
     * A player clicked the 'START GAME' button.
     * Attempt to connect them to the room that matches
     * the gameId entered by the player.
     * @param data Contains data entered via player's input - playerName and gameId.
     */
    playerJoinGame: (data) => {
        //console.log('Player ' + data.playerName + 'attempting to join game: ' + data.gameId );

        // A reference to the player's Socket.IO socket object
        let sock = gameSocket;

        // Look up the room ID in the Socket.IO manager object.
        let room = gameSocket.manager.rooms["/" + data.gameId];

        clientInfo[gameSocket.id].room = data.gameId;
        clientInfo[gameSocket.id].playerName = data.playerName;

        currentRooms[data.gameId].players.push(clientInfo[gameSocket.id]);

        // If the room exists...
        if( room != undefined || currentRooms[data.gameId].players.length == 6){
            // attach the socket id to the data object.
            data.mySocketId = sock.id;

            // Join the room
            sock.join(data.gameId);

            console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );

            // Emit an event notifying the clients that the player has joined the room.
            let message = {
                update: `newPlayer`,
                game: currentRooms[data.gameId]
            }
            sendRefresh(data.gameId, 'playerJoinedRoom', message)

        } else {
            // Otherwise, send an error message back to the player.
            gameSocket.emit('error',{message: "This room does not exist or is full."} );
        }
    },

    /**
     * A player has tapped a word in the word list.
     * @param data gameId
     */
    playerAnswer: (data) => {
        // console.log('Player ID: ' + data.playerId + ' answered a question with: ' + data.answer);

        // The player's answer is attached to the data object.  \
        // Emit an event with the answer so it can be checked by the 'Host'
        io.sockets.in(data.gameId).emit('hostCheckAnswer', data);
    },

    /**
     * The game is over, and a player has clicked a button to restart the game.
     * @param data
     */
    playerRestart: (data) => {
        // console.log('Player: ' + data.playerName + ' ready for new game.');

        // Emit the player's data back to the clients in the game room.
        data.playerId = gameSocket.id;
        io.sockets.in(data.gameId).emit('playerJoinedRoom',data);
    }
}

/* *************************
   *                       *
   *      GAME LOGIC       *
   *                       *
   ************************* */

/**
 * Get a word for the host, and a list of words for the player.
 *
 * @param wordPoolIndex
 * @param gameId The room identifier
 */
function sendWord(wordPoolIndex, gameId) {
    var data = getWordData(wordPoolIndex);
    io.sockets.in(gameId).emit('newWordData', data);
}

/**
 * This function does all the work of getting a new words from the pile
 * and organizing the data to be sent back to the clients.
 *
 * @param i The index of the wordPool.
 * @returns {{round: *, word: *, answer: *, list: Array}}
 */
function getWordData(i){
    // Randomize the order of the available words.
    // The first element in the randomized array will be displayed on the host screen.
    // The second element will be hidden in a list of decoys as the correct answer
    var words = shuffle(wordPool[i].words);

    // Randomize the order of the decoy words and choose the first 5
    var decoys = shuffle(wordPool[i].decoys).slice(0,5);

    // Pick a random spot in the decoy list to put the correct answer
    var rnd = Math.floor(Math.random() * 5);
    decoys.splice(rnd, 0, words[1]);

    // Package the words into a single object.
    var wordData = {
        round: i,
        word : words[0],   // Displayed Word
        answer : words[1], // Correct Answer
        list : decoys      // Word list for player (decoys and answer)
    };

    return wordData;
}

/*
 * Javascript implementation of Fisher-Yates shuffle algorithm
 * http://stackoverflow.com/questions/2450954/how-to-randomize-a-javascript-array
 */
function shuffle(array) {
    var currentIndex = array.length;
    var temporaryValue;
    var randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

/**
 * Each element in the array provides data for a single round in the game.
 *
 * In each round, two random "words" are chosen as the host word and the correct answer.
 * Five random "decoys" are chosen to make up the list displayed to the player.
 * The correct answer is randomly inserted into the list of chosen decoys.
 *
 * @type {Array}
 */
var wordPool = [
    {
        "words"  : [ "sale","seal","ales","leas" ],
        "decoys" : [ "lead","lamp","seed","eels","lean","cels","lyse","sloe","tels","self" ]
    },

    {
        "words"  : [ "item","time","mite","emit" ],
        "decoys" : [ "neat","team","omit","tame","mate","idem","mile","lime","tire","exit" ]
    },

    {
        "words"  : [ "spat","past","pats","taps" ],
        "decoys" : [ "pots","laps","step","lets","pint","atop","tapa","rapt","swap","yaps" ]
    },

    {
        "words"  : [ "nest","sent","nets","tens" ],
        "decoys" : [ "tend","went","lent","teen","neat","ante","tone","newt","vent","elan" ]
    },

    {
        "words"  : [ "pale","leap","plea","peal" ],
        "decoys" : [ "sale","pail","play","lips","slip","pile","pleb","pled","help","lope" ]
    },

    {
        "words"  : [ "races","cares","scare","acres" ],
        "decoys" : [ "crass","scary","seeds","score","screw","cager","clear","recap","trace","cadre" ]
    },

    {
        "words"  : [ "bowel","elbow","below","beowl" ],
        "decoys" : [ "bowed","bower","robed","probe","roble","bowls","blows","brawl","bylaw","ebola" ]
    },

    {
        "words"  : [ "dates","stead","sated","adset" ],
        "decoys" : [ "seats","diety","seeds","today","sited","dotes","tides","duets","deist","diets" ]
    },

    {
        "words"  : [ "spear","parse","reaps","pares" ],
        "decoys" : [ "ramps","tarps","strep","spore","repos","peris","strap","perms","ropes","super" ]
    },

    {
        "words"  : [ "stone","tones","steno","onset" ],
        "decoys" : [ "snout","tongs","stent","tense","terns","santo","stony","toons","snort","stint" ]
    }
]
