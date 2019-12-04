var App = {

    /**
     * Keep track of the gameId, which is identical to the ID
     * of the Socket.IO Room used for the players and host to communicate
     *
     */
    gameId: 0,

    /**
     * This is used to differentiate between 'Host' and 'Player' browsers.
     */
    myRole: '',   // 'Player' or 'Host'

    /**
     * The Socket.IO socket object identifier. This is unique for
     * each player and host. It is generated when the browser initially
     * connects to the server when the page loads for the first time.
     */
    mySocketId: '',

    /**
     * Identifies the current round. Starts at 0 because it corresponds
     * to the array of word data stored on the server.
     */
    currentRound: 0,

    /* *************************************
     *                Setup                *
     * *********************************** */

    /**
     * This runs when the page initially loads.
     */
    init: () => {
        App.cacheElements();
        App.showInitScreen();
        App.bindEvents();
    },

    /**
     * Create references to on-screen elements used throughout the game.
     */
    cacheElements: () => {
        App.$doc = $(document);

        // Templates
        App.gameArea = document.getElementById(`gameArea`);
        App.templateIntroScreen = document.getElementById(`intro-screen-template`).innerHTML;
        App.templateNewGame = document.getElementById(`create-game-template`).innerHTML;
        App.templateJoinGame = document.getElementById(`join-game-template`).innerHTML;
        App.hostGame = document.getElementById(`host-game-template`).innerHTML;
    },

    /**
     * Create some click handlers for the various buttons that appear on-screen.
     */
    bindEvents: () => {
        // Host
        domHelper.clickID(`btnCreateGame`, App.Host.onCreateClick);

        // Player
        domHelper.clickID(`btnJoinGame`, App.Player.onJoinClick);
        domHelper.clickID(`btnStart`, App.Player.onPlayerStartClick);
        domHelper.clickClass(`btnAnswer`, App.Player.onPlayerAnswerClick);
        domHelper.clickID(`btnPlayerRestart`, App.Player.onPlayerRestart);
    },

    /* *************************************
     *             Game Logic              *
     * *********************************** */

    /**
     * Show the initial Anagrammatix Title Screen
     * (with Start and Join buttons)
     */
    showInitScreen: () => {
        App.gameArea.innerHTML = App.templateIntroScreen;
        App.doTextFit('.title');
    },


    /* *******************************
       *         HOST CODE           *
       ******************************* */
    Host : {

        /**
         * Contains references to player data
         */
        players : [],

        /**
         * Flag to indicate if a new game is starting.
         * This is used after the first game ends, and players initiate a new game
         * without refreshing the browser windows.
         */
        isNewGame : false,

        /**
         * Keep track of the number of players that have joined the game.
         */
        numPlayersInRoom: 0,

        /**
         * A reference to the correct answer for the current round.
         */
        currentCorrectAnswer: '',

        /**
         * Handler for the "Start" button on the Title Screen.
         */
        onCreateClick: () => {
            // console.log('Clicked "Create A Game"');
            IO.socket.emit('hostCreateNewGame');
        },

        /**
         * The Host screen is displayed for the first time.
         * @param data{{ gameId: int, mySocketId: * }}
         */
        gameInit: (data) => {
            App.gameId = data.gameId;
            App.mySocketId = data.mySocketId;
            App.myRole = 'Host';
            App.Host.numPlayersInRoom = 0;

            App.Host.displayNewGameScreen();
            // console.log("Game started with ID: " + App.gameId + ' by host: ' + App.mySocketId);
        },

        /**
         * Show the Host screen containing the game URL and unique game ID
         */
        displayNewGameScreen : () => {
            // Fill the game screen with the appropriate HTML
            App.gameArea.innerHTML = App.templateNewGame;

            // Display the URL on screen
            $('#gameURL').text(window.location.href);
            App.doTextFit('#gameURL');

            // Show the gameId / room id on screen
            $('#spanNewGameCode').text(App.gameId);
        },

        /**
         * Update the Host screen when the first player joins
         * @param data{{playerName: string}}
         */
        updateWaitingScreen: (data) => {
            // If this is a restarted game, show the screen.
            if ( App.Host.isNewGame ) {
                App.Host.displayNewGameScreen();
            }
            // Update host screen
            $('#playersWaiting')
                .append('<p/>')
                .text('Player ' + data.playerName + ' joined the game.');

            // Store the new player's data on the Host.
            App.Host.players.push(data);

            // Increment the number of players in the room
            App.Host.numPlayersInRoom += 1;

            // If two players have joined, start the game!
            if (App.Host.numPlayersInRoom === 2) {
                // console.log('Room is full. Almost ready!');

                // Let the server know that two players are present.
                IO.socket.emit('hostRoomFull',App.gameId);
            }
        },

        /**
         * Show the countdown screen
         */
        gameCountdown : () => {

            // Prepare the game screen with new HTML
            App.gameArea.innerHTML = App.hostGame;
            App.doTextFit('#hostWord');

            // Begin the on-screen countdown timer
            var $secondsLeft = $('#hostWord');
            App.countDown( $secondsLeft, 5, () => {
                IO.socket.emit('hostCountdownFinished', App.gameId);
            });

            // Display the players' names on screen
            $('#player1Score')
                .find('.playerName')
                .html(App.Host.players[0].playerName);

            $('#player2Score')
                .find('.playerName')
                .html(App.Host.players[1].playerName);

            // Set the Score section on screen to 0 for each player.
            $('#player1Score').find('.score').attr('id',App.Host.players[0].mySocketId);
            $('#player2Score').find('.score').attr('id',App.Host.players[1].mySocketId);
        },

        /**
         * Show the word for the current round on screen.
         * @param data{{round: *, word: *, answer: *, list: Array}}
         */
        newWord : (data) => {
            // Insert the new word into the DOM
            $('#hostWord').text(data.word);
            App.doTextFit('#hostWord');

            // Update the data for the current round
            App.Host.currentCorrectAnswer = data.answer;
            App.Host.currentRound = data.round;
        },

        /**
         * Check the answer clicked by a player.
         * @param data{{round: *, playerId: *, answer: *, gameId: *}}
         */
        checkAnswer : (data) => {
            // Verify that the answer clicked is from the current round.
            // This prevents a 'late entry' from a player whos screen has not
            // yet updated to the current round.
            if (data.round === App.currentRound){

                // Get the player's score
                var $pScore = $('#' + data.playerId);

                // Advance player's score if it is correct
                if( App.Host.currentCorrectAnswer === data.answer ) {
                    // Add 5 to the player's score
                    $pScore.text( +$pScore.text() + 5 );

                    // Advance the round
                    App.currentRound += 1;

                    // Prepare data to send to the server
                    var data = {
                        gameId : App.gameId,
                        round : App.currentRound
                    }

                    // Notify the server to start the next round.
                    IO.socket.emit('hostNextRound',data);

                } else {
                    // A wrong answer was submitted, so decrement the player's score.
                    $pScore.text( +$pScore.text() - 3 );
                }
            }
        },


        /**
         * All 10 rounds have played out. End the game.
         * @param data
         */
        endGame : (data) => {
            // Get the data for player 1 from the host screen
            var $p1 = $('#player1Score');
            var p1Score = +$p1.find('.score').text();
            var p1Name = $p1.find('.playerName').text();

            // Get the data for player 2 from the host screen
            var $p2 = $('#player2Score');
            var p2Score = +$p2.find('.score').text();
            var p2Name = $p2.find('.playerName').text();

            // Find the winner based on the scores
            var winner = (p1Score < p2Score) ? p2Name : p1Name;
            var tie = (p1Score === p2Score);

            // Display the winner (or tie game message)
            if(tie){
                $('#hostWord').text("It's a Tie!");
            } else {
                $('#hostWord').text( winner + ' Wins!!' );
            }
            App.doTextFit('#hostWord');

            // Reset game data
            App.Host.numPlayersInRoom = 0;
            App.Host.isNewGame = true;
        },

        /**
         * A player hit the 'Start Again' button after the end of a game.
         */
        restartGame : () => {
            App.gameArea.innerHTML = App.templateNewGame;
            $('#spanNewGameCode').text(App.gameId);
        }
    },


    /* *****************************
       *        PLAYER CODE        *
       ***************************** */

    Player : {

        /**
         * A reference to the socket ID of the Host
         */
        hostSocketId: '',

        /**
         * The player's name entered on the 'Join' screen.
         */
        myName: '',

        /**
         * Click handler for the 'JOIN' button
         */
        onJoinClick: () => {
            // console.log('Clicked "Join A Game"');

            // Display the Join Game HTML on the player's screen.
            App.gameArea.innerHTML = App.templateJoinGame;
            App.bindEvents();
        },

        /**
         * The player entered their name and gameId (hopefully)
         * and clicked Start.
         */
        onPlayerStartClick: () => {
            // console.log('Player clicked "Start"');

            // collect data to send to the server
            console.log(`lets get this party started`);
            var data = {
                gameId : ($('#inputGameId').val()),
                playerName : $('#inputPlayerName').val() || 'anon'
            };

            // Send the gameId and playerName to the server
            IO.socket.emit('playerJoinGame', data);

            // Set the appropriate properties for the current player.
            App.myRole = 'Player';
            App.Player.myName = data.playerName;
        },

        /**
         *  Click handler for the Player hitting a word in the word list.
         */
        onPlayerAnswerClick: () => {
            // console.log('Clicked Answer Button');
            var $btn = $(this);      // the tapped button
            var answer = $btn.val(); // The tapped word

            // Send the player info and tapped word to the server so
            // the host can check the answer.
            var data = {
                gameId: App.gameId,
                playerId: App.mySocketId,
                answer: answer,
                round: App.currentRound
            }
            IO.socket.emit('playerAnswer',data);
        },

        /**
         *  Click handler for the "Start Again" button that appears
         *  when a game is over.
         */
        onPlayerRestart : () => {
            var data = {
                gameId : App.gameId,
                playerName : App.Player.myName
            }
            IO.socket.emit('playerRestart',data);
            App.currentRound = 0;
            $('#gameArea').html("<h3>Waiting on host to start new game.</h3>");
        },

        /**
         * Display the waiting screen for player 1
         * @param data
         */
        updateWaitingScreen : (data) => {
            if(IO.socket.socket.sessionid === data.mySocketId){
                App.myRole = 'Player';
                App.gameId = data.gameId;

                $('#playerWaitingMessage')
                    .append('<p/>')
                    .text('Joined Game ' + data.gameId + '. Please wait for game to begin.');
            }
        },

        /**
         * Display 'Get Ready' while the countdown timer ticks down.
         * @param hostData
         */
        gameCountdown : (hostData) => {
            App.Player.hostSocketId = hostData.mySocketId;
            $('#gameArea')
                .html('<div class="gameOver">Get Ready!</div>');
        },

        /**
         * Show the list of words for the current round.
         * @param data{{round: *, word: *, answer: *, list: Array}}
         */
        newWord : (data) => {
            // Create an unordered list element
            var $list = $('<ul/>').attr('id','ulAnswers');

            // Insert a list item for each word in the word list
            // received from the server.
            $.each(data.list, () => {
                $list                                //  <ul> </ul>
                    .append( $('<li/>')              //  <ul> <li> </li> </ul>
                        .append( $('<button/>')      //  <ul> <li> <button> </button> </li> </ul>
                            .addClass('btnAnswer')   //  <ul> <li> <button class='btnAnswer'> </button> </li> </ul>
                            .addClass('btn')         //  <ul> <li> <button class='btnAnswer'> </button> </li> </ul>
                            .val(this)               //  <ul> <li> <button class='btnAnswer' value='word'> </button> </li> </ul>
                            .html(this)              //  <ul> <li> <button class='btnAnswer' value='word'>word</button> </li> </ul>
                        )
                    )
            });

            // Insert the list onto the screen.
            $('#gameArea').html($list);
        },

        /**
         * Show the "Game Over" screen.
         */
        endGame : () => {
            $('#gameArea')
                .html('<div class="gameOver">Game Over!</div>')
                .append(
                    // Create a button to start a new game.
                    $('<button>Start Again</button>')
                        .attr('id','btnPlayerRestart')
                        .addClass('btn')
                        .addClass('btnGameOver')
                );
        }
    },


    /* **************************
              UTILITY CODE
       ************************** */

    /**
     * Display the countdown timer on the Host screen
     *
     * @param $el The container element for the countdown timer
     * @param startTime
     * @param callback The function to call when the timer ends.
     */
    countDown : ($el, startTime, callback) => {

        // Display the starting time on the screen.
        $el.text(startTime);
        App.doTextFit('#hostWord');

        // console.log('Starting Countdown...');

        // Start a 1 second timer
        var timer = setInterval(countItDown,1000);

        // Decrement the displayed timer value on each 'tick'
        function countItDown(){
            startTime -= 1
            $el.text(startTime);
            App.doTextFit('#hostWord');

            if( startTime <= 0 ){
                // console.log('Countdown Finished.');

                // Stop the timer and do the callback.
                clearInterval(timer);
                callback();
                return;
            }
        }

    },

    /**
     * Make the text inside the given element as big as possible
     * See: https://github.com/STRML/textFit
     *
     * @param el The parent element of some text
     */
    doTextFit : (el) => {
        textFit(
            $(el)[0],
            {
                alignHoriz:true,
                alignVert:false,
                widthOnly:true,
                reProcess:true,
                maxFontSize:300
            }
        );
    }

};

App.init();
