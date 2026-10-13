import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/sheets/app_bottom_sheet.dart';
import '../../../../shared/ui/widgets/state_message.dart';
import '../../domain/entities/history_filter.dart';
import '../../domain/entities/verification_record.dart';

/// Opens Filter history over [records]. Resolves to the confirmed filter,
/// or null when it was closed without confirming.
Future<HistoryFilter?> showHistoryFilterSheet(
  BuildContext context, {
  required HistoryFilter current,
  required List<VerificationRecord> records,
  required DateTime now,
}) {
  return showAppSheet<HistoryFilter>(
    context: context,
    // Over the whole screen, navigation bar included.
    useRootNavigator: true,
    builder: (context) =>
        HistoryFilterSheet(initial: current, records: records, now: now),
  );
}

/// "Filter history": date range, verification method, verification result
/// and completion status. Choices apply only on Show; while any filter is
/// set it says how many records match ("1 matching record", "Show 1
/// record"). Reset goes back to the last 30 days with no filters.
class HistoryFilterSheet extends StatefulWidget {
  const HistoryFilterSheet({
    super.key,
    required this.initial,
    required this.records,
    required this.now,
  });

  final HistoryFilter initial;
  final List<VerificationRecord> records;
  final DateTime now;

  /// "1 matching record", "3 matching records".
  static String matching(int count) =>
      count == 1 ? '1 matching record' : '$count matching records';

  @override
  State<HistoryFilterSheet> createState() => _HistoryFilterSheetState();
}

class _HistoryFilterSheetState extends State<HistoryFilterSheet> {
  late HistoryFilter _draft = widget.initial;

  /// Space between the card and the bottom of the screen. A home
  /// indicator fits in it; a taller system bar is cleared.
  static const double _bottomGap = 17;

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.viewPaddingOf(context).bottom;
    final bottom = inset <= 2 * _bottomGap ? _bottomGap : inset + 8;

    final count = widget.records
        .where((record) => _draft.matches(record, widget.now))
        .length;

    return SafeArea(
      bottom: false,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, bottom),
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: AppSheetCard.maxWidth),
            child: DecoratedBox(
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.all(Radius.circular(26)),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.filterSheetShadow,
                    offset: Offset(0, 18),
                    blurRadius: 54,
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: const BorderRadius.all(Radius.circular(26)),
                // Scrolls when the screen is too short for the card (small
                // phones in landscape, large text).
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _header(),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'Choose the checks you want to see.\n'
                              'Changes apply only when you confirm.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontFamily: AppTypography.fontFamily,
                                fontSize: 14,
                                fontWeight: AppTypography.regular,
                                letterSpacing: 0,
                                height: 22.4 / 14,
                                color: AppColors.inkHalf,
                              ),
                            ),
                            const SizedBox(height: 12),
                            _FilterField<HistoryPeriod>(
                              label: 'Date range',
                              options: [
                                for (final period in HistoryPeriod.values)
                                  (period, period.label),
                              ],
                              selected: _draft.period,
                              onChanged: (period) => setState(
                                () => _draft = _draft.withPeriod(period!),
                              ),
                            ),
                            const SizedBox(height: 10),
                            _FilterField<HistoryMethod>(
                              label: 'Verification method',
                              options: [
                                (null, 'All methods'),
                                for (final method in HistoryMethod.values)
                                  (method, method.label),
                              ],
                              selected: _draft.method,
                              onChanged: (method) => setState(
                                () => _draft = _draft.withMethod(method),
                              ),
                            ),
                            const SizedBox(height: 10),
                            _FilterField<HistoryResult>(
                              label: 'Verification result',
                              options: [
                                (null, 'All results'),
                                for (final result in HistoryResult.values)
                                  (result, result.label),
                              ],
                              selected: _draft.result,
                              onChanged: (result) => setState(
                                () => _draft = _draft.withResult(result),
                              ),
                            ),
                            const SizedBox(height: 10),
                            _FilterField<HistoryCompletion>(
                              label: 'Completion status',
                              options: [
                                (null, 'All statuses'),
                                for (final completion
                                    in HistoryCompletion.values)
                                  (completion, completion.label),
                              ],
                              selected: _draft.completion,
                              onChanged: (completion) => setState(
                                () =>
                                    _draft = _draft.withCompletion(completion),
                              ),
                            ),
                            if (_draft.isActive) ...[
                              const SizedBox(height: 14),
                              _MatchCount(count: count),
                            ],
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(18, 0, 18, 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            PillButton(
                              label: _draft.isActive
                                  ? 'Show ${count == 1 ? '1 record' : '$count records'}'
                                  : 'Show',
                              weight: AppTypography.medium,
                              onPressed: () =>
                                  Navigator.of(context).pop(_draft),
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () =>
                                  setState(() => _draft = HistoryFilter.none),
                              style: TextButton.styleFrom(
                                minimumSize: const Size(double.infinity, 48),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 18,
                                  vertical: 13,
                                ),
                                foregroundColor: AppColors.filterInk,
                                shape: const RoundedRectangleBorder(
                                  borderRadius: BorderRadius.all(
                                    Radius.circular(30),
                                  ),
                                ),
                                textStyle: const TextStyle(
                                  fontFamily: AppTypography.fontFamily,
                                  fontSize: 13,
                                  fontWeight: AppTypography.medium,
                                  letterSpacing: 0,
                                  height: 17.55 / 13,
                                ),
                              ),
                              child: const Text('Reset'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Handle, "Filter history" and the close button.
  Widget _header() {
    return Stack(
      alignment: Alignment.topCenter,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(54, 40, 54, 2),
          child: Semantics(
            header: true,
            child: const Text(
              'Filter history',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 24,
                fontWeight: AppTypography.bold,
                letterSpacing: -0.84,
                height: 30 / 24,
                color: AppColors.filterInk,
              ),
            ),
          ),
        ),
        Positioned(
          top: 15,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: const BoxDecoration(
                color: AppColors.sheetHandle,
                borderRadius: BorderRadius.all(Radius.circular(4)),
              ),
            ),
          ),
        ),
        Positioned(
          top: 8,
          right: 7,
          child: Semantics(
            button: true,
            label: 'Cancel history filters',
            // Excluding the children drops their tap, so it is declared here.
            onTap: () => Navigator.of(context).pop(),
            excludeSemantics: true,
            child: InkWell(
              onTap: () => Navigator.of(context).pop(),
              customBorder: const CircleBorder(),
              child: SizedBox.square(
                dimension: 48,
                child: Center(
                  child: SvgPicture.asset(
                    AssetPaths.iconHistorySheetClose,
                    width: 22,
                    height: 22,
                    excludeFromSemantics: true,
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

/// A label over a rounded dropdown. A null option stands for "All …".
class _FilterField<T> extends StatelessWidget {
  const _FilterField({
    required this.label,
    required this.options,
    required this.selected,
    required this.onChanged,
  });

  final String label;
  final List<(T?, String)> options;
  final T? selected;
  final ValueChanged<T?> onChanged;

  static const TextStyle _valueStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 14,
    fontWeight: AppTypography.regular,
    letterSpacing: 0,
    color: AppColors.filterInk,
  );

  static const OutlineInputBorder _border = OutlineInputBorder(
    borderRadius: BorderRadius.all(Radius.circular(26)),
    borderSide: BorderSide(color: AppColors.filterField, width: 1.5),
  );

  @override
  Widget build(BuildContext context) {
    final index = options.indexWhere((option) => option.$1 == selected);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ExcludeSemantics(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 13),
            child: Text(
              label,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 12,
                fontWeight: AppTypography.semiBold,
                letterSpacing: 0,
                height: 1.5,
                color: AppColors.filterInk,
              ),
            ),
          ),
        ),
        Semantics(
          label: label,
          child: DropdownButtonFormField<int>(
            // The field keeps its own value; a new key shows a Reset.
            key: ValueKey(index),
            initialValue: index,
            isExpanded: true,
            borderRadius: const BorderRadius.all(Radius.circular(16)),
            dropdownColor: AppColors.surface,
            style: _valueStyle,
            // The icon is drawn in a square this size; the default 24 would
            // stretch the 10 x 6 chevron.
            iconSize: 10,
            icon: SvgPicture.asset(
              AssetPaths.iconHistoryDropdown,
              width: 10,
              height: 6,
              excludeFromSemantics: true,
            ),
            decoration: const InputDecoration(
              isDense: true,
              filled: true,
              fillColor: AppColors.surface,
              contentPadding: EdgeInsets.fromLTRB(20, 12.25, 17, 12.25),
              border: _border,
              enabledBorder: _border,
              focusedBorder: _border,
            ),
            items: [
              for (var i = 0; i < options.length; i++)
                DropdownMenuItem(
                  value: i,
                  child: Text(options[i].$2, style: _valueStyle),
                ),
            ],
            onChanged: (i) {
              if (i != null) onChanged(options[i].$1);
            },
          ),
        ),
      ],
    );
  }
}

/// "1 matching record" on a pale green pill.
class _MatchCount extends StatelessWidget {
  const _MatchCount({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.filterMatchTint,
          border: Border.all(color: AppColors.filterMatchBorder, width: 1.5),
          borderRadius: const BorderRadius.all(Radius.circular(28)),
        ),
        child: Row(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: const BoxDecoration(
                color: AppColors.filterMatchDisc,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: SvgPicture.asset(
                AssetPaths.iconHistoryMatch,
                width: 17,
                height: 17,
                excludeFromSemantics: true,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                HistoryFilterSheet.matching(count),
                style: const TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 13,
                  fontWeight: AppTypography.medium,
                  letterSpacing: 0,
                  height: 19.5 / 13,
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
