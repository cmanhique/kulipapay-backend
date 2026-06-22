const WebSocket = require('ws');

class WebSocketService {
  constructor() {
    this.clients = new Map();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, req) => {
      const kpId = this.extractKpId(req);
      if (kpId) {
        this.clients.set(kpId, ws);
        console.log(`WebSocket connected: ${kpId}`);
        
        ws.on('close', () => {
          this.clients.delete(kpId);
          console.log(`WebSocket disconnected: ${kpId}`);
        });
        
        ws.on('error', (error) => {
          console.error(`WebSocket error for ${kpId}:`, error);
        });
      }
    });
  }

  extractKpId(req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get('kpId');
  }

  sendBalanceUpdate(kpId, balance) {
    const client = this.clients.get(kpId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'BALANCE_UPDATE',
        data: { balance, timestamp: new Date().toISOString() }
      }));
    }
  }

  sendTransactionNotification(kpId, transaction) {
    const client = this.clients.get(kpId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'TRANSACTION',
        data: transaction
      }));
    }
  }

  broadcastToAgents(message) {
    for (const [kpId, client] of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  }
}

module.exports = new WebSocketService();
