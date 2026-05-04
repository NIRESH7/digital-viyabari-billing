import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static String get baseUrl {
    // For Android emulator, use 10.0.2.2. For others (Windows/Web), use localhost.
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8000';
    }
    return 'http://localhost:8000';
  }

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<http.Response> get(String path) async {
    final headers = await _getHeaders();
    return http.get(Uri.parse('$baseUrl$path'), headers: headers);
  }

  Future<http.Response> post(String path, dynamic body) async {
    final headers = await _getHeaders();
    return http.post(Uri.parse('$baseUrl$path'), headers: headers, body: json.encode(body));
  }

  Future<http.Response> patch(String path, dynamic body) async {
    final headers = await _getHeaders();
    return http.patch(Uri.parse('$baseUrl$path'), headers: headers, body: json.encode(body));
  }

  Future<http.Response> delete(String path) async {
    final headers = await _getHeaders();
    return http.delete(Uri.parse('$baseUrl$path'), headers: headers);
  }
}
