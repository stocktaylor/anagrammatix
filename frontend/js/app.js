var App = {

    initPlatformTweaks: () => {
        if(navigator.userAgent.match(/Android/i)){
            //Android specific things
            alert(`Android`);
        } else if(navigator.userAgent.match(/iPhone/i)) {
            //iPhone specific things
            alert(`iPhone`);
        }
    },

    listeners : {
        pageResize: () => {
            window.onresize = () =>{
                App.doTextFit('.title');
                App.doTextFit('#gameURL');
                App.doTextFit('#hostWord');
            }
        },
        settingsClick: () => {
            document.getElementById(`settingsButton`).addEventListener(`click`, () => {
                if(App.stateInfo.settingsOpen) {
                    if(App.hlpFn.isFunction(App.views[App.stateInfo.currentView])) {
                        App.views[App.stateInfo.currentView]();
                        document.getElementById(`settingsButton`).innerHTML = `Settings`;
                    } else {
                        alert(`Fatal Error! Current view set in state info does not reference a view enable function`);
                    }
                } else {
                    App.views.settingsView();
                }
            });
            
        }
    },

    initListeners: () => {
        for(const key in App.listeners) {
            let thisListener = App.listeners[key];

            if(App.hlpFn.isFunction(thisListener)) {
                thisListener();
            }
        }
    },

    hlpFn: {
        isUndefined: (chk) => {
            return typeof chk == `undefined`
        },

        isFunction: (chk) => {
            return typeof chk == `function`;
        }, 

        isString: (chk) => {
            return typeof chk == `string`;
        },

        fitToScreenWidth: (elem, staticWidth) => {
            elem.style.transform = `scale(` + window.innerWidth/staticWidth + `)`;
        },

        fitToScreenHeight: (elem, staticHeight) => {
            elem.style.transform = `scale(` + window.innerHeight/staticHeight + `)`;
        }
    },

    /**
     * Keep track of the gameId, which is identical to the ID
     * of the Socket.IO Room used for the players and host to communicate
     *
     */
    gameId: 0,

    /**
    * Contains references to player data
    */
    players: [],

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

    stateInfo: {
        settingsOpen: false,
        currentView: `introView`
    },

    /* *************************************
     *                Setup                *
     * *********************************** */

    /**
     * This runs when the page initially loads.
     */
    init: () => {
        App.initPlatformTweaks();
        App.initListeners();
        App.cacheElements();
        App.showInitScreen();
        App.bindEvents();
    },

    /**
     * Create references to on-screen elements used throughout the game.
     */
    cacheElements: () => {
        // Templates
        App.gameArea = document.getElementById(`gameArea`);
        App.realEstate = document.getElementById(`realEstate`);
        App.cardElement = document.getElementById(`card-element`).innerHTML;
        App.scrollCardView = document.getElementById(`scroll-card-view`).innerHTML;
        App.templateIntroScreen = document.getElementById(`intro-screen-template`).innerHTML;
        App.templateNewGame = document.getElementById(`create-game-template`).innerHTML;
        App.joinGameInfo = document.getElementById(`join-game-info`).innerHTML;
        App.templateJoinGame = document.getElementById(`join-game-template`).innerHTML;
        App.templateWaitStart = document.getElementById(`wait-start-template`).innerHTML
        //App.hostGame = document.getElementById(`host-game-template`).innerHTML;
    },

    /**
     * Create some click handlers for the various buttons that appear on-screen.
     */
    bindEvents: () => {
        domHelper.clickID(`btnJoin`, App.Player.onPlayerStartClick);
        domHelper.clickID(`btnStart`, App.Player.leaderStartGame);
        domHelper.clickClass(`btnAnswer`, App.Player.onPlayerAnswerClick);
        domHelper.clickID(`btnPlayerRestart`, App.Player.onPlayerRestart);
    },

    /* *************************************
     *             Game Logic              *
     * *********************************** */

    /**
     * Show the initial phoneTVGame Title Screen
     * (with Start and Join buttons)
     */
    showInitScreen: () => {
        App.views.introView();
    },

    currentInteractables: {

    },

    settings: {
        about: {
            display: "About this game",
            renderFunc: html.htmlElements.blackCard,
            canShow: () => {
                return true;
            },
            execute: () => {
                App.views.aboutView();
            }
        },
        requestControl: {
            display: "Request Control",
            renderFunc: html.htmlElements.whiteCard,
            canShow: () => {
                return true;
            },
            execute: () => {
                alert(`Request control`);
            }
        },
        enableDevMode: {
            display: "Developer Mode",
            renderFunc: html.htmlElements.whiteCard,
            canShow: () => {
                return true;
            },
            execute: () => {
                alert(`ToDo: Show Dev Mode`);
            }
        },
        showUserAgent: {
            display: "Show me my User Agent",
            renderFunc: html.htmlElements.whiteCard,
            canShow: () => {
                return true;
            },
            execute: (cardElem) => {
                cardElem.cardText.style.display = null;
                cardElem.cntrBox.style.display = `none`;
                cardElem.cardText.innerHTML = navigator.userAgent;
            }
        }
    },

    views : {
        introView: () => {
            App.stateInfo.settingsOpen = false;
            App.stateInfo.currentView = `introView`;
            App.realEstate.innerHTML = App.templateIntroScreen;
            let dblButtonBoxes = document.getElementsByClassName(`dblButtonBox`);
            for(let i = 0; i < dblButtonBoxes.length; i++) {
                App.hlpFn.fitToScreenWidth(dblButtonBoxes[i], 1200);
            }
            domHelper.clickID(`btnCreateGame`, App.Host.onCreateClick);
            domHelper.clickID(`btnJoinGame`, App.Player.onJoinClick);
        }, 

        settingsView: () => {
            App.stateInfo.settingsOpen = true;
            App.realEstate.innerHTML = App.scrollCardView;
            let scrollWrappers = document.getElementsByClassName(`v-scroll-wrapper`);
            for(let i = 0; i < scrollWrappers.length; i++) {
                screenRatio = window.innerWidth/window.innerHeight;
                cardRatio = 500/700;
                if(screenRatio > cardRatio) {
                    App.hlpFn.fitToScreenHeight(scrollWrappers[i], 800);
                }
                App.hlpFn.fitToScreenWidth(scrollWrappers[i], 600);
            }
            document.getElementById(`settingsButton`).innerHTML = `Back`;

            let page = document.getElementById(`scrollElem`);
            page.notifyChildren = () => {
                alert(`init child notify reference`);
            };
            for(const key in App.settings) {
                let currentSetting = App.settings[key];
                if(currentSetting.canShow()) {
                    let settingHTML = currentSetting.renderFunc(key, currentSetting.display);

                    settingHTML.card.addEventListener(`click`, (event) => {
                        if(!(event.srcElement === settingHTML.cnfmBttn)) {
                            //show confirm button
                            if(settingHTML.cnfmMode) {
                                settingHTML.cardText.style.display = null;
                                settingHTML.cntrBox.style.display = `none`;
                                settingHTML.cnfmMode = false;
                            } else { //show text
                                settingHTML.cardText.style.display = `none`;
                                settingHTML.cntrBox.style.display = `flex`;
                                settingHTML.cnfmMode = true;
                            }
                        }

                    });
                    settingHTML.cnfmBttn.addEventListener(`click`, () => {
                        navigator.vibrate(100);
                        currentSetting.execute(settingHTML);
                        settingHTML.cardText.style.display = null;
                        settingHTML.cntrBox.style.display = `none`;
                        settingHTML.cnfmMode = false;
                    });
                    page.appendChild(settingHTML.card);
                }
            }
        },

        aboutView: () => {
            App.stateInfo.settingsOpen = true;
            App.realEstate.innerHTML = App.scrollCardView;
            let scrollWrappers = document.getElementsByClassName(`v-scroll-wrapper`);
            for(let i = 0; i < scrollWrappers.length; i++) {
                screenRatio = window.innerWidth/window.innerHeight;
                cardRatio = 500/700;
                if(screenRatio > cardRatio) {
                    App.hlpFn.fitToScreenHeight(scrollWrappers[i], 800);
                }
                App.hlpFn.fitToScreenWidth(scrollWrappers[i], 600);
            }
            document.getElementById(`settingsButton`).innerHTML = `Back`;

            let aboutHTML = html.htmlElements.blackCardAnyHeight(`about`, `This is a test of the About Card`);
            document.getElementById(`scrollElem`).appendChild(aboutHTML.card);
        },

        createHost: () => {
            App.stateInfo.settingsOpen = false;
            App.stateInfo.currentView = `createHost`;
            App.realEstate.innerHTML = App.templateNewGame;

            document.getElementById(`aboveCardsContent`).innerHTML = App.joinGameInfo;

            //ToDo: API to get the hostname/url of the server
            document.getElementById(`gameURL`).innerHTML = window.location.href;
            App.doTextFit('#gameURL');
            
            // Show the gameId / room id on screen
            document.getElementById(`spanNewGameCode`).innerHTML = App.gameId;
        },

        joinPlayer: () => {
            App.stateInfo.settingsOpen = false;
            App.stateInfo.currentView = `joinPlayer`;
            App.realEstate.innerHTML = App.templateJoinGame;
            App.bindEvents();
        },
        joinedPlayer: () => {
            App.stateInfo.settingsOpen = false;
            App.stateInfo.currentView = `joinPlayer`;
            App.realEstate.innerHTML = App.scrollCardView;
            let scrollWrappers = document.getElementsByClassName(`v-scroll-wrapper`);
            for(let i = 0; i < scrollWrappers.length; i++) {
                screenRatio = window.innerWidth/window.innerHeight;
                cardRatio = 500/700;
                // if(screenRatio > cardRatio) {
                //     App.hlpFn.fitToScreenHeight(dblButtonBoxes[i], 800);
                // }
                App.hlpFn.fitToScreenWidth(scrollWrappers[i], 600);
            }
            let scroller = document.getElementById(`scrollElem`);
            if(App.players[0].id == App.mySocketId) {
                if(App.players.length < 3) {
                    scroller.appendChild(html.htmlElements.blackCard(`titleCard`, `Need at least 3 players before the game can start...`));
                } else {
                    let card = html.htmlElements.blackCard(`titleCard`, `Click to start game`);
                    card.addEventListener(`click`, () => {
                        App.Player.leaderStartGame();
                    });
                    scroller.appendChild(card);
                }
            } else {
                App.views.updateHeader(`Waiting for the game to start...`);
                //scroller.appendChild(html.htmlElements.blackCard(`titleCard`, `Waiting for first player to start the game...`));
            }
            for(let i = 0; i < App.players.length; i++) {
                scroller.appendChild(html.htmlElements.whiteCard(`player` + i, App.players[i].playerName));
            }
        },
        popUpMessage: (message) => {
            if(App.hlpFn.isString(message)) {
                alert(message);
            } else {
                alert(`Pop up function was called, but message passed was not of type string.  Saving a trace to the console...`);
                console.trace();
            }
        }, 
        updateHeader: (title) => {
            if(App.hlpFn.isString(title)) {
                document.getElementById(`ptvgHeader`).innerHTML = title;
            } else {
                document.getElementById(`ptvgHeader`).innerHTML = `Cards Against Humanity`;
            }
        }
    },


    /* *******************************
       *         HOST CODE           *
       ******************************* */
    Host : {
        /**
         * A reference to the correct answer for the current round.
         */
        currentCorrectAnswer: '',

        playerIndexToCard: [`controllerCard`, `player1Card`, `player2Card`, `player3Card`, `player4Card`, `player5Card`],

        /**
         * Handler for the "Start" button on the Title Screen.
         */
        onCreateClick: () => {
            // console.log('Clicked "Create A Game"');
            IO.socket.emit('hostCreateNewGame', App.mySocketId);
        },

        /**
         * The Host screen is displayed for the first time.
         * @param data{{ gameId: int, mySocketId: * }}
         */
        gameInit: (data) => {
            App.gameId = data.gameId;
            App.mySocketId = data.mySocketId;
            App.myRole = 'Host';

            App.views.createHost();
            // console.log("Game started with ID: " + App.gameId + ' by host: ' + App.mySocketId);
        },

        /**
         * Show the Host screen containing the game URL and unique game ID
         */

        /**
         * Update the Host screen when the first player joins
         * @param data{{playerName: string}}
         */
        updateGameState: (action, data) => {
            // If this is a restarted game, show the screen.
            // if ( App.Host.isNewGame ) {
            //     App.Host.displayNewGameScreen();
            // }

            // Store the new player's data on the Host.
            App.players = data.game.players;

            for(let i = 0; i < App.Host.playerIndexToCard.length; i++) {
                document.getElementById(App.Host.playerIndexToCard[i]).childNodes[1].innerHTML = `Waiting for players to join...`;
            }

            for(let i = 0; i < data.game.players.length; i++) {
                document.getElementById(App.Host.playerIndexToCard[i]).childNodes[1].innerHTML = data.game.players[i].playerName + (data.game.players[i].connected ? `` : ` (Disconnected)`);
            }
        },
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
            App.views.joinPlayer();
        },

        leaderStartGame: () => {
            alert(`start game!`);
            IO.socket.emit(`leaderStartGame`, {gameId: App.gameId});
        },

        onPlayerStartClick: () => {
            var data = {
                mySocketId: App.mySocketId,
                gameId : ($('#inputGameId').val()),
                playerName : $('#inputPlayerName').val() || 'anon'
            };

            // Send the gameId and playerName to the server
            IO.socket.emit('playerJoinGame', data);

            // Set the appropriate properties for the current player.
            //todo: clear these variables if the game ends up not being joinable
            App.myRole = 'Player';
            App.Player.myName = data.playerName;
        },

        /**
         * Display the waiting screen for player 1
         * @param data
         */
        updateGameState : (action, data) => {
            switch(action) {
                case `connect`:
                    console.log(`Player Connect Event`);
                    if(App.gameId == 0) {
                        console.log(`GameID not set, setting now...`);
                        App.gameId = data.game.gameId;
                    }
                    App.players = data.game.players;
                    console.log(App.players);
                    break;
                case `disconnect`:

                    break;
            }
            App.views.joinedPlayer();
            // if(data.playerChanged == App.Player.myName) {
            //     App.gameId = data.game.gameId;
            //     App.gameArea.innerHTML = App.templateWaitStart;
            //     document.getElementById(`wait-start-player-name`).innerHTML = App.Player.myName;
            // }
            // if(!document.getElementById(`btnStart`).classList.contains(`hidden`))document.getElementById(`btnStart`).classList.add(`hidden`);
            // if(data.game.players.length > 0 && data.game.players[0].id == IO.socket.socket.sessionid) {
            //     if(document.getElementById(`btnStart`).classList.contains(`hidden`)){
            //         document.getElementById(`btnStart`).classList.remove(`hidden`);
            //         App.bindEvents();
            //     }
            //     if(data.game.players.length >= 3) {
            //         if(document.getElementById(`btnStart`).classList.contains(`disabled`)){
            //             document.getElementById(`btnStart`).classList.remove(`disabled`);
            //         }
            //     } else {
            //         if(!document.getElementById(`btnStart`).classList.contains(`disabled`)){
            //             document.getElementById(`btnStart`).classList.add(`disabled`);
            //         }
            //     }
            // }
        },
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
