import 'package:dio/dio.dart';

/// The signed-in officer's API tokens, as the networking layer needs them.
abstract interface class TokenManager {
  /// The access token to send, or null when signed out.
  String? get accessToken;

  /// Gets new tokens with the refresh token, sent with [client]. Returns
  /// the new access token, or null when the session could not be renewed
  /// (it has then ended if the server refused it). Concurrent calls share
  /// one renewal.
  Future<String?> renew(Dio client);
}
