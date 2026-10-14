import 'package:dio/dio.dart';

/// Reads the enforcement API's error body:
///
/// ```json
/// { "error": { "code": "CHL_UNAVAILABLE", "message": "…", "requestId": "…" } }
/// ```
abstract final class ApiError {
  /// The error's stable code (e.g. "CHL_UNAVAILABLE"), if the server sent one.
  static String? code(DioException error) {
    final body = error.response?.data;
    if (body is! Map) return null;
    final nested = body['error'];
    final code = nested is Map ? nested['code'] : body['code'];
    return code is String ? code : null;
  }

  /// The server's message, written to be shown to the officer, if any.
  static String? message(DioException error) {
    final body = error.response?.data;
    if (body is! Map) return null;
    final nested = body['error'];
    final message = nested is Map ? nested['message'] : body['message'];
    return message is String && message.isNotEmpty ? message : null;
  }

  /// The `details` the server attached to the error, if any.
  static Object? details(DioException error) {
    final body = error.response?.data;
    final nested = body is Map ? body['error'] : null;
    return nested is Map ? nested['details'] : null;
  }

  /// No answer at all: no connection, or the server too slow.
  static bool isConnectionProblem(DioException error) => switch (error.type) {
    DioExceptionType.connectionTimeout ||
    DioExceptionType.sendTimeout ||
    DioExceptionType.receiveTimeout ||
    DioExceptionType.connectionError => true,
    _ => false,
  };

  /// What to tell the officer about [error], or [fallback].
  static String describe(DioException error, {required String fallback}) {
    if (isConnectionProblem(error)) {
      return 'Unable to connect. Check your network and try again.';
    }
    if (error.response?.statusCode == 401) {
      return 'Your session has ended. Please sign in again.';
    }
    return message(error) ?? fallback;
  }
}
