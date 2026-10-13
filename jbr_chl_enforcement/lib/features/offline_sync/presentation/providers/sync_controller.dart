import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/device/connectivity/connectivity_adapter.dart';
import '../../data/repositories/sync_repository_impl.dart';
import '../../domain/entities/sync_status.dart';

final _pendingCountProvider = StreamProvider<int>(
  (ref) => ref.watch(syncRepositoryProvider).watchPendingCount(),
);

/// Number of saved records waiting to sync.
final pendingSyncCountProvider = Provider<int>(
  (ref) => ref.watch(_pendingCountProvider).value ?? 0,
);

/// Whether the sync service can currently be reached.
// TODO(offline_sync): report the sync service's real state once it exists.
final syncAvailableProvider = Provider<bool>((ref) => true);

/// The current synchronization. Lives as long as the app, so a sync keeps
/// running when the offline sync card is closed.
final syncControllerProvider = NotifierProvider<SyncController, SyncPhase>(
  SyncController.new,
);

class SyncController extends Notifier<SyncPhase> {
  /// How long to wait for CHL to acknowledge before calling it interrupted.
  static const Duration acknowledgementTimeout = Duration(seconds: 60);

  /// Counts sync attempts, so the answer to one that was stopped is ignored.
  int _attempt = 0;

  @override
  SyncPhase build() => SyncPhase.idle;

  /// Sends the queued records and waits for CHL to acknowledge them. Does
  /// nothing while a sync is running or without a connection.
  Future<void> start() async {
    if (state == SyncPhase.syncing) return;
    if (ref.read(internetStatusProvider).value != true) {
      state = SyncPhase.idle;
      return;
    }
    final attempt = ++_attempt;
    state = SyncPhase.syncing;
    try {
      await ref
          .read(syncRepositoryProvider)
          .synchronize()
          .timeout(acknowledgementTimeout);
      if (ref.mounted && attempt == _attempt) state = SyncPhase.acknowledged;
    } catch (error) {
      debugPrint('Synchronization was not acknowledged: $error');
      if (ref.mounted && attempt == _attempt) state = SyncPhase.interrupted;
    }
  }

  /// Gives up waiting for the acknowledgement. The records stay queued, and
  /// retrying is safe: the server does not create copies.
  void stopWaiting() {
    if (state != SyncPhase.syncing) return;
    _attempt++;
    state = SyncPhase.interrupted;
  }

  /// Forgets a finished sync, so the card opens on the overview next time.
  /// An interruption is kept until the officer retries.
  void clearAcknowledged() {
    if (state == SyncPhase.acknowledged) state = SyncPhase.idle;
  }
}
