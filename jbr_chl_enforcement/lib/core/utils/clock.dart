import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Clock for "today" and "now"; overridden in tests.
final clockProvider = Provider<DateTime Function()>((ref) => DateTime.now);
