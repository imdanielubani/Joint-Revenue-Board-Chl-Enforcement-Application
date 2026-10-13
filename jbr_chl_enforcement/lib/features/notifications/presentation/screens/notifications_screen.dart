import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/main_shell_scaffold.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/clock.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../../shared/ui/widgets/screen_heading.dart';
import '../../../settings/presentation/widgets/settings_section.dart';
import '../../domain/entities/app_notification.dart';
import '../providers/notifications_controller.dart';
import '../widgets/inbox_message.dart';
import '../widgets/notification_style.dart';
import '../widgets/notification_tile.dart';
import '../widgets/notifications_skeleton.dart';

/// Which notifications the inbox lists.
enum NotificationFilter { all, unread }

/// Notifications tab: the inbox grouped by day, with All / Unread and Mark
/// all as read. While loading it shows a skeleton; then "No notifications
/// yet", "Notifications unavailable" (with Try again) or, on Unread with
/// nothing unread, "You're all caught up". Pull down to refresh.
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  static const String heading = 'Notifications';
  static const String description = 'Stay informed while you’re in the field';

  /// "3 unread notifications" / "All notifications read".
  static String unreadSummary(int unread) => switch (unread) {
    0 => 'All notifications read',
    1 => '1 unread notification',
    _ => '$unread unread notifications',
  };

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  /// Widest the content grows on tablets.
  static const double _maxContentWidth = 560;

  NotificationFilter _filter = NotificationFilter.all;

  void _open(AppNotification notification) {
    ref.read(notificationsProvider.notifier).markRead(notification.id);
    context.pushNamed(
      RouteNames.notificationDetails,
      pathParameters: {'id': notification.id},
    );
  }

  @override
  Widget build(BuildContext context) {
    final inbox = ref.watch(notificationsProvider);
    final controller = ref.read(notificationsProvider.notifier);
    final now = ref.watch(clockProvider)();
    final bottom = MainShellScaffold.sheetBottomInset(context);

    final List<Widget> content;
    if (inbox.isLoading && !inbox.hasValue) {
      // First load, or Try again after a failed first load. A refresh keeps
      // the list on screen (and keeps it if the refresh fails).
      content = [
        SliverPadding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, bottom),
          sliver: const SliverToBoxAdapter(child: NotificationsSkeleton()),
        ),
      ];
    } else if (inbox.hasError && !inbox.hasValue) {
      content = [
        _centered(
          bottom,
          alignment: -0.263,
          child: InboxMessage(
            iconAsset: AssetPaths.iconNotificationsUnavailable,
            title: 'Notifications unavailable',
            message:
                'We couldn’t load your inbox. This request error does not '
                'mean there are no notifications.',
            actionLabel: 'Try again',
            onAction: controller.retry,
            liveRegion: true,
          ),
        ),
      ];
    } else {
      final all = inbox.value ?? const <AppNotification>[];
      content = all.isEmpty
          ? [
              _centered(
                bottom,
                alignment: -0.263,
                child: InboxMessage(
                  iconAsset: AssetPaths.iconNotificationsEmpty,
                  title: 'No notifications yet',
                  message:
                      'Operational and account updates will appear here '
                      'when you receive them.',
                  actionLabel: 'Back to dashboard',
                  onAction: () => context.goNamed(RouteNames.dashboard),
                ),
              ),
            ]
          : _inbox(all, now, bottom);
    }

    return GreenHeaderScaffold(
      title: 'Notification',
      onBack: () => context.goNamed(RouteNames.dashboard),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: _maxContentWidth),
          child: RefreshIndicator(
            color: AppColors.green,
            onRefresh: controller.retry,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                const SliverPadding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 0),
                  sliver: SliverToBoxAdapter(
                    child: ScreenHeading(
                      heading: NotificationsScreen.heading,
                      description: NotificationsScreen.description,
                    ),
                  ),
                ),
                ...content,
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _inbox(List<AppNotification> all, DateTime now, double bottom) {
    final unread = all.where((notification) => !notification.isRead).toList();
    final shown = _filter == NotificationFilter.all ? all : unread;
    final days = groupByDay(shown, now);

    return [
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              _FilterTabs(
                filter: _filter,
                unread: unread.length,
                onChanged: (filter) => setState(() => _filter = filter),
              ),
              const SizedBox(height: 16),
              _StatusRow(
                unread: unread.length,
                onMarkAllRead: unread.isEmpty
                    ? null
                    : ref.read(notificationsProvider.notifier).markAllRead,
              ),
            ],
          ),
        ),
      ),
      if (shown.isEmpty)
        _centered(
          bottom,
          alignment: -0.25,
          child: InboxMessage(
            iconAsset: AssetPaths.iconNotificationsCaughtUp,
            title: 'You’re all caught up',
            message:
                'No unread notifications. Your earlier updates are still '
                'available in All.',
            messageColor: AppColors.sage,
            actionLabel: 'View all notifications',
            onAction: () => setState(() => _filter = NotificationFilter.all),
          ),
        )
      else
        SliverPadding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, bottom),
          sliver: SliverList.separated(
            itemCount: days.length,
            separatorBuilder: (context, index) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              final (day, notifications) = days[index];
              return SettingsSection(
                title: day,
                children: [
                  for (final notification in notifications)
                    NotificationTile(
                      key: ValueKey(notification.id),
                      notification: notification,
                      onTap: () => _open(notification),
                    ),
                ],
              );
            },
          ),
        ),
    ];
  }

  /// [child] placed in the rest of the page, a little above the middle.
  Widget _centered(
    double bottom, {
    required double alignment,
    required Widget child,
  }) {
    return SliverFillRemaining(
      hasScrollBody: false,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 24, 16, bottom),
        child: Align(alignment: Alignment(0, alignment), child: child),
      ),
    );
  }
}

/// "All" / "Unread (3)" switch.
class _FilterTabs extends StatelessWidget {
  const _FilterTabs({
    required this.filter,
    required this.unread,
    required this.onChanged,
  });

  final NotificationFilter filter;
  final int unread;
  final ValueChanged<NotificationFilter> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: const BoxDecoration(
        color: AppColors.segmentTrack,
        borderRadius: BorderRadius.all(Radius.circular(32)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _FilterTab(
              label: 'All',
              selected: filter == NotificationFilter.all,
              onTap: () => onChanged(NotificationFilter.all),
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: _FilterTab(
              label: unread > 0 ? 'Unread ($unread)' : 'Unread',
              selected: filter == NotificationFilter.unread,
              onTap: () => onChanged(NotificationFilter.unread),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterTab extends StatelessWidget {
  const _FilterTab({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      // The tap is declared here: excluding the children drops theirs.
      onTap: onTap,
      excludeSemantics: true,
      child: Material(
        color: selected ? AppColors.green : Colors.transparent,
        borderRadius: const BorderRadius.all(Radius.circular(28)),
        child: InkWell(
          onTap: onTap,
          borderRadius: const BorderRadius.all(Radius.circular(28)),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              child: Center(
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: AppTypography.fontFamily,
                    fontSize: 12,
                    fontWeight: AppTypography.medium,
                    letterSpacing: 0,
                    color: selected ? Colors.white : AppColors.forest,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// "3 unread notifications" with Mark all as read.
class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.unread, required this.onMarkAllRead});

  final int unread;

  /// Null when nothing is unread, which greys the button out.
  final VoidCallback? onMarkAllRead;

  @override
  Widget build(BuildContext context) {
    final enabled = onMarkAllRead != null;
    return Row(
      children: [
        Expanded(
          child: Semantics(
            liveRegion: true,
            child: Text(
              NotificationsScreen.unreadSummary(unread),
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 12,
                fontWeight: AppTypography.regular,
                letterSpacing: 0,
                height: 1.5,
                color: AppColors.sage,
              ),
            ),
          ),
        ),
        Semantics(
          button: true,
          enabled: enabled,
          label: 'Mark all as read',
          onTap: onMarkAllRead,
          excludeSemantics: true,
          child: InkWell(
            onTap: onMarkAllRead,
            borderRadius: const BorderRadius.all(Radius.circular(8)),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 48),
              child: Padding(
                padding: const EdgeInsets.only(left: 8, top: 8, bottom: 8),
                child: Center(
                  widthFactor: 1,
                  child: Text(
                    'Mark all as read',
                    style: TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: 12,
                      fontWeight: enabled
                          ? AppTypography.semiBold
                          : AppTypography.regular,
                      letterSpacing: 0,
                      color: enabled ? AppColors.forest : AppColors.mutedText,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
