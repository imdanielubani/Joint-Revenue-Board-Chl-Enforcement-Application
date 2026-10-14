import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/environment/app_environment.dart';
import '../../features/auth/data/session_token_manager.dart';
import 'interceptors/auth_interceptor.dart';

/// The HTTP client for the enforcement API (`API_BASE_URL`, ending in
/// `/api/v1`). It sends the officer's access token and renews it when it
/// expires.
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppEnvironment.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      contentType: Headers.jsonContentType,
      responseType: ResponseType.json,
    ),
  );
  dio.interceptors.add(
    AuthInterceptor(dio: dio, tokens: ref.watch(tokenManagerProvider)),
  );
  ref.onDispose(dio.close);
  return dio;
});
