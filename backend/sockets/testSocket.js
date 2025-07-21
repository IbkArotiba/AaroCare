// testSocket.js
const http = require('http');
const SocketServer = require('./socketServer');
// Create a simple HTTP server
const server = http.createServer();

// Create socket server
const socketServer = new SocketServer(server);

// Start the socket server
try {
  socketServer.start();
  console.log('✅ SocketServer created successfully');
  
  // Start listening on port 3000
  server.listen(3000 , () => {
    console.log('✅ Test server running on port 3000');
    console.log('Socket.IO is ready for connections');
  });
} catch (error) {
  console.error('❌ Error starting SocketServer:', error);
}