import 'package:flutter/foundation.dart';

import 'officer.dart';

/// An authenticated session returned by sign-in.
@immutable
class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.officer,
    this.refreshToken,
    this.expiresAt,
  });

  final String accessToken;
  final String? refreshToken;

  /// When the access token expires, if the server says.
  final DateTime? expiresAt;
  final Officer officer;

  bool isExpiredAt(DateTime now) =>
      expiresAt != null && !now.isBefore(expiresAt!);
}
