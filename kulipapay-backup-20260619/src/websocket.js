const WebSocket = require('ws');
const eventBus = require('./events/eventBus');

class WebSocketServer {
  constructor() {
    this.clients = new Set();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws) => {
      console.log('🔌 WebSocket client connected');
      this.clients.add(ws);
      
      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        this.clients.delete(ws);
      });
      
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        message: 'Connected to KulipaPay real-time feed',
        timestamp: new Date().toISOString()
      }));
    });
    
    // Subscrever eventos Redis e broadcast para WebSocket
    eventBus.subscribe((event) => {
      const message = JSON.stringify({
        type: 'EVENT',
        event: event.type,
        data: event.data,
        timestamp: event.timestamp
      });
      
      this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });
  }

  broadcast(event) {
    const message = JSON.stringify(event);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  getConnectionsCount() {
    return this.clients.size;
  }
}

module.exports = new WebSocketServer();
