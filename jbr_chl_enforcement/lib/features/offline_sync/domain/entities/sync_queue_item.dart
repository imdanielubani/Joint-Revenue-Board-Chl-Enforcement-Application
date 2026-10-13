import 'package:flutter/foundation.dart';

import '../../../verification/domain/entities/verification_method.dart';

/// A verification record saved on the phone, waiting to be synchronized.
@immutable
class SyncQueueItem {
  const SyncQueueItem({
    required this.id,
    required this.plateNumber,
    required this.method,
    required this.savedAt,
  });

  /// Queue reference, e.g. "SYN-Q-001".
  final String id;

  /// Canonical plate (letters and digits only), e.g. "FKJ803XY".
  final String plateNumber;

  final VerificationMethod method;
  final DateTime savedAt;

  @override
  bool operator ==(Object other) =>
      other is SyncQueueItem &&
      other.id == id &&
      other.plateNumber == plateNumber &&
      other.method == method &&
      other.savedAt == savedAt;

  @override
  int get hashCode => Object.hash(id, plateNumber, method, savedAt);
}
