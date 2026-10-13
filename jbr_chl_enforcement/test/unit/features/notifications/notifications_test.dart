import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/features/notifications/data/repositories/notifications_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/notifications/domain/entities/app_notification.dart';
import 'package:jbr_chl_enforcement/features/notifications/domain/entities/notification_type.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/providers/notifications_controller.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/widgets/notification_style.dart';

import '../../../helpers/fakes.dart';

final _now = DateTime(2026, 10, 13, 10);

AppNotification _notification(
  String id,
  DateTime receivedAt, {
  bool isRead = false,
  NotificationType type = NotificationType.connectionRestored,
}) => AppNotification(
  id: id,
  type: type,
  title: 'Title $id',
  summary: 'Summary',
  body: 'Body',
  receivedAt: receivedAt,
  isRead: isRead,
);

void main() {
  group('dates', () {
    test('today, yesterday, then the date', () {
      expect(NotificationDates.day(DateTime(2026, 10, 13, 1), _now), 'Today');
      expect(
        NotificationDates.day(DateTime(2026, 10, 12, 23), _now),
        'Yesterday',
      );
      expect(
        NotificationDates.day(DateTime(2026, 10, 10, 16), _now),
        '10 Oct 2026',
      );
      // Across a month boundary.
      expect(
        NotificationDates.day(DateTime(2026, 9, 30), DateTime(2026, 10, 1)),
        'Yesterday',
      );
    });

    test('received and the inbox line', () {
      expect(
        NotificationDates.received(DateTime(2026, 10, 13, 9, 40), _now),
        'Today · 09:40 AM',
      );
      expect(
        NotificationDates.received(DateTime(2026, 10, 10, 16, 15), _now),
        '10 Oct 2026 · 04:15 PM',
      );
      expect(
        NotificationDates.inboxLine(
          _notification(
            'a',
            DateTime(2026, 10, 13, 9, 32),
            type: NotificationType.locationAttention,
          ),
        ),
        'Device readiness · 09:32 AM · Unread',
      );
    });

    test('groups by day, keeping the order', () {
      final groups = groupByDay([
        _notification('a', DateTime(2026, 10, 13, 9)),
        _notification('b', DateTime(2026, 10, 13, 8)),
        _notification('c', DateTime(2026, 10, 10, 16)),
      ], _now);

      expect(groups.map((group) => group.$1), ['Today', '10 Oct 2026']);
      expect(groups.first.$2.map((n) => n.id), ['a', 'b']);
      expect(groups.last.$2.map((n) => n.id), ['c']);
    });
  });

  test('every type has a category, a tint and its icons', () {
    for (final type in NotificationType.values) {
      expect(type.category, isNotEmpty);
      expect(type.icon, startsWith('assets/icons/notifications/'));
      expect(type.largeIcon, startsWith('assets/icons/notifications/'));
    }
  });

  group('controller', () {
    late FakeNotificationsRepository repository;
    late ProviderContainer container;

    setUp(() {
      repository = FakeNotificationsRepository([
        _notification('old', DateTime(2026, 10, 10), isRead: true),
        _notification('new', DateTime(2026, 10, 13, 9)),
        _notification('mid', DateTime(2026, 10, 12)),
      ]);
      container = ProviderContainer(
        overrides: [
          notificationsRepositoryProvider.overrideWithValue(repository),
        ],
      );
      container.listen(notificationsProvider, (_, _) {});
    });

    tearDown(() => container.dispose());

    test('sorts newest first and counts the unread', () async {
      final inbox = await container.read(notificationsProvider.future);

      expect(inbox.map((n) => n.id), ['new', 'mid', 'old']);
      expect(container.read(unreadNotificationCountProvider), 2);
    });

    test('marks one and all as read', () async {
      await container.read(notificationsProvider.future);
      final controller = container.read(notificationsProvider.notifier);

      await controller.markRead('new');
      expect(container.read(unreadNotificationCountProvider), 1);
      expect(repository.markedRead, ['new']);

      // Already read: nothing is sent.
      await controller.markRead('new');
      expect(repository.markedRead, ['new']);

      await controller.markAllRead();
      expect(container.read(unreadNotificationCountProvider), 0);
      expect(repository.markAllCount, 1);
    });

    test('a first-load failure is an error, not an empty inbox', () async {
      final failing = FakeNotificationsRepository(repository.inbox)
        ..fetchError = StateError('down');
      final fresh = ProviderContainer(
        overrides: [notificationsRepositoryProvider.overrideWithValue(failing)],
      );
      addTearDown(fresh.dispose);
      fresh.listen(notificationsProvider, (_, _) {});

      await expectLater(
        fresh.read(notificationsProvider.future),
        throwsStateError,
      );
      expect(fresh.read(notificationsProvider).hasError, isTrue);
      expect(fresh.read(notificationsProvider).hasValue, isFalse);
      expect(fresh.read(unreadNotificationCountProvider), 0);

      failing.fetchError = null;
      await fresh.read(notificationsProvider.notifier).retry();
      expect(fresh.read(notificationsProvider).value, hasLength(3));
    });

    test('a failed refresh keeps the last inbox', () async {
      await container.read(notificationsProvider.future);

      repository.fetchError = StateError('down');
      await container.read(notificationsProvider.notifier).retry();

      expect(container.read(notificationsProvider).value, hasLength(3));
      expect(container.read(unreadNotificationCountProvider), 2);
    });

    test('does not retry by itself after a failure', () async {
      repository.fetchError = StateError('down');
      container.invalidate(notificationsProvider);
      await container
          .read(notificationsProvider.future)
          .catchError((Object _) => <AppNotification>[]);
      final attempts = repository.fetchCount;

      await Future<void>.delayed(const Duration(milliseconds: 300));
      expect(repository.fetchCount, attempts);
    });
  });

  group('demo inbox', () {
    test('seven samples, four unread, today and three days ago', () async {
      final demo = DemoNotificationsRepository(
        now: () => _now,
        delay: Duration.zero,
      );
      final inbox = await demo.fetchNotifications();

      expect(inbox, hasLength(7));
      expect(inbox.where((n) => !n.isRead), hasLength(4));
      expect(
        inbox.map((n) => NotificationDates.day(n.receivedAt, _now)).toSet(),
        {'Today', '10 Oct 2026'},
      );
      expect(
        inbox
            .singleWhere(
              (n) => n.type == NotificationType.incompleteVerification,
            )
            .verificationRecordId,
        isNotNull,
      );
    });

    test('remembers what was read', () async {
      final demo = DemoNotificationsRepository(
        now: () => _now,
        delay: Duration.zero,
      );
      final first = (await demo.fetchNotifications()).firstWhere(
        (n) => !n.isRead,
      );

      await demo.markRead(first.id);
      expect(
        (await demo.fetchNotifications())
            .singleWhere((n) => n.id == first.id)
            .isRead,
        isTrue,
      );

      await demo.markAllRead();
      expect((await demo.fetchNotifications()).every((n) => n.isRead), isTrue);
    });
  });

  test('without the API the inbox is empty', () async {
    expect(
      await const RemoteNotificationsRepository().fetchNotifications(),
      isEmpty,
    );
  });
}
