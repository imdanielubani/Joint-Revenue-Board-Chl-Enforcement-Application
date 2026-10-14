import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/core/constants/storage_keys.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_session.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/officer.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/session_provider.dart';
import 'package:jbr_chl_enforcement/shared/networking/dio_provider.dart';
import 'package:jbr_chl_enforcement/shared/storage/preferences_service.dart';
import 'package:jbr_chl_enforcement/shared/storage/secure_storage_service.dart';

import '../../../helpers/fake_api.dart';
import '../../../helpers/fakes.dart';

/// The access token lasts 30 minutes: an expired one is renewed with the
/// refresh token and the request repeated, without the officer noticing.
void main() {
  late FakeApi api;
  late ProviderContainer container;
  late Dio dio;
  late FakeSecureStorageService secureStorage;
  late FakePreferencesService preferences;

  final session = AuthSession(
    accessToken: 'old-access',
    refreshToken: 'old-refresh',
    expiresAt: DateTime.now().add(const Duration(hours: 20)),
    officer: const Officer(
      id: 'JRB-AG-0142',
      name: 'Demo Officer',
      email: 'officer@jbr.com',
    ),
  );

  /// The dashboard answers only the current token; refreshing gives
  /// "refresh-access-token".
  ApiAnswer server(RequestOptions request) {
    if (request.path == '/auth/refresh') return ApiAnswer.fixture('refresh');
    final token = request.headers['Authorization'];
    return token == 'Bearer refresh-access-token'
        ? ApiAnswer.fixture('dashboard')
        : ApiAnswer(401, fixture('unauthenticated'));
  }

  setUp(() {
    api = FakeApi(server);
    secureStorage = FakeSecureStorageService();
    preferences = FakePreferencesService();
    container = ProviderContainer(
      overrides: [
        secureStorageServiceProvider.overrideWithValue(secureStorage),
        preferencesServiceProvider.overrideWithValue(preferences),
      ],
    );
    dio = container.read(dioProvider)..httpClientAdapter = api;
    container.read(sessionProvider.notifier).start(session);
  });

  tearDown(() => container.dispose());

  test('sends the access token with each request', () async {
    api.answer = (_) => ApiAnswer.fixture('dashboard');
    await dio.get<void>('/dashboard');
    expect(api.requests.single.headers['Authorization'], 'Bearer old-access');
  });

  test('an expired token is renewed once and the request repeated', () async {
    final response = await dio.get<Map<String, dynamic>>('/dashboard');

    expect(response.data!['totals'], isNotNull);
    expect(api.calls, [
      'GET /dashboard',
      'POST /auth/refresh',
      'GET /dashboard',
    ]);
    expect(api.requests[1].data, {'refreshToken': 'old-refresh'});
    final current = container.read(sessionProvider)!;
    expect(current.accessToken, 'refresh-access-token');
    expect(current.refreshToken, 'refresh-refresh-token');
    expect(current.officer, same(session.officer));
  });

  test('requests at the same time share one renewal', () async {
    await Future.wait([
      dio.get<void>('/dashboard'),
      dio.get<void>('/dashboard'),
      dio.get<void>('/dashboard'),
    ]);
    expect(
      api.calls.where((call) => call == 'POST /auth/refresh'),
      hasLength(1),
    );
  });

  test('a remembered session is saved with its new tokens', () async {
    preferences.values[StorageKeys.rememberSession] = true;
    await dio.get<void>('/dashboard');
    expect(
      secureStorage.values[StorageKeys.authSession],
      contains('refresh-access-token'),
    );
  });

  test('when the server refuses the refresh, the session ends', () async {
    api.answer = (request) => request.path == '/auth/refresh'
        ? ApiAnswer(401, fixture('unauthenticated'))
        : ApiAnswer(401, fixture('unauthenticated'));

    await expectLater(
      dio.get<void>('/dashboard'),
      throwsA(isA<DioException>()),
    );
    expect(container.read(sessionProvider), isNull);
    expect(container.read(sessionEndProvider), SessionEndReason.expired);
  });

  test('a deactivated account (403 on refresh) ends the session too', () async {
    api.answer = (request) => request.path == '/auth/refresh'
        ? ApiAnswer(403, fixture('login_deactivated'))
        : ApiAnswer(401, fixture('unauthenticated'));
    await expectLater(
      dio.get<void>('/dashboard'),
      throwsA(isA<DioException>()),
    );
    expect(container.read(sessionProvider), isNull);
  });

  test('with no connection to renew, the officer stays signed in', () async {
    api.answer = (request) => request.path == '/auth/refresh'
        ? ApiAnswer.offline
        : ApiAnswer(401, fixture('unauthenticated'));
    await expectLater(
      dio.get<void>('/dashboard'),
      throwsA(isA<DioException>()),
    );
    expect(container.read(sessionProvider), same(session));
  });

  test('signed out: nothing is sent and nothing renewed', () async {
    container.read(sessionProvider.notifier).end();
    await expectLater(
      dio.get<void>('/dashboard'),
      throwsA(isA<DioException>()),
    );
    expect(api.calls, ['GET /dashboard']);
    expect(api.requests.single.headers.containsKey('Authorization'), isFalse);
  });
}
