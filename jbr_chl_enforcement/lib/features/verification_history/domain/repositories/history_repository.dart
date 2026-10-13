import '../entities/verification_record.dart';

/// The officer's own verification records.
abstract interface class HistoryRepository {
  /// Every record, newest first. Throws when the history cannot be read;
  /// that is not the same as having no records.
  Future<List<VerificationRecord>> fetchHistory();
}
