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
/// day, for the last 30 days or all dates. Filters narrow them by method,
/// result and completion; each filter set shows as a chip that removes it.
/// While loading it shows a skeleton; then "No verifications yet" or
/// "History unavailable" (with Try again). Pull down to refresh.
class VerificationHistoryScreen extends ConsumerStatefulWidget {
  const VerificationHistoryScreen({super.key});

  static const String heading = 'Verification history';
  static const String description = 'Review your trip and E-Tag checks.';
  static const String loadingLabel = 'Loading your verification history…';

  /// "6 personal records · Last 30 days", or with filters set
  /// "1 matching record · All available dates".
  static String summary(
    int count,
    HistoryPeriod period, {
    bool filtered = false,
  }) {
    final kind = filtered ? 'matching' : 'personal';
    final records = count == 1 ? '1 $kind record' : '$count $kind records';
    return '$records · ${period.label}';
  }

  @override
  ConsumerState<VerificationHistoryScreen> createState() =>
      _VerificationHistoryScreenState();
}

class _VerificationHistoryScreenState
    extends ConsumerState<VerificationHistoryScreen> {
  static const double _maxContentWidth = 560;

  HistoryFilter _filter = HistoryFilter.none;

  Future<void> _openFilters(
    List<VerificationRecord> records,
    DateTime now,
  ) async {
    final chosen = await showHistoryFilterSheet(
      context,
      current: _filter,
      records: records,
      now: now,
    );
    if (chosen != null && mounted) setState(() => _filter = chosen);
  }

  void _clearFilters() => setState(() => _filter = _filter.cleared());

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
        if (_filter.matches(record, now)) record,
    ];
    final days = _groupByDay(shown, now);

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
                selected: _filter.period,
                onChanged: (period) =>
                    setState(() => _filter = _filter.withPeriod(period)),
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
                          _filter.period,
                          filtered: _filter.isActive,
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
                  _FiltersButton(
                    count: _filter.count,
                    onPressed: () => _openFilters(all, now),
                  ),
                ],
              ),
              if (_filter.isActive) ...[
                const SizedBox(height: 16),
                _AppliedFilters(
                  filter: _filter,
                  onChanged: (filter) => setState(() => _filter = filter),
                  onClearAll: _clearFilters,
                ),
              ],
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
      if (shown.isEmpty && _filter.isActive)
        // Just under the chips, as designed.
        SliverPadding(
          padding: EdgeInsets.fromLTRB(16, 13, 16, bottom),
          sliver: SliverToBoxAdapter(
            child: StateMessage(
              iconAsset: AssetPaths.iconHistoryNoMatch,
              title: 'No matching records',
              message:
                  'Try a different date range or remove a filter. Your '
                  'verification history has not been deleted.',
              messageColor: AppColors.ink,
              actionLabel: 'Adjust filters',
              actionWeight: AppTypography.medium,
              onAction: () => _openFilters(all, now),
              secondaryLabel: 'Clear all filters',
              onSecondary: _clearFilters,
              liveRegion: true,
            ),
          ),
        )
      else if (shown.isEmpty)
        _centered(
          bottom,
          alignment: -0.2,
          child: StateMessage(
            iconAsset: AssetPaths.iconHistoryEmpty,
            title: 'Nothing in the last 30 days',
            message: 'Your earlier records are in View All History.',
            messageColor: AppColors.ink,
            actionLabel: 'View All History',
            onAction: () =>
                setState(() => _filter = _filter.withPeriod(HistoryPeriod.all)),
          ),
        )
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

/// Outlined "Filters" button, with a green count when filters are set.
class _FiltersButton extends StatelessWidget {
  const _FiltersButton({required this.count, required this.onPressed});

  final int count;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.forest,
        side: BorderSide(
          color: AppColors.filterOutline,
          width: count == 0 ? 1.067 : 1.5,
        ),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(26)),
        ),
      ),
      child: Semantics(
        label: switch (count) {
          0 => 'Filter history',
          1 => 'Filter history, 1 active filter',
          _ => 'Filter history, $count active filters',
        },
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
            const Text(
              'Filters',
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 13,
                fontWeight: AppTypography.medium,
                letterSpacing: 0,
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 7),
              Container(
                constraints: const BoxConstraints(minWidth: 21, minHeight: 21),
                decoration: const BoxDecoration(
                  color: AppColors.green,
                  borderRadius: BorderRadius.all(Radius.circular(10.5)),
                ),
                alignment: Alignment.center,
                child: Text(
                  '$count',
                  style: const TextStyle(
                    fontFamily: AppTypography.fontFamily,
                    fontSize: 11,
                    fontWeight: AppTypography.medium,
                    letterSpacing: 0,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// One chip per filter set ("Receipt QR ×"), each removing its filter, and
/// "Clear all".
class _AppliedFilters extends StatelessWidget {
  const _AppliedFilters({
    required this.filter,
    required this.onChanged,
    required this.onClearAll,
  });

  final HistoryFilter filter;
  final ValueChanged<HistoryFilter> onChanged;
  final VoidCallback onClearAll;

  static const TextStyle _textStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 12,
    fontWeight: AppTypography.regular,
    letterSpacing: 0,
    height: 1.5,
    color: AppColors.forest,
  );

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        if (filter.method case final method?)
          _chip(
            'method',
            method.label,
            () => onChanged(filter.withMethod(null)),
          ),
        if (filter.result case final result?)
          _chip(
            'result',
            result.label,
            () => onChanged(filter.withResult(null)),
          ),
        if (filter.completion case final completion?)
          _chip(
            'completion',
            completion.label,
            () => onChanged(filter.withCompletion(null)),
          ),
        TextButton(
          onPressed: onClearAll,
          style: TextButton.styleFrom(
            minimumSize: const Size(0, 48),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            foregroundColor: AppColors.forest,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(24)),
            ),
          ),
          child: Text(
            'Clear all',
            style: _textStyle.copyWith(decoration: TextDecoration.underline),
          ),
        ),
      ],
    );
  }

  Widget _chip(String kind, String label, VoidCallback onRemove) {
    return Semantics(
      button: true,
      label: 'Remove $kind filter: $label',
      // Excluding the children drops their tap, so it is declared here.
      onTap: onRemove,
      excludeSemantics: true,
      child: Material(
        color: AppColors.surface,
        shape: const RoundedRectangleBorder(
          side: BorderSide(color: AppColors.filterOutline, width: 1.5),
          borderRadius: BorderRadius.all(Radius.circular(24)),
        ),
        child: InkWell(
          onTap: onRemove,
          customBorder: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(24)),
          ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Flexible(child: Text(label, style: _textStyle)),
                  const SizedBox(width: 7),
                  SvgPicture.asset(
                    AssetPaths.iconHistoryChipRemove,
                    width: 16,
                    height: 16,
                    excludeFromSemantics: true,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
