import 'package:dio/dio.dart';

import '../../../../core/constants/api_endpoints.dart';
import '../../../../shared/networking/interceptors/auth_interceptor.dart';
import '../../domain/entities/auth_session.dart';
import '../models/auth_token_model.dart';
import '../models/login_request_model.dart';

/// Calls the enforcement API's sign-in, token refresh and sign-out
/// endpoints.
class AuthRemoteDataSource {
  const AuthRemoteDataSource(this._dio);

  final Dio _dio;

  /// None of these requests renews the token on a 401.
  static final Options _noRenewal = Options(
    extra: {AuthInterceptor.skipRenewal: true},
  );

  /// Throws [DioException] on transport or HTTP errors and
  /// [FormatException] on an unexpected response body.
  Future<AuthSession> login(LoginRequestModel request) async {
    final response = await _dio.post<Map<String, dynamic>>(
      ApiEndpoints.login,
      data: request.toJson(),
      options: _noRenewal,
    );
    final body = response.data;
    if (body == null) throw const FormatException('Empty sign-in response');
    return AuthTokenModel.fromLoginResponse(body, receivedAt: DateTime.now());
  }

  /// [session] with new tokens; its refresh token stops working. Throws
  /// [DioException] (401 or 403 when the session may not continue) and
  /// [FormatException] on an unexpected response body.
  Future<AuthSession> refresh(AuthSession session) async {
    final response = await _dio.post<Map<String, dynamic>>(
      ApiEndpoints.refresh,
      data: {'refreshToken': session.refreshToken},
      options: _noRenewal,
    );
    final body = response.data;
    if (body == null) throw const FormatException('Empty refresh response');
    return AuthTokenModel.renewed(session, body);
  }

  /// Ends [session] on the server. Throws [DioException] on failure.
  Future<void> logout(AuthSession session) async {
    await _dio.post<void>(
      ApiEndpoints.logout,
      options: _noRenewal.copyWith(
        headers: {'Authorization': 'Bearer ${session.accessToken}'},
      ),
    );
  }

  /// Requests a reset link. Throws [DioException] on transport or HTTP
  /// errors; the response body is not used.
  Future<void> requestPasswordReset(String email) async {
    await _dio.post<void>(
      ApiEndpoints.forgotPassword,
      data: {'email': email},
      options: _noRenewal,
    );
  }
}
