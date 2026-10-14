import 'package:dio/dio.dart';

import '../../security/token_manager.dart';

/// Sends the officer's access token with every request and, when the
/// server answers 401 because it has expired, renews it once and repeats
/// the request.
///
/// A request that sets its own `Authorization` header keeps it, and one
/// with [skipRenewal] in its `extra` is never renewed (sign-in, token
/// refresh and sign-out).
class AuthInterceptor extends Interceptor {
  AuthInterceptor({required this._dio, required this._tokens});

  final Dio _dio;
  final TokenManager _tokens;

  /// `extra` key: don't renew the token for this request.
  static const String skipRenewal = 'auth.skipRenewal';
  static const String _retried = 'auth.retried';

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _tokens.accessToken;
    if (token != null && !options.headers.containsKey('Authorization')) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final options = err.requestOptions;
    if (err.response?.statusCode != 401 ||
        options.extra[skipRenewal] == true ||
        options.extra[_retried] == true ||
        _tokens.accessToken == null) {
      handler.next(err);
      return;
    }

    final renewed = await _tokens.renew(_dio);
    if (renewed == null) {
      handler.next(err);
      return;
    }
    try {
      final retry = options.copyWith(
        headers: {...options.headers, 'Authorization': 'Bearer $renewed'},
        extra: {...options.extra, _retried: true},
      );
      handler.resolve(await _dio.fetch<dynamic>(retry));
    } on DioException catch (error) {
      handler.next(error);
    }
  }
}
