import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/main_shell_scaffold.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/clock.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../shared/ui/widgets/card_list_skeleton.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../../shared/ui/widgets/screen_heading.dart';
import '../../../../shared/ui/widgets/segmented_switch.dart';
import '../../../../shared/ui/widgets/state_message.dart';
import '../../../settings/presentation/widgets/settings_section.dart';
import '../../domain/entities/history_filter.dart';
import '../../domain/entities/verification_record.dart';
import '../providers/history_controller.dart';
import '../widgets/history_filter_sheet.dart';
import '../widgets/history_record_tile.dart';

/// History tab ("My Activity"): the officer's own verifications, grouped by
/// day, for the last 30 days or all dates, with Filters. While loading it
/// shows a skeleton; then "No verifications yet" or "History unavailable"
/// (with Try again). Pull down to refresh.
class VerificationHistoryScreen extends ConsumerStatefulWidget {
  const VerificationHistoryScreen({super.key});

  static const String heading = 'Verification history';
  static const String description = 'Review your trip and E-Tag checks.';
  static const String loadingLabel = 'Loading your verification history…';

  /// "6 personal records · Last 30 days".
  static String summary(int count, HistoryPeriod period) {
    final records = count == 1
        ? '1 personal record'
        : '$count personal records';
    final dates = period == HistoryPeriod.last30Days
        ? 'Last 30 days'
        : 'All available dates';
    return '$records · $dates';
  }

  @override
  ConsumerState<VerificationHistoryScreen> createState() =>
      _VerificationHistoryScreenState();
}

class _VerificationHistoryScreenState
    extends ConsumerState<VerificationHistoryScreen> {
  static const double _maxContentWidth = 560;

  HistoryPeriod _period = HistoryPeriod.last30Days;
  HistoryFilter _filter = HistoryFilter.none;

  Future<void> _openFilters() async {
    final chosen = await showHistoryFilterSheet(context, _filter);
    if (chosen != null && mounted) setState(() => _filter = chosen);
  }

  void _open(VerificationRecord record) => context.pushNamed(
    RouteNames.historyRecord,
    pathParameters: {'id': record.id},
  );

  @override
  Widget build(BuildContext context) {
    final history = ref.watch(historyProvider);
    final controller = ref.read(historyProvider.notifier);
    final now = ref.watch(clockProvider)();
    final bottom = MainShellScaffold.sheetBottomInset(context);

    final List<Widget> content;
    if (history.isLoading && !history.hasValue) {
      // First load, or Try again after a failed first load. A refresh keeps
      // the list on screen (and keeps it if the refresh fails).
      content = [
        SliverPadding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, bottom),
          sliver: const SliverToBoxAdapter(
            child: CardListSkeleton(
              label: VerificationHistoryScreen.loadingLabel,
            ),
          ),
        ),
      ];
    } else if (history.hasError && !history.hasValue) {
      content = [
        _centered(
          bottom,
          alignment: -0.186,
          child: StateMessage(
            iconAsset: AssetPaths.iconNotificationsUnavailable,
            title: 'History unavailable',
            message:
                'We couldn’t load your personal records. This is a history '
                'request error, not a vehicle compliance result.',
            messageColor: AppColors.ink,
            actionLabel: 'Try again',
            actionWeight: AppTypography.bold,
            onAction: controller.retry,
            liveRegion: true,
          ),
        ),
      ];
    } else {
      final all = history.value ?? const <VerificationRecord>[];
      content = all.isEmpty
          ? [
              _centered(
                bottom,
                alignment: -0.21,
                child: const StateMessage(
                  iconAsset: AssetPaths.iconHistoryEmpty,
                  title: 'No verifications yet',
                  message:
                      'Your plate, receipt QR and E-Tag checks will appear '
                      'here after verification.',
                  messageColor: AppColors.ink,
                ),
              ),
            ]
          : _records(all, now, bottom);
    }

    return GreenHeaderScaffold(
      title: 'My Activity',
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
                      heading: VerificationHistoryScreen.heading,
                      description: VerificationHistoryScreen.description,
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

  List<Widget> _records(
    List<VerificationRecord> all,
    DateTime now,
    double bottom,
  ) {
    final shown = [
      for (final record in all)
        if (inPeriod(record, _period, now) && _filter.matches(record)) record,
    ];
    final days = _groupByDay(shown, now);

    final Widget nothingShown;
    if (_filter.isActive) {
      nothingShown = StateMessage(
        iconAsset: AssetPaths.iconHistoryEmpty,
        title: 'No matching records',
        message: 'No records match these filters.',
        messageColor: AppColors.ink,
        actionLabel: 'Clear filters',
        onAction: () => setState(() => _filter = HistoryFilter.none),
      );
    } else {
      nothingShown = StateMessage(
        iconAsset: AssetPaths.iconHistoryEmpty,
        title: 'Nothing in the last 30 days',
        message: 'Your earlier records are in View All History.',
        messageColor: AppColors.ink,
        actionLabel: 'View All History',
        onAction: () => setState(() => _period = HistoryPeriod.all),
      );
    }

    return [
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              SegmentedSwitch<HistoryPeriod>(
                options: const [
                  (HistoryPeriod.last30Days, 'Last 30 days'),
                  (HistoryPeriod.all, 'View All History'),
                ],
                selected: _period,
                onChanged: (period) => setState(() => _period = period),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Semantics(
                      liveRegion: true,
                      child: Text(
                        VerificationHistoryScreen.summary(
                          shown.length,
                          _period,
                        ),
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
                  const SizedBox(width: 10),
                  _FiltersButton(count: _filter.count, onPressed: _openFilters),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
      if (shown.isEmpty)
        _centered(bottom, alignment: -0.2, child: nothingShown)
      else
        SliverPadding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, bottom),
          sliver: SliverList.separated(
            itemCount: days.length,
            separatorBuilder: (context, index) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              final (day, records) = days[index];
              return SettingsSection(
                title: day,
                children: [
                  for (final record in records)
                    HistoryRecordTile(
                      key: ValueKey(record.id),
                      record: record,
                      day: day,
                      onTap: () => _open(record),
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

  static List<(String, List<VerificationRecord>)> _groupByDay(
    List<VerificationRecord> records,
    DateTime now,
  ) {
    final groups = <(String, List<VerificationRecord>)>[];
    for (final record in records) {
      final label = DateFormatter.day(record.recordedAt, now);
      if (groups.isNotEmpty && groups.last.$1 == label) {
        groups.last.$2.add(record);
      } else {
        groups.add((label, [record]));
      }
    }
    return groups;
  }
}

/// Outlined "Filters" button; shows how many filters are set.
class _FiltersButton extends StatelessWidget {
  const _FiltersButton({required this.count, required this.onPressed});

  final int count;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final label = count == 0 ? 'Filters' : 'Filters ($count)';
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.forest,
        side: const BorderSide(color: AppColors.filterOutline, width: 1.067),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(26)),
        ),
      ),
      child: Semantics(
        label: count == 0 ? 'Filter history' : 'Filter history, $count set',
        excludeSemantics: true,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SvgPicture.asset(
              AssetPaths.iconHistoryFilter,
              width: 18,
              height: 18,
              excludeFromSemantics: true,
            ),
            const SizedBox(width: 7),
            Text(
              label,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 13,
                fontWeight: AppTypography.medium,
                letterSpacing: 0,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
