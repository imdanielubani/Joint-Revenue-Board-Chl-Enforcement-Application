import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/security/token_manager.dart';
import '../domain/entities/auth_session.dart';
import '../presentation/providers/session_provider.dart';
import 'datasources/auth_remote_data_source.dart';
import 'repositories/auth_repository_impl.dart';

final tokenManagerProvider = Provider<TokenManager>(SessionTokenManager.new);

/// The tokens of the current session ([sessionProvider]).
///
/// Renewing replaces the session's tokens (and the remembered copy). When
/// the server refuses the refresh token (the 24 hours are over, or the
/// account was deactivated), the session ends and the officer is told.
/// When the server can't be reached, the session is kept as it is.
class SessionTokenManager implements TokenManager {
  SessionTokenManager(this._ref);

  final Ref _ref;
  Future<String?>? _renewing;

  @override
  String? get accessToken => _ref.read(sessionProvider)?.accessToken;

  @override
  Future<String?> renew(Dio client) =>
      _renewing ??= _renew(client).whenComplete(() => _renewing = null);

  Future<String?> _renew(Dio client) async {
    final session = _ref.read(sessionProvider);
    if (session == null || session.refreshToken == null) return null;
    try {
      final renewed = await AuthRemoteDataSource(client).refresh(session);
      // Signed out (or in again) while renewing: keep what is there now.
      if (_ref.read(sessionProvider) != session) return null;
      _ref.read(sessionProvider.notifier).renew(renewed);
      await _remember(renewed);
      return renewed.accessToken;
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      if (status == 401 || status == 403) {
        _ref.read(sessionProvider.notifier).expire();
      }
      return null;
    } on FormatException catch (error) {
      debugPrint('Unexpected refresh response: $error');
      return null;
    }
  }

  /// Updates the saved copy when the officer chose to be remembered.
  Future<void> _remember(AuthSession session) async {
    final local = _ref.read(authLocalDataSourceProvider);
    try {
      if (await local.readRememberSession()) await local.saveSession(session);
    } catch (error) {
      debugPrint('Could not update the saved session: $error');
    }
  }
}
