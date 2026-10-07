import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Unread notifications, shown as a badge on the bell.
// TODO(notifications): read from the notifications store once it is built.
final unreadNotificationCountProvider = Provider<int>((ref) => 0);
