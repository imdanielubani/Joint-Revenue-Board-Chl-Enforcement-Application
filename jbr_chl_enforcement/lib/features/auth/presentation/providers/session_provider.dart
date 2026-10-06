import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/auth_session.dart';

final sessionProvider = NotifierProvider<SessionNotifier, AuthSession?>(
  SessionNotifier.new,
);

/// The current officer's session, or null when signed out.
class SessionNotifier extends Notifier<AuthSession?> {
  @override
  AuthSession? build() => null;

  void start(AuthSession session) => state = session;

  void end() => state = null;
}
