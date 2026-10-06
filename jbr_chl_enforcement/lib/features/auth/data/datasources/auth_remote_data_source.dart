import 'package:dio/dio.dart';

import '../../../../core/constants/api_endpoints.dart';
import '../../domain/entities/auth_session.dart';
import '../models/auth_token_model.dart';
import '../models/login_request_model.dart';

/// Calls the enforcement API's sign-in endpoint.
class AuthRemoteDataSource {
  const AuthRemoteDataSource(this._dio);

  final Dio _dio;

  /// Throws [DioException] on transport or HTTP errors and
  /// [FormatException] on an unexpected response body.
  Future<AuthSession> login(LoginRequestModel request) async {
    final response = await _dio.post<Map<String, dynamic>>(
      ApiEndpoints.login,
      data: request.toJson(),
    );
    final body = response.data;
    if (body == null) throw const FormatException('Empty sign-in response');
    return AuthTokenModel.fromLoginResponse(body, receivedAt: DateTime.now());
  }
}
