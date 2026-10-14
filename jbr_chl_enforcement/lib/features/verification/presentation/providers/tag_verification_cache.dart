import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/utils/clock.dart';
import '../../domain/entities/haulage_tag.dart';

/// The haulage tags verified in the last [TagVerificationCache.window], with
/// what verification found, so the same tag read again straight away is not
/// sent to CHL again. Kept for the life of the app.
final tagVerificationCacheProvider = Provider<TagVerificationCache>(
  (ref) => TagVerificationCache(now: ref.watch(clockProvider)),
);

class TagVerificationCache {
  TagVerificationCache({required this.now});

  final DateTime Function() now;

  /// How long a verified tag's outcome is reused.
  static const Duration window = Duration(seconds: 60);

  final Map<String, (Object, DateTime)> _recent = {};

  /// What verifying [tag] found in the last [window], if it was verified.
  Object? recent(HaulageTag tag) {
    final entry = _recent[tag.reference.trim().toUpperCase()];
    if (entry == null) return null;
    final (outcome, at) = entry;
    if (now().difference(at) > window) {
      _recent.remove(tag.reference.trim().toUpperCase());
      return null;
    }
    return outcome;
  }

  /// Keeps what verifying [tag] found. Only answers CHL gave are kept (a
  /// result or no such vehicle); a failure is always tried again.
  void remember(HaulageTag tag, Object outcome) =>
      _recent[tag.reference.trim().toUpperCase()] = (outcome, now());

  /// [remember]s [outcome] and returns it.
  T remembering<T extends Object>(HaulageTag tag, T outcome) {
    remember(tag, outcome);
    return outcome;
  }
}
