/**
 * SSE/WEBSOCKET SERVICE
 * 
 * 🎯 Notificações em tempo real (SSE + WebSocket)
 */

class WebSocketService {
  
  constructor() {
    this.connections = new Map(); // kp_id -> Set de conexões (SSE)
    this.websocketConnections = new Map(); // kp_id -> Set de WebSockets
    this.connectionCount = 0;
    this.sseConnections = new Map(); // connectionId -> { kp_id, reply }
    this.sseCounter = 0;
  }
  
  /**
   * Registrar conexão SSE
   */
  registerSSEConnection(kp_id, reply) {
    const id = `sse_${++this.sseCounter}`;
    
    if (!this.connections.has(kp_id)) {
      this.connections.set(kp_id, new Set());
    }
    
    this.connections.get(kp_id).add(reply);
    this.sseConnections.set(id, { kp_id, reply });
    this.connectionCount++;
    
    console.log(`📡 SSE conectado: ${kp_id} (Total: ${this.connectionCount})`);
    
    return id;
  }
  
  /**
   * Remover conexão SSE
   */
  unregisterSSEConnection(kp_id, connectionId) {
    const userConnections = this.connections.get(kp_id);
    if (userConnections) {
      const reply = this.sseConnections.get(connectionId)?.reply;
      if (reply) {
        userConnections.delete(reply);
        if (userConnections.size === 0) {
          this.connections.delete(kp_id);
        }
      }
    }
    this.sseConnections.delete(connectionId);
    this.connectionCount--;
    
    console.log(`📡 SSE desconectado: ${kp_id} (Total: ${this.connectionCount})`);
  }
  
  /**
   * Registrar conexão WebSocket
   */
  registerWebSocket(kp_id, ws) {
    if (!this.websocketConnections.has(kp_id)) {
      this.websocketConnections.set(kp_id, new Set());
    }
    this.websocketConnections.get(kp_id).add(ws);
    console.log(`🔌 WebSocket conectado: ${kp_id}`);
  }
  
  /**
   * Remover conexão WebSocket
   */
  unregisterWebSocket(kp_id, ws) {
    const userConnections = this.websocketConnections.get(kp_id);
    if (userConnections) {
      userConnections.delete(ws);
      if (userConnections.size === 0) {
        this.websocketConnections.delete(kp_id);
      }
    }
    console.log(`🔌 WebSocket desconectado: ${kp_id}`);
  }
  
  /**
   * Enviar para SSE
   */
  sendToSSE(reply, message) {
    try {
      reply.raw.write(`data: ${JSON.stringify(message)}\n\n`);
    } catch (error) {
      console.error('❌ Erro ao enviar SSE:', error.message);
    }
  }
  
  /**
   * Enviar mensagem para um utilizador
   */
  sendToUser(kp_id, message) {
    let sent = 0;
    
    // Enviar via SSE
    const sseConnections = this.connections.get(kp_id);
    if (sseConnections) {
      for (const reply of sseConnections) {
        this.sendToSSE(reply, {
          type: message.type || 'NOTIFICATION',
          data: message.data || message,
          timestamp: new Date().toISOString()
        });
        sent++;
      }
    }
    
    // Enviar via WebSocket
    const wsConnections = this.websocketConnections.get(kp_id);
    if (wsConnections) {
      for (const ws of wsConnections) {
        try {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({
              type: message.type || 'NOTIFICATION',
              data: message.data || message,
              timestamp: new Date().toISOString()
            }));
            sent++;
          }
        } catch (error) {
          console.error('❌ Erro ao enviar WebSocket:', error.message);
        }
      }
    }
    
    return sent;
  }
  
  /**
   * Notificar mudança de permissão
   */
  async notifyPermissionChange(kp_id, changes) {
    return this.sendToUser(kp_id, {
      type: 'PERMISSION_CHANGED',
      data: {
        changes: changes,
        action: 'REFRESH_ACCESS'
      }
    });
  }
  
  /**
   * Notificar KYC atualizado
   */
  async notifyKYCUpdated(kp_id, status) {
    return this.sendToUser(kp_id, {
      type: 'KYC_UPDATED',
      data: {
        status: status,
        action: 'REFRESH_USER'
      }
    });
  }
  
  /**
   * Notificar transação
   */
  async notifyTransaction(kp_id, transaction) {
    return this.sendToUser(kp_id, {
      type: 'TRANSACTION',
      data: transaction
    });
  }
  
  /**
   * Broadcast para todos
   */
  broadcastToAll(message) {
    let sent = 0;
    
    // SSE
    for (const [kp_id, connections] of this.connections) {
      for (const reply of connections) {
        this.sendToSSE(reply, {
          type: message.type || 'BROADCAST',
          data: message.data || message,
          timestamp: new Date().toISOString()
        });
        sent++;
      }
    }
    
    // WebSocket
    for (const [kp_id, connections] of this.websocketConnections) {
      for (const ws of connections) {
        try {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({
              type: message.type || 'BROADCAST',
              data: message.data || message,
              timestamp: new Date().toISOString()
            }));
            sent++;
          }
        } catch (error) {}
      }
    }
    
    return sent;
  }
  
  /**
   * Obter estatísticas
   */
  getStats() {
    return {
      totalConnections: this.connectionCount,
      totalUsers: this.connections.size,
      sseConnections: this.sseConnections.size,
      websocketConnections: this.websocketConnections.size,
      users: Array.from(this.connections.keys())
    };
  }
}

module.exports = new WebSocketService();
