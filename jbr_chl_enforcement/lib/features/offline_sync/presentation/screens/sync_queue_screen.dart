import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/extensions/context_extensions.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/device/connectivity/connectivity_adapter.dart';
import '../../../../shared/ui/widgets/app_spinner.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../../shared/ui/widgets/header_icon_button.dart';
import '../../../../shared/ui/widgets/screen_heading.dart';
import '../../../notifications/presentation/providers/notifications_controller.dart';
import '../../domain/entities/sync_queue_item.dart';
import '../../domain/entities/sync_status.dart';
import '../providers/sync_controller.dart';
import '../widgets/offline_sync_sheet.dart';
import '../widgets/sync_queue_item_tile.dart';

/// Sync queue: the records saved on the phone that wait for CHL's
/// acknowledgement, with Sync now; or "Nothing waiting to sync".
class SyncQueueScreen extends ConsumerWidget {
  const SyncQueueScreen({super.key});

  static const double _maxContentWidth = 560;

  static const String heading = 'Sync queue';
  static const String description =
      'Review locally saved records awaiting acknowledgement.';

  /// The line above the list, e.g. "2 verification records · Awaiting
  /// synchronization".
  static String summary(int count, {required bool syncing}) {
    final records = count == 1
        ? '1 verification record'
        : '$count verification records';
    return '$records · ${syncing ? 'Synchronizing' : 'Awaiting synchronization'}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final queue = ref.watch(syncQueueProvider);
    final unread = ref.watch(unreadNotificationCountProvider);

    return GreenHeaderScaffold(
      title: 'My Preferences',
      onBack: context.popOrGoHome,
      trailing: HeaderIconButton(
        iconAsset: AssetPaths.iconBell,
        semanticLabel: unread > 0
            ? 'Notifications, $unread unread'
            : 'Notifications',
        badgeCount: unread,
        onPressed: () => context.goNamed(RouteNames.notifications),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: _maxContentWidth),
          child: switch (queue) {
            AsyncValue(value: final items?) when items.isEmpty =>
              const _EmptyQueue(),
            AsyncValue(value: final items?) => _QueueList(items: items),
            AsyncValue(hasError: true) => const EmptyState(
              title: 'Sync queue unavailable',
              message: 'The saved records could not be read. Try again.',
            ),
            _ => const Center(
              child: AppSpinner(semanticLabel: 'Loading the sync queue'),
            ),
          },
        ),
      ),
    );
  }
}

class _QueueList extends ConsumerWidget {
  const _QueueList({required this.items});

  final List<SyncQueueItem> items;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncing = ref.watch(syncControllerProvider) == SyncPhase.syncing;
    // Read early so Sync now knows the connection straight away.
    ref.watch(internetStatusProvider);
    // The sheet ends above the system inset, so read the phone's own.
    final systemInset = MediaQueryData.fromView(View.of(context))
        .viewPadding
        .bottom;

    void syncNow() {
      // Starts the sync (or shows "No internet connection") and opens the
      // card to follow it; a running sync is just shown.
      unawaited(ref.read(syncControllerProvider.notifier).start());
      unawaited(showOfflineSyncSheet(context, fromQueue: true));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
            children: [
              const ScreenHeading(
                heading: SyncQueueScreen.heading,
                description: SyncQueueScreen.description,
              ),
              const SizedBox(height: 24),
              Text(
                SyncQueueScreen.summary(items.length, syncing: syncing),
                style: const TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 12,
                  fontWeight: AppTypography.regular,
                  letterSpacing: 0,
                  height: 1.5,
                  color: AppColors.sage,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: AppColors.cardBorder, width: 1.5),
                  borderRadius: const BorderRadius.all(Radius.circular(20)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = 0; i < items.length; i++)
                      // A Container gives the line its own 1.5 px.
                      Container(
                        decoration: i == 0
                            ? null
                            : const BoxDecoration(
                                border: Border(
                                  top: BorderSide(
                                    color: AppColors.cardBorder,
                                    width: 1.5,
                                  ),
                                ),
                              ),
                        child: SyncQueueItemTile(item: items[i]),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Records stay queued until CHL acknowledges them. A failed '
                'or interrupted attempt does not delete saved work.',
                style: TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 12,
                  fontWeight: AppTypography.regular,
                  letterSpacing: 0,
                  height: 1.7,
                  color: AppColors.signOutBody,
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, systemInset > 0 ? 0 : 16),
          child: _QueueButton(label: 'Sync now', onPressed: syncNow),
        ),
      ],
    );
  }
}

/// "Nothing waiting to sync", a little above the middle of the page.
class _EmptyQueue extends StatelessWidget {
  const _EmptyQueue();

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        const SliverPadding(
          padding: EdgeInsets.fromLTRB(16, 16, 16, 0),
          sliver: SliverToBoxAdapter(
            child: ScreenHeading(
              heading: SyncQueueScreen.heading,
              description: SyncQueueScreen.description,
            ),
          ),
        ),
        SliverFillRemaining(
          hasScrollBody: false,
          child: Align(
            // The icon 151 px below the heading on a 390 × 844 phone, as
            // designed, and proportionally elsewhere.
            alignment: const Alignment(0, -0.27),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(30, 24, 30, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: const BoxDecoration(
                        color: AppColors.greenTint,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: SvgPicture.asset(
                        AssetPaths.iconQueueEmpty,
                        width: 30,
                        height: 30,
                        excludeFromSemantics: true,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Semantics(
                    header: true,
                    child: const Text(
                      'Nothing waiting to sync',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: AppTypography.fontFamily,
                        fontSize: 21,
                        fontWeight: AppTypography.bold,
                        letterSpacing: -0.315,
                        height: 1.3,
                        color: AppColors.forest,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'No records are awaiting acknowledgement.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: 14,
                      fontWeight: AppTypography.regular,
                      letterSpacing: 0,
                      height: 1.6,
                      color: AppColors.signOutBody,
                    ),
                  ),
                  const SizedBox(height: 24),
                  _QueueButton(
                    label: 'Back to settings',
                    bold: true,
                    onPressed: context.popOrGoHome,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// 52 px green pill with a 15 px label.
class _QueueButton extends StatelessWidget {
  const _QueueButton({
    required this.label,
    required this.onPressed,
    this.bold = false,
  });

  final String label;
  final VoidCallback onPressed;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        backgroundColor: AppColors.green,
        foregroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(30)),
        ),
        textStyle: TextStyle(
          fontFamily: AppTypography.fontFamily,
          fontSize: 15,
          fontWeight: bold ? AppTypography.bold : AppTypography.semiBold,
          letterSpacing: 0,
          height: 20.25 / 15,
        ),
      ),
      child: Text(label, textAlign: TextAlign.center),
    );
  }
}
