import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/core/constants/storage_keys.dart';
import 'package:jbr_chl_enforcement/features/auth/data/datasources/auth_local_data_source.dart';
import 'package:jbr_chl_enforcement/features/auth/data/datasources/auth_remote_data_source.dart';
import 'package:jbr_chl_enforcement/features/auth/data/models/auth_token_model.dart';
import 'package:jbr_chl_enforcement/features/auth/data/models/login_request_model.dart';
import 'package:jbr_chl_enforcement/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_failure.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_session.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/officer.dart';

import '../../../helpers/fakes.dart';

class _FakeRemote implements AuthRemoteDataSource {
  Object? error;
  LoginRequestModel? lastRequest;

  static const session = AuthSession(
    accessToken: 'token',
    officer: Officer(id: '1', name: 'Ada', email: 'ada@jbr.com'),
  );

  @override
  Future<AuthSession> login(LoginRequestModel request) async {
    lastRequest = request;
    final error = this.error;
    if (error != null) throw error;
    return session;
  }
}

DioException _dioError(DioExceptionType type, {int? status}) {
  final options = RequestOptions(path: '/auth/login');
  return DioException(
    requestOptions: options,
    type: type,
    response: status == null
        ? null
        : Response<void>(requestOptions: options, statusCode: status),
  );
}

void main() {
  late _FakeRemote remote;
  late FakeSecureStorageService secureStorage;
  late FakePreferencesService preferences;

  AuthRepositoryImpl repository({bool configured = true}) => AuthRepositoryImpl(
    remote,
    AuthLocalDataSource(secureStorage, preferences),
    configured,
  );

  Future<AuthSession> signIn(
    AuthRepositoryImpl repo, {
    bool remember = false,
  }) => repo.signIn(
    email: 'ada@jbr.com',
    password: 'secret',
    rememberSession: remember,
  );

  Matcher failsWith(AuthFailure failure) => throwsA(
    isA<AuthException>().having((e) => e.failure, 'failure', failure),
  );

  setUp(() {
    remote = _FakeRemote();
    secureStorage = FakeSecureStorageService();
    preferences = FakePreferencesService();
  });

  test('sends the credentials and returns the session', () async {
    final session = await signIn(repository());

    expect(remote.lastRequest?.toJson(), {
      'email': 'ada@jbr.com',
      'password': 'secret',
    });
    expect(session, same(_FakeRemote.session));
  });

  test('fails as not configured without an API address', () async {
    await expectLater(
      signIn(repository(configured: false)),
      failsWith(AuthFailure.notConfigured),
    );
    expect(remote.lastRequest, isNull);
  });

  group('maps errors', () {
    for (final (error, failure) in [
      (
        _dioError(DioExceptionType.badResponse, status: 401),
        AuthFailure.invalidCredentials,
      ),
      (
        _dioError(DioExceptionType.badResponse, status: 400),
        AuthFailure.invalidCredentials,
      ),
      (
        _dioError(DioExceptionType.badResponse, status: 422),
        AuthFailure.invalidCredentials,
      ),
      (
        _dioError(DioExceptionType.badResponse, status: 500),
        AuthFailure.server,
      ),
      (_dioError(DioExceptionType.connectionTimeout), AuthFailure.network),
      (_dioError(DioExceptionType.connectionError), AuthFailure.network),
      (_dioError(DioExceptionType.receiveTimeout), AuthFailure.network),
      (_dioError(DioExceptionType.unknown), AuthFailure.server),
      (const FormatException('bad body'), AuthFailure.server),
    ]) {
      test('$error -> ${failure.name}', () async {
        remote.error = error;
        await expectLater(signIn(repository()), failsWith(failure));
      });
    }
  });

  group('session storage', () {
    test('keeps the session when remembered', () async {
      await signIn(repository(), remember: true);

      expect(secureStorage.values[StorageKeys.authSession], isNotNull);
      expect(preferences.values[StorageKeys.rememberSession], isTrue);
      final restored = await AuthLocalDataSource(
        secureStorage,
        preferences,
      ).readSession();
      expect(restored?.accessToken, 'token');
      expect(restored?.officer, _FakeRemote.session.officer);
    });

    test('removes any saved session when not remembered', () async {
      secureStorage.values[StorageKeys.authSession] = 'old';

      await signIn(repository());

      expect(secureStorage.values.containsKey(StorageKeys.authSession), false);
      expect(preferences.values[StorageKeys.rememberSession], isFalse);
    });

    test('does not store anything when sign-in fails', () async {
      remote.error = _dioError(DioExceptionType.badResponse, status: 401);

      await expectLater(
        signIn(repository(), remember: true),
        throwsA(anything),
      );

      expect(secureStorage.values, isEmpty);
    });
  });

  group('AuthTokenModel', () {
    final receivedAt = DateTime.utc(2026, 1, 1, 12);

    test('parses a full sign-in response', () {
      final session = AuthTokenModel.fromLoginResponse({
        'accessToken': 'a',
        'refreshToken': 'r',
        'expiresIn': 3600,
        'officer': {'id': 7, 'name': 'Ada', 'email': 'ada@jbr.com'},
      }, receivedAt: receivedAt);

      expect(session.accessToken, 'a');
      expect(session.refreshToken, 'r');
      expect(session.expiresAt, receivedAt.add(const Duration(hours: 1)));
      expect(session.officer.id, '7');
    });

    test('rejects a response without an access token', () {
      expect(
        () => AuthTokenModel.fromLoginResponse({
          'officer': {'id': '1'},
        }, receivedAt: receivedAt),
        throwsFormatException,
      );
    });

    test('round-trips through storage form', () {
      final session = AuthSession(
        accessToken: 'a',
        refreshToken: 'r',
        expiresAt: receivedAt,
        officer: const Officer(id: '1', name: 'Ada', email: 'ada@jbr.com'),
      );

      final restored = AuthTokenModel.fromJson(AuthTokenModel.toJson(session));

      expect(restored.accessToken, 'a');
      expect(restored.refreshToken, 'r');
      expect(restored.expiresAt, receivedAt);
      expect(restored.officer, session.officer);
    });
  });
}
