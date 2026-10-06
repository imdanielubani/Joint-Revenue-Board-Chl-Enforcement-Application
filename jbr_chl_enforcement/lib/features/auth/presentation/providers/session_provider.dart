import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/entities/auth_session.dart';

final sessionProvider = NotifierProvider<SessionNotifier, AuthSession?>(
  SessionNotifier.new,
);

/// Why the last session ended, for the app to react to (e.g. show the
/// "session expired" sheet). Cleared once handled.
final sessionEndProvider =
    NotifierProvider<SessionEndNotifier, SessionEndReason?>(
      SessionEndNotifier.new,
    );

enum SessionEndReason { expired }

class SessionEndNotifier extends Notifier<SessionEndReason?> {
  @override
  SessionEndReason? build() => null;

  void report(SessionEndReason reason) => state = reason;

  void clear() => state = null;
}

/// The current officer's session, or null when signed out.
///
/// Ends the session by itself when its access token expires, and reports
/// [SessionEndReason.expired] through [sessionEndProvider].
class SessionNotifier extends Notifier<AuthSession?> {
  Timer? _expiryTimer;

  @override
  AuthSession? build() {
    ref.onDispose(_cancelTimer);
    return null;
  }

  void start(AuthSession session) {
    _cancelTimer();
    state = session;
    final expiresAt = session.expiresAt;
    if (expiresAt == null) return;
    final remaining = expiresAt.difference(DateTime.now());
    if (remaining <= Duration.zero) {
      expire();
    } else {
      _expiryTimer = Timer(remaining, expire);
    }
  }

  /// Ends the session without a notice (e.g. sign-out).
  void end() {
    _cancelTimer();
    state = null;
  }

  /// Ends the session because it is no longer valid, removes the saved
  /// copy, and reports it so the officer is told and sent to sign-in.
  void expire() {
    if (state == null) return;
    _cancelTimer();
    state = null;
    ref.read(authLocalDataSourceProvider).clearSession().catchError((
      Object error,
    ) {
      debugPrint('Could not clear the saved session: $error');
    });
    ref.read(sessionEndProvider.notifier).report(SessionEndReason.expired);
  }

  void _cancelTimer() {
    _expiryTimer?.cancel();
    _expiryTimer = null;
  }
}
