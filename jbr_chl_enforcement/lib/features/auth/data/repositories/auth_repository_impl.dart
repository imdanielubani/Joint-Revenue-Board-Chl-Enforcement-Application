import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/environment/app_environment.dart';
import '../../../../shared/networking/dio_provider.dart';
import '../../../../shared/storage/preferences_service.dart';
import '../../../../shared/storage/secure_storage_service.dart';
import '../../domain/entities/auth_failure.dart';
import '../../domain/entities/auth_session.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_local_data_source.dart';
import '../datasources/auth_remote_data_source.dart';
import '../models/login_request_model.dart';
import 'demo_auth_repository.dart';

final authLocalDataSourceProvider = Provider<AuthLocalDataSource>(
  (ref) => AuthLocalDataSource(
    ref.watch(secureStorageServiceProvider),
    ref.watch(preferencesServiceProvider),
  ),
);

/// The API repository, or the demo one in debug builds started with
/// `--dart-define=AUTH_DEMO=true`.
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final local = ref.watch(authLocalDataSourceProvider);
  if (AppEnvironment.authDemoMode) return DemoAuthRepository(local);
  return AuthRepositoryImpl(
    AuthRemoteDataSource(ref.watch(dioProvider)),
    local,
    AppEnvironment.hasApi,
  );
});

class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl(this._remote, this._local, this._isConfigured);

  final AuthRemoteDataSource _remote;
  final AuthLocalDataSource _local;
  final bool _isConfigured;

  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
    required bool rememberSession,
  }) async {
    if (!_isConfigured) {
      throw const AuthException(
        AuthFailure.notConfigured,
        'API_BASE_URL is not set',
      );
    }

    final AuthSession session;
    try {
      session = await _remote.login(
        LoginRequestModel(email: email, password: password),
      );
    } on DioException catch (error) {
      throw AuthException(_failureFor(error), error.message);
    } on FormatException catch (error) {
      throw AuthException(AuthFailure.server, error.message);
    }

    await storeSession(_local, session, rememberSession: rememberSession);
    return session;
  }

  @override
  Future<void> requestPasswordReset({required String email}) async {
    if (!_isConfigured) {
      throw const AuthException(
        AuthFailure.notConfigured,
        'API_BASE_URL is not set',
      );
    }
    try {
      await _remote.requestPasswordReset(email);
    } on DioException catch (error) {
      // Unknown (404) and deactivated (403) accounts are reported as sent,
      // so the response cannot be used to find out about accounts.
      final status = error.response?.statusCode;
      if (status == 404 || status == 403) return;
      throw AuthException(_failureFor(error), error.message);
    }
  }

  static AuthFailure _failureFor(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.transformTimeout:
      case DioExceptionType.connectionError:
        return AuthFailure.network;
      case DioExceptionType.badResponse:
        return switch (error.response?.statusCode) {
          400 || 401 || 422 => AuthFailure.invalidCredentials,
          403 => AuthFailure.accountDisabled,
          _ => AuthFailure.server,
        };
      case DioExceptionType.badCertificate:
      case DioExceptionType.cancel:
      case DioExceptionType.unknown:
        return AuthFailure.server;
    }
  }
}

/// Saves the session when remembered and clears any old one otherwise.
/// Storage problems are logged but do not fail a successful sign-in.
Future<void> storeSession(
  AuthLocalDataSource local,
  AuthSession session, {
  required bool rememberSession,
}) async {
  try {
    await local.saveRememberSession(rememberSession);
    if (rememberSession) {
      await local.saveSession(session);
    } else {
      await local.clearSession();
    }
  } catch (error) {
    debugPrint('Could not update the saved session: $error');
  }
}
