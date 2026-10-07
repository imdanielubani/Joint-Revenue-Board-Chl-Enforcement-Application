import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/navigation/main_shell_scaffold.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_gradients.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/device/connectivity/connectivity_adapter.dart';
import '../../../../shared/device/location/location_adapter.dart';
import '../../../../shared/device/rfid/rfid_reader_adapter.dart';
import '../../../auth/presentation/providers/session_provider.dart';
import '../../../notifications/presentation/providers/notifications_controller.dart';
import '../../../offline_sync/presentation/providers/sync_controller.dart';
import '../../domain/entities/dashboard_summary.dart';
import '../providers/dashboard_controller.dart';
import '../widgets/dashboard_header.dart';
import '../widgets/officer_card.dart';
import '../widgets/operational_status_row.dart';
import '../widgets/quick_action_grid.dart';
import '../widgets/recent_activity_list.dart';
import '../widgets/summary_stat_card.dart';

/// Home after sign-in: officer, quick actions, device status, today's
/// activity and recent verifications. Pull down to refresh.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  /// Widest the content grows on tablets.
  static const double _maxContentWidth = 560;

  static final DateFormat _dateFormat = DateFormat('EEE, d MMM y');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final officer = ref.watch(sessionProvider)?.officer;
    final summary = ref.watch(dashboardSummaryProvider);
    final today = ref.watch(clockProvider)();

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: AppColors.canvas,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: AppColors.canvas,
        body: DecoratedBox(
          decoration: const BoxDecoration(gradient: AppGradients.brandHeader),
          child: Column(
            children: [
              SafeArea(
                bottom: false,
                child: _Constrained(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8.5, 16, 16.5),
                    child: DashboardHeader(
                      unreadNotifications: ref.watch(
                        unreadNotificationCountProvider,
                      ),
                      onSos: () => context.pushNamed(RouteNames.sos),
                      onNotifications: () =>
                          context.goNamed(RouteNames.notifications),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: DecoratedBox(
                  decoration: const BoxDecoration(
                    color: AppColors.canvas,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(30),
                    ),
                  ),
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(30),
                    ),
                    child: RefreshIndicator(
                      color: AppColors.green,
                      onRefresh: () =>
                          ref.refresh(dashboardSummaryProvider.future),
                      child: ListView(
                        padding: EdgeInsets.only(
                          top: 14,
                          bottom: MainShellScaffold.contentBottomInset(context),
                        ),
                        children: [
                          _Constrained(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                              ),
                              child: _DashboardContent(
                                dateLabel: _dateFormat.format(today),
                                officerCard: OfficerCard(officer: officer),
                                statusRow: OperationalStatusRow(
                                  internetOnline:
                                      ref.watch(internetStatusProvider).value ??
                                      true,
                                  gpsReady:
                                      ref.watch(gpsStatusProvider).value ??
                                      false,
                                  rfidConnected: ref.watch(
                                    rfidReaderConnectedProvider,
                                  ),
                                  pendingSync: ref.watch(
                                    pendingSyncCountProvider,
                                  ),
                                ),
                                summary: summary,
                                onVerifyTrip: () =>
                                    context.pushNamed(RouteNames.verifyTrip),
                                onVerifyETag: () =>
                                    context.pushNamed(RouteNames.verifyETag),
                                onViewAll: () =>
                                    context.goNamed(RouteNames.history),
                                onRetry: () =>
                                    ref.invalidate(dashboardSummaryProvider),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DashboardContent extends StatelessWidget {
  const _DashboardContent({
    required this.dateLabel,
    required this.officerCard,
    required this.statusRow,
    required this.summary,
    required this.onVerifyTrip,
    required this.onVerifyETag,
    required this.onViewAll,
    required this.onRetry,
  });

  final String dateLabel;
  final Widget officerCard;
  final Widget statusRow;
  final AsyncValue<DashboardSummary> summary;
  final VoidCallback onVerifyTrip;
  final VoidCallback onVerifyETag;
  final VoidCallback onViewAll;
  final VoidCallback onRetry;

  static const TextStyle _sectionStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 16,
    fontWeight: AppTypography.semiBold,
    height: 23.4 / 18,
    letterSpacing: -0.27,
    color: AppColors.forest,
  );

  @override
  Widget build(BuildContext context) {
    final data = summary.value;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          dateLabel,
          style: const TextStyle(
            fontFamily: AppTypography.fontFamily,
            fontSize: 12,
            fontWeight: AppTypography.regular,
            height: 18 / 12,
            color: AppColors.ink,
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Semantics(
            header: true,
            child: const Text(
              'Dashboard',
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 20,
                fontWeight: AppTypography.bold,
                height: 25.96 / 22,
                letterSpacing: -0.77,
                color: AppColors.forest,
              ),
            ),
          ),
        ),
        const SizedBox(height: 11),
        officerCard,
        const SizedBox(height: 15),
        QuickActions(onVerifyTrip: onVerifyTrip, onVerifyETag: onVerifyETag),
        const SizedBox(height: 17),
        statusRow,
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: Semantics(
                header: true,
                child: const Text('Daily activity', style: _sectionStyle),
              ),
            ),
            const Text(
              'Today',
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 12,
                fontWeight: AppTypography.regular,
                color: AppColors.moss,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (summary.hasError && data == null)
          _LoadError(onRetry: onRetry)
        else
          DailyActivityGrid(summary: data ?? DashboardSummary.empty),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: Semantics(
                header: true,
                child: const Text('Recent verifications', style: _sectionStyle),
              ),
            ),
            TextButton(
              onPressed: onViewAll,
              style: TextButton.styleFrom(
                foregroundColor: AppColors.forestLink,
                minimumSize: const Size(48, 48),
                padding: const EdgeInsets.symmetric(vertical: 8),
                textStyle: const TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 12,
                  fontWeight: AppTypography.semiBold,
                ),
              ),
              child: const Text('View all'),
            ),
          ],
        ),
        RecentActivityList(records: data?.recentVerifications ?? const []),
      ],
    );
  }
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.cardBorder, width: 1.5),
        borderRadius: const BorderRadius.all(Radius.circular(14)),
      ),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              "Couldn't load today's activity.",
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 13,
                color: AppColors.moss,
              ),
            ),
          ),
          TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}

/// Centres content and caps its width on tablets.
class _Constrained extends StatelessWidget {
  const _Constrained({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          maxWidth: DashboardScreen._maxContentWidth,
        ),
        child: child,
      ),
    );
  }
}
