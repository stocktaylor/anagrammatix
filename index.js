// Import mngr
const mngr = require(`./mngr`);

mngr.init().then(() => {
    //Import System Info API module
    const sysInfoAPI = require(`./sysInfoAPI`);

    // Import the Express module
    const express = require('express');

    // Import the 'path' module (packaged with Node.js)
    const path = require('path');

    // Create a new instance of Express
    const app = express();

    // Serve static html, js, css, and image files from the 'frontend' directory
    app.use(express.static(path.join(__dirname,'frontend')));

    // Create a Node.js based http server on port 8080
    const server = require('http').createServer(app).listen(process.env.PORT || 8080);

    // Create a Socket.IO server and attach it to the http server
    const io = require('socket.io').listen(server);

    // Reduce the logging output of Socket.IO
    io.set('log level',1);

    // Listen for Socket.IO Connections. Once connected, start the game logic.
    io.sockets.on('connection', function (socket) {
        mngr.ptg().initConnection(io, socket);
    });


    app.use(`/api`, (request, response) => {
        let pathArr = request.path.split('/');
        if(pathArr.length > 1) {
            switch(pathArr[1]) {
                case `currentRooms`:
                    response.send(mngr.ptg().currentRooms());
                    break;
                case `clientInfo`:
                    response.send(mngr.ptg().clientInfo());
                    break;
                case `sysInfo`: 
                    response.send(sysInfoAPI.getFullSysInfoJSON());
                    break;
                case `getClientCnfg`:
                    response.send(sysInfoAPI.getClientCnfg());
                    break;
                default:
                    response.send(
                        {
                            error: true,
                            message: `invalid path`
                        }
                    );
                    break;
            }
        } else {
            response.send(
                {
                    error: true,
                    message: `invalid path`
                }
            );
        }
    });
}).catch((reason) => {
    console.log(`Init Failed: `);
    console.log(reason);
})

