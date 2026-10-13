import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/environment/app_environment.dart';
import '../../../verification/domain/entities/verification_method.dart';
import '../../domain/entities/sync_queue_item.dart';
import '../../domain/repositories/sync_repository.dart';

/// The sync queue: two sample records in demo mode, otherwise the queue on
/// this phone.
final syncRepositoryProvider = Provider<SyncRepository>((ref) {
  if (!AppEnvironment.authDemoMode) return const LocalSyncRepository();
  final demo = DemoSyncRepository();
  ref.onDispose(demo.dispose);
  return demo;
});

/// The records saved on this phone.
// TODO(offline_sync): read the local queue and upload it to the CHL API
// (with an idempotency key per record) once both exist. Until then nothing
// is ever queued.
class LocalSyncRepository implements SyncRepository {
  const LocalSyncRepository();

  @override
  Stream<List<SyncQueueItem>> watchQueue() => Stream.value(const []);

  @override
  Future<void> synchronize() async {}
}

/// Two sample verification records (saved this morning) that CHL
/// acknowledges after a short wait, so the sync screens can be tried before
/// the backend exists.
class DemoSyncRepository implements SyncRepository {
  DemoSyncRepository({this.acknowledgementDelay = const Duration(seconds: 3)});

  final Duration acknowledgementDelay;
  final _changes = StreamController<List<SyncQueueItem>>.broadcast();

  late List<SyncQueueItem> _queue = () {
    final now = DateTime.now();
    final morning = DateTime(now.year, now.month, now.day, 9);
    return [
      SyncQueueItem(
        id: 'SYN-Q-001',
        plateNumber: 'FKJ803XY',
        method: VerificationMethod.manualPlate,
        savedAt: morning,
      ),
      SyncQueueItem(
        id: 'SYN-Q-002',
        plateNumber: 'AAA420AB',
        method: VerificationMethod.qrCode,
        savedAt: morning.add(const Duration(minutes: 25)),
      ),
    ];
  }();

  @override
  Stream<List<SyncQueueItem>> watchQueue() async* {
    yield _queue;
    yield* _changes.stream;
  }

  @override
  Future<void> synchronize() async {
    await Future<void>.delayed(acknowledgementDelay);
    _queue = const [];
    if (!_changes.isClosed) _changes.add(_queue);
  }

  void dispose() => _changes.close();
}
