import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/navigation/main_shell_scaffold.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/clock.dart';
import '../../../../shared/ui/widgets/app_spinner.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../../shared/ui/widgets/screen_heading.dart';
import '../../domain/entities/app_notification.dart';
import '../providers/notifications_controller.dart';
import '../widgets/inbox_message.dart';
import '../widgets/notification_style.dart';

/// One notification in full. Opening it marks it as read. A verification
/// notification links to its verification record.
class NotificationDetailsScreen extends ConsumerStatefulWidget {
  const NotificationDetailsScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<NotificationDetailsScreen> createState() =>
      _NotificationDetailsScreenState();
}

class _NotificationDetailsScreenState
    extends ConsumerState<NotificationDetailsScreen> {
  static const double _maxContentWidth = 560;

  AppNotification? _find(List<AppNotification>? inbox) {
    if (inbox == null) return null;
    for (final notification in inbox) {
      if (notification.id == widget.id) return notification;
    }
    return null;
  }

  /// Set once the read receipt is sent, so a refused one is not resent in
  /// a loop (the notification shows as unread again instead).
  bool _markedRead = false;

  void _markReadIfUnread(List<AppNotification>? inbox) {
    if (_markedRead) return;
    final notification = _find(inbox);
    if (notification == null) return;
    _markedRead = true;
    if (!notification.isRead) {
      ref.read(notificationsProvider.notifier).markRead(notification.id);
    }
  }

  @override
  void initState() {
    super.initState();
    // After the first frame: providers cannot change while building.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _markReadIfUnread(ref.read(notificationsProvider).value);
    });
  }

  void _goBack() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.goNamed(RouteNames.notifications);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Opened before the inbox loaded (e.g. from a link): mark it once it has.
    ref.listen(
      notificationsProvider,
      (_, next) => _markReadIfUnread(next.value),
    );
    final inbox = ref.watch(notificationsProvider);
    final notification = _find(inbox.value);
    final now = ref.watch(clockProvider)();

    final Widget body;
    if (notification != null) {
      body = ListView(
        padding: EdgeInsets.fromLTRB(
          16,
          16,
          16,
          MainShellScaffold.sheetBottomInset(context),
        ),
        children: [
          const ScreenHeading(heading: 'Notification details'),
          const SizedBox(height: 16),
          _DetailsCard(notification: notification, now: now),
          if (notification.verificationRecordId != null) ...[
            const SizedBox(height: 35),
            InboxButton(
              label: 'View Verification Record',
              weight: AppTypography.medium,
              // TODO(verification_history): open the record itself once the
              // history has a record page.
              onPressed: () => context.goNamed(RouteNames.history),
            ),
          ],
        ],
      );
    } else if (inbox.isLoading) {
      body = const Center(
        child: AppSpinner(semanticLabel: 'Loading the notification'),
      );
    } else {
      body = const EmptyState(
        title: 'Notification unavailable',
        message: 'This notification is no longer in your inbox.',
      );
    }

    return GreenHeaderScaffold(
      title: 'Notification Details',
      onBack: _goBack,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: _maxContentWidth),
          child: body,
        ),
      ),
    );
  }
}

class _DetailsCard extends StatelessWidget {
  const _DetailsCard({required this.notification, required this.now});

  final AppNotification notification;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final type = notification.type;
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 22, 18, 22 + 16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.cardBorder, width: 1.5),
        borderRadius: const BorderRadius.all(Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: type.tint,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: SvgPicture.asset(
                type.largeIcon,
                width: 27.984,
                height: 27.984,
                excludeFromSemantics: true,
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            type.category,
            style: const TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 12,
              fontWeight: AppTypography.regular,
              letterSpacing: 0,
              height: 18.6 / 12,
              color: AppColors.sage,
            ),
          ),
          const SizedBox(height: 8),
          Semantics(
            header: true,
            child: Text(
              notification.title,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 21,
                fontWeight: AppTypography.bold,
                letterSpacing: -0.525,
                height: 1.4,
                color: AppColors.forest,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            notification.body,
            style: const TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 14,
              fontWeight: AppTypography.regular,
              letterSpacing: 0,
              height: 1.75,
              color: AppColors.mutedText,
            ),
          ),
          const SizedBox(height: 20),
          _DetailRow(
            label: 'Received',
            value: NotificationDates.received(notification.receivedAt, now),
            lineAbove: true,
          ),
          _DetailRow(
            label: 'Read status',
            value: notification.isRead ? 'Read' : 'Unread',
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.label,
    required this.value,
    this.lineAbove = false,
  });

  final String label;
  final String value;

  /// The first row has a line above and below it.
  final bool lineAbove;

  static const BorderSide _line = BorderSide(
    color: AppColors.cardBorder,
    width: 1.5,
  );

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: '$label: $value',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: lineAbove
            ? const BoxDecoration(
                border: Border(top: _line, bottom: _line),
              )
            : null,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 12,
                fontWeight: AppTypography.regular,
                letterSpacing: 0,
                height: 1.6,
                color: AppColors.moss,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                value,
                textAlign: TextAlign.end,
                style: const TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 12,
                  fontWeight: AppTypography.semiBold,
                  letterSpacing: 0,
                  height: 1.6,
                  color: AppColors.forest,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
