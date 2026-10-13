/// Where a synchronization of the saved records stands.
enum SyncPhase {
  /// Nothing running; records wait in the queue.
  idle,

  /// Records sent; waiting for CHL to acknowledge them.
  syncing,

  /// CHL acknowledged the records; they left the queue.
  acknowledged,

  /// No acknowledgement (failure, timeout, lost connection or the officer
  /// stopped waiting). The records are still queued.
  interrupted,
}
