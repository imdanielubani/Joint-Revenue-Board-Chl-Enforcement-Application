import '../../domain/entities/auth_session.dart';
import 'officer_model.dart';

/// JSON mapping for [AuthSession].
///
/// Expected sign-in response (adjust here if the API differs):
///
/// ```json
/// {
///   "accessToken": "…",
///   "refreshToken": "…",          // optional
///   "expiresIn": 3600,            // optional, seconds
///   "officer": { "id": "…", "name": "…", "email": "…" }
/// }
/// ```
abstract final class AuthTokenModel {
  /// Parses a sign-in response. Throws [FormatException] if it is malformed.
  static AuthSession fromLoginResponse(
    Map<String, dynamic> json, {
    required DateTime receivedAt,
  }) {
    final accessToken = json['accessToken'];
    final officer = json['officer'];
    if (accessToken is! String || accessToken.isEmpty) {
      throw const FormatException('Missing accessToken');
    }
    if (officer is! Map<String, dynamic>) {
      throw const FormatException('Missing officer');
    }
    final expiresIn = json['expiresIn'];
    return AuthSession(
      accessToken: accessToken,
      refreshToken: json['refreshToken'] as String?,
      expiresAt: expiresIn is num
          ? receivedAt.add(Duration(seconds: expiresIn.toInt()))
          : null,
      officer: OfficerModel.fromJson(officer),
    );
  }

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
