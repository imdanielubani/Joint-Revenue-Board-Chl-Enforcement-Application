import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/data/repositories/sync_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/domain/entities/sync_status.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/presentation/providers/sync_controller.dart';
import 'package:jbr_chl_enforcement/shared/device/connectivity/connectivity_adapter.dart';

import '../../../helpers/fakes.dart';

void main() {
  late FakeSyncRepository repository;
  late Completer<bool> firstReading;
  late ProviderContainer container;

  setUp(() {
    repository = FakeSyncRepository(2);
    firstReading = Completer<bool>();
    container = ProviderContainer(
      overrides: [
        syncRepositoryProvider.overrideWithValue(repository),
        // The connection is not known until the test says so.
        internetStatusProvider.overrideWith(
          (ref) => Stream.fromFuture(firstReading.future),
        ),
      ],
    );
    // Watched, as the sync card and the queue page do.
    container.listen(syncControllerProvider, (_, _) {});
  });

  tearDown(() {
    container.dispose();
    repository.dispose();
  });

  SyncPhase phase() => container.read(syncControllerProvider);

  test('waits for the first connection reading, then syncs', () async {
    final starting = container.read(syncControllerProvider.notifier).start();
    await pumpEventQueue();
    expect(repository.calls, isEmpty);
    expect(phase(), SyncPhase.idle);

    firstReading.complete(true);
    await pumpEventQueue();
    expect(repository.calls, hasLength(1));
    expect(phase(), SyncPhase.syncing);

    repository.acknowledge();
    await starting;
    expect(phase(), SyncPhase.acknowledged);
  });

  test('two taps while the connection is checked send once', () async {
    final controller = container.read(syncControllerProvider.notifier);
    unawaited(controller.start());
    unawaited(controller.start());

    firstReading.complete(true);
    await pumpEventQueue();

    expect(repository.calls, hasLength(1));
    repository.acknowledge();
    await pumpEventQueue();
  });

  test('offline at the first reading sends nothing', () async {
    final starting = container.read(syncControllerProvider.notifier).start();

    firstReading.complete(false);
    await starting;

    expect(repository.calls, isEmpty);
    expect(phase(), SyncPhase.idle);
  });

  test('a connection that cannot be read counts as offline', () async {
    final starting = container.read(syncControllerProvider.notifier).start();

    firstReading.completeError(StateError('no connectivity service'));
    await starting;

    expect(repository.calls, isEmpty);
    expect(phase(), SyncPhase.idle);
  });

  test('the queue count follows the repository', () async {
    final subscription = container.listen(pendingSyncCountProvider, (_, _) {});
    addTearDown(subscription.close);
    await pumpEventQueue();
    expect(container.read(pendingSyncCountProvider), 2);

    firstReading.complete(true);
    unawaited(container.read(syncControllerProvider.notifier).start());
    await pumpEventQueue();
    repository.acknowledge();
    await pumpEventQueue();

    expect(container.read(pendingSyncCountProvider), 0);
  });
}
