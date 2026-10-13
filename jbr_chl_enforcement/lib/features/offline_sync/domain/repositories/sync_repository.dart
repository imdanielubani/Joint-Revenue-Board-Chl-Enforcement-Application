/// The queue of records saved on the phone and their upload to CHL.
abstract interface class SyncRepository {
  /// How many records wait to be synchronized: the current number first,
  /// then every change.
  Stream<int> watchPendingCount();

  /// Sends every queued record and completes once CHL has acknowledged
  /// them, removing them from the queue. Throws when they were not
  /// acknowledged; they then stay queued. Sending the same records again
  /// must not create copies on the server.
  Future<void> synchronize();
}
