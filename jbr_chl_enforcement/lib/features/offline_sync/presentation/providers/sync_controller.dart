import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/device/connectivity/connectivity_adapter.dart';
import '../../data/repositories/sync_repository_impl.dart';
import '../../domain/entities/sync_queue_item.dart';
import '../../domain/entities/sync_status.dart';

/// The records waiting to sync, oldest first.
final syncQueueProvider = StreamProvider<List<SyncQueueItem>>(
  (ref) => ref.watch(syncRepositoryProvider).watchQueue(),
);

/// Number of saved records waiting to sync.
final pendingSyncCountProvider = Provider<int>(
  (ref) => ref.watch(syncQueueProvider).value?.length ?? 0,
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

  /// Set while the first connection reading is awaited.
  bool _starting = false;

  @override
  SyncPhase build() => SyncPhase.idle;

  /// Sends the queued records and waits for CHL to acknowledge them. Does
  /// nothing while a sync is running or without a connection. Call it while
  /// [syncControllerProvider] is watched (as the screens do): Riverpod
  /// pauses unwatched providers, and the first connection reading would
  /// never arrive.
  Future<void> start() async {
    if (state == SyncPhase.syncing || _starting) return;
    final bool online;
    _starting = true;
    try {
      online = await _isOnline();
    } finally {
      _starting = false;
    }
    if (!ref.mounted || state == SyncPhase.syncing) return;
    if (!online) {
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

  /// The current connection, waiting for the first reading if there is
  /// none yet.
  Future<bool> _isOnline() async {
    final known = ref.read(internetStatusProvider).value;
    if (known != null) return known;
    // A provider nobody listens to is paused, so listen while waiting.
    final subscription = ref.listen(internetStatusProvider, (_, _) {});
    try {
      return await ref.read(internetStatusProvider.future);
    } catch (error) {
      debugPrint('Could not read the connection: $error');
      return false;
    } finally {
      subscription.close();
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
