import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:flutter/foundation.dart';

class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  static WebSocketService get instance => _instance;

  WebSocketChannel? _channel;
  final List<void Function(Map<String, dynamic>)> _listeners = [];

  WebSocketService._internal();

  String get wsUrl {
    if (kDebugMode) {
      return 'ws://localhost:3000/ws';
    }
    return 'wss://kulipapay-backend.onrender.com/ws';
  }

  void connect(String token) {
    try {
      _channel = WebSocketChannel.connect(
        Uri.parse('$wsUrl?token=$token'),
      );

      _channel!.stream.listen(
        (data) {
          try {
            final message = jsonDecode(data as String);
            debugPrint('📡 WebSocket message: $message');
            _notifyListeners(message);
          } catch (e) {
            debugPrint('Erro ao processar mensagem WebSocket: $e');
          }
        },
        onError: (error) {
          debugPrint('WebSocket error: $error');
          _reconnect();
        },
        onDone: () {
          debugPrint('WebSocket disconnected');
          _reconnect();
        },
      );

      debugPrint('✅ WebSocket conectado');
    } catch (e) {
      debugPrint('❌ Erro ao conectar WebSocket: $e');
      _reconnect();
    }
  }

  void _reconnect() {
    Future.delayed(const Duration(seconds: 5), () {
      debugPrint('🔄 Tentando reconectar WebSocket...');
      // Pega o token atual e reconecta
    });
  }

  void addListener(void Function(Map<String, dynamic>) listener) {
    _listeners.add(listener);
  }

  void removeListener(void Function(Map<String, dynamic>) listener) {
    _listeners.remove(listener);
  }

  void _notifyListeners(Map<String, dynamic> message) {
    for (var listener in _listeners) {
      try {
        listener(message);
      } catch (e) {
        debugPrint('Erro ao notificar listener: $e');
      }
    }
  }

  void send(Map<String, dynamic> message) {
    if (_channel != null) {
      _channel!.sink.add(jsonEncode(message));
    }
  }

  void disconnect() {
    if (_channel != null) {
      _channel!.sink.close();
      _channel = null;
    }
  }
}
