import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Number of offline actions waiting to sync.
// TODO(offline_sync): read from the sync queue once it is built.
final pendingSyncCountProvider = Provider<int>((ref) => 0);

/// Whether the sync service can currently be reached.
// TODO(offline_sync): report the sync service's real state once it exists.
final syncAvailableProvider = Provider<bool>((ref) => true);
