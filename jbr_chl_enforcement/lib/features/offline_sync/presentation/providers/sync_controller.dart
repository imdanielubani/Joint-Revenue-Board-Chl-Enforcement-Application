import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Number of offline actions waiting to sync.
// TODO(offline_sync): read from the sync queue once it is built.
final pendingSyncCountProvider = Provider<int>((ref) => 0);
