const { Server } = require("socket.io");

const ws_port = process.env.WS_PORT || 4000;
const io = new Server(server, {
    maxHttpBufferSize: 1e8
  });

io.on('connection', (socket) => {
    console.log("New client connected");
});

console.log("Websocket server listening at ws://localhost:" + ws_port + "/");
module.exports = wss;