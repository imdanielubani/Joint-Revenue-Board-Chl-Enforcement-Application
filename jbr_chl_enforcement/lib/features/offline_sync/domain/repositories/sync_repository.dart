import '../entities/sync_queue_item.dart';

/// The queue of records saved on the phone and their upload to CHL.
abstract interface class SyncRepository {
  /// The records waiting to be synchronized, oldest first: the current
  /// queue first, then every change.
  Stream<List<SyncQueueItem>> watchQueue();

  /// Sends every queued record and completes once CHL has acknowledged
  /// them, removing them from the queue. Throws when they were not
  /// acknowledged; they then stay queued. Sending the same records again
  /// must not create copies on the server.
  Future<void> synchronize();
}
