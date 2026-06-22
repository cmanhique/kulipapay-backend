/**
 * SSE ROUTES
 * 
 * 🎯 Server-Sent Events para notificações em tempo real
 */

const WebSocketService = require('../core/websocket/websocket.service');

async function websocketRoutes(fastify) {
  
  /**
   * GET /api/v2/sse/events
   * Stream de eventos para o utilizador
   */
  fastify.get('/api/v2/sse/events', async (req, reply) => {
    const token = req.query?.token;
    
    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token required'
        }
      });
    }
    
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const kp_id = decoded.kp_id;
      
      // Configurar SSE
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      
      // Enviar evento inicial
      reply.raw.write(`data: ${JSON.stringify({ type: 'CONNECTED', kp_id })}\n\n`);
      
      // Guardar a conexão no serviço
      const connectionId = WebSocketService.registerSSEConnection(kp_id, reply);
      
      // Evento de fecho
      req.raw.on('close', () => {
        WebSocketService.unregisterSSEConnection(kp_id, connectionId);
        reply.raw.end();
      });
      
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token'
        }
      });
    }
  });
  
  /**
   * GET /api/v2/sse/stats
   * Estatísticas das conexões SSE
   */
  fastify.get('/api/v2/sse/stats', async (req, reply) => {
    const stats = WebSocketService.getStats();
    
    return reply.send({
      success: true,
      data: stats
    });
  });
  
  /**
   * POST /api/v2/sse/test
   * Enviar notificação de teste
   */
  fastify.post('/api/v2/sse/test', async (req, reply) => {
    const { kp_id, message } = req.body;
    
    if (!kp_id) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'KP_ID_REQUIRED',
          message: 'kp_id is required'
        }
      });
    }
    
    const sent = WebSocketService.sendToUser(kp_id, {
      type: 'TEST_NOTIFICATION',
      data: {
        message: message || 'Test notification',
        timestamp: new Date().toISOString()
      }
    });
    
    return reply.send({
      success: true,
      data: {
        kp_id,
        sent: sent > 0,
        message: sent > 0 ? 'Notification sent' : 'User not connected'
      }
    });
  });
}

module.exports = websocketRoutes;
