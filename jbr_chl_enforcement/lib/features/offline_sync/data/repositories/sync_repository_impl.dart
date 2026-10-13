import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/environment/app_environment.dart';
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
  Stream<int> watchPendingCount() => Stream.value(0);

  @override
  Future<void> synchronize() async {}
}

/// Two sample verification records that CHL acknowledges after a short
/// wait, so the sync screens can be tried before the backend exists.
class DemoSyncRepository implements SyncRepository {
  DemoSyncRepository({this.acknowledgementDelay = const Duration(seconds: 3)});

  final Duration acknowledgementDelay;
  int _pending = 2;
  final _changes = StreamController<int>.broadcast();

  @override
  Stream<int> watchPendingCount() async* {
    yield _pending;
    yield* _changes.stream;
  }

  @override
  Future<void> synchronize() async {
    await Future<void>.delayed(acknowledgementDelay);
    _pending = 0;
    if (!_changes.isClosed) _changes.add(_pending);
  }

  void dispose() => _changes.close();
}
