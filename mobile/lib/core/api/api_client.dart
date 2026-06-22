import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  final String baseUrl;

  ApiClient({required this.baseUrl});

  // ============================
  // GET
  // ============================
  Future<Map<String, dynamic>> get(String url, String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl$url'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final data = jsonDecode(response.body);
    if (response.statusCode >= 400) {
      throw Exception(data['error']?['message'] ?? 'Erro na requisição');
    }
    return data;
  }

  // ============================
  // POST
  // ============================
  Future<Map<String, dynamic>> post(
    String url,
    Map<String, dynamic> body,
    String token,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl$url'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode >= 400) {
      throw Exception(data['error']?['message'] ?? 'Erro na requisição');
    }
    return data;
  }

  // ============================
  // PUT
  // ============================
  Future<Map<String, dynamic>> put(
    String url,
    Map<String, dynamic> body,
    String token,
  ) async {
    final response = await http.put(
      Uri.parse('$baseUrl$url'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode >= 400) {
      throw Exception(data['error']?['message'] ?? 'Erro na requisição');
    }
    return data;
  }

  // ============================
  // PATCH
  // ============================
  Future<Map<String, dynamic>> patch(
    String url,
    Map<String, dynamic> body,
    String token,
  ) async {
    final response = await http.patch(
      Uri.parse('$baseUrl$url'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode >= 400) {
      throw Exception(data['error']?['message'] ?? 'Erro na requisição');
    }
    return data;
  }

  // ============================
  // DELETE
  // ============================
  Future<void> delete(String url, String token) async {
    final response = await http.delete(
      Uri.parse('$baseUrl$url'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode >= 400) {
      final data = jsonDecode(response.body);
      throw Exception(data['error']?['message'] ?? 'Erro na requisição');
    }
  }

  // ============================
  // MULTIPART (para uploads)
  // ============================
  Future<Map<String, dynamic>> multipart(
    String url,
    Map<String, String> fields,
    String token, {
    List<http.MultipartFile>? files,
  }) async {
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$url'))
      ..headers.addAll({
        'Authorization': 'Bearer $token',
      });

    fields.forEach((key, value) {
      request.fields[key] = value;
    });

    if (files != null) {
      request.files.addAll(files);
    }

    final response = await request.send();
    final responseBody = await response.stream.bytesToString();
    final data = jsonDecode(responseBody);

    if (response.statusCode >= 400) {
      throw Exception(data['error']?['message'] ?? 'Erro na requisição');
    }
    return data;
  }
}