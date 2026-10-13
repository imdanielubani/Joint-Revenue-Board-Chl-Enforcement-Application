import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/history_repository_impl.dart';
import '../../domain/entities/verification_record.dart';

/// The officer's records, newest first. Loading shows the skeleton; an
/// error shows "History unavailable" until [HistoryController.retry].
final historyProvider =
    AsyncNotifierProvider<HistoryController, List<VerificationRecord>>(
      HistoryController.new,
      // No automatic retries: the officer retries with "Try again".
      retry: (_, _) => null,
    );

class HistoryController extends AsyncNotifier<List<VerificationRecord>> {
  @override
  Future<List<VerificationRecord>> build() async {
    final records = await ref.watch(historyRepositoryProvider).fetchHistory();
    return [...records]..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
  }

  /// Loads the history again ("Try again", or pull to refresh).
  Future<void> retry() async {
    ref.invalidateSelf();
    await future.catchError((Object _) => const <VerificationRecord>[]);
  }
}
