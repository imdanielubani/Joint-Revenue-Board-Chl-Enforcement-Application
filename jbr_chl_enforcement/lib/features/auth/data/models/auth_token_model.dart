import '../../domain/entities/auth_session.dart';
import 'officer_model.dart';

/// JSON mapping for [AuthSession].
///
/// The enforcement API's sign-in response:
///
/// ```json
/// {
///   "accessToken": "…",
///   "refreshToken": "…",
///   "accessTokenExpiresAt": "2026-10-14T09:00:00.000Z",
///   "sessionExpiresAt": "2026-10-15T08:30:00.000Z",
///   "agent": { "id": "JRB-AG-0142", "name": "…", "email": "…", "role": "…" }
/// }
/// ```
///
/// The session ends at `sessionExpiresAt`; the access token is renewed
/// with the refresh token before then. An `officer` object and an
/// `expiresIn` (seconds) are also accepted.
abstract final class AuthTokenModel {
  /// Parses a sign-in response. Throws [FormatException] if it is malformed.
  static AuthSession fromLoginResponse(
    Map<String, dynamic> json, {
    required DateTime receivedAt,
  }) {
    final accessToken = json['accessToken'];
    final agent = json['agent'];
    final officer = agent is Map<String, dynamic>
        ? {...agent, 'agentId': agent['agentId'] ?? agent['id']}
        : json['officer'];
    if (accessToken is! String || accessToken.isEmpty) {
      throw const FormatException('Missing accessToken');
    }
    if (officer is! Map<String, dynamic>) {
      throw const FormatException('Missing agent');
    }
    final expiresIn = json['expiresIn'];
    return AuthSession(
      accessToken: accessToken,
      refreshToken: json['refreshToken'] as String?,
      expiresAt:
          _date(json['sessionExpiresAt']) ??
          (expiresIn is num
              ? receivedAt.add(Duration(seconds: expiresIn.toInt()))
              : null),
      officer: OfficerModel.fromJson(officer),
    );
  }

  /// [current] with the new tokens of a refresh response
  /// (`{accessToken, refreshToken, sessionExpiresAt}`). Throws
  /// [FormatException] if it is malformed.
  static AuthSession renewed(AuthSession current, Map<String, dynamic> json) {
    final accessToken = json['accessToken'];
    final refreshToken = json['refreshToken'];
    if (accessToken is! String || accessToken.isEmpty) {
      throw const FormatException('Missing accessToken');
    }
    return AuthSession(
      accessToken: accessToken,
      refreshToken: refreshToken is String
          ? refreshToken
          : current.refreshToken,
      expiresAt: _date(json['sessionExpiresAt']) ?? current.expiresAt,
      officer: current.officer,
    );
  }

  static DateTime? _date(Object? value) =>
      value is String ? DateTime.tryParse(value) : null;

  /// Storage form, used to keep a remembered session.
  static Map<String, dynamic> toJson(AuthSession session) => {
    'accessToken': session.accessToken,
    'refreshToken': session.refreshToken,
    'expiresAt': session.expiresAt?.toUtc().toIso8601String(),
    'officer': OfficerModel.toJson(session.officer),
  };

  static AuthSession fromJson(Map<String, dynamic> json) {
    final expiresAt = json['expiresAt'] as String?;
    return AuthSession(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String?,
      expiresAt: expiresAt == null ? null : DateTime.parse(expiresAt),
      officer: OfficerModel.fromJson(json['officer'] as Map<String, dynamic>),
    );
  }
}
