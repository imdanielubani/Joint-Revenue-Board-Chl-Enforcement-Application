import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Clock for "today" and "now"; overridden in tests.
final clockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

/// The time, once a second, for countdowns. Read [clockProvider] for the
/// first second; overridden in tests.
final secondTickerProvider = StreamProvider.autoDispose<DateTime>((ref) {
  final now = ref.watch(clockProvider);
  return Stream.periodic(const Duration(seconds: 1), (_) => now());
});
