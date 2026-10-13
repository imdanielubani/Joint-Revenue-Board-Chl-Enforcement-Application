import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../chl_trips/domain/entities/chl_trip.dart';
import '../../../verification/domain/entities/plate_number.dart';

/// Parts shared by the verification result and the last CHL trip pages.

/// "05 Oct 2026, 16:28 GMT+1", in the phone's time zone.
String tripDateTime(DateTime at) =>
    '${DateFormat('dd MMM yyyy, HH:mm').format(at)} '
    '${tripTimeZone(at.timeZoneOffset)}';

/// "GMT", "GMT+1", "GMT-3:30".
String tripTimeZone(Duration offset) {
  if (offset == Duration.zero) return 'GMT';
  final minutes = offset.inMinutes.abs();
  final hours = minutes ~/ 60;
  final rest = minutes % 60;
  return 'GMT${offset.isNegative ? '-' : '+'}$hours'
      '${rest == 0 ? '' : ':${rest.toString().padLeft(2, '0')}'}';
}

abstract final class ResultTextStyles {
  static const TextStyle button = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 15,
    fontWeight: AppTypography.semiBold,
    letterSpacing: 0,
    height: 20.25 / 15,
  );

  static const TextStyle sectionTitle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 19,
    fontWeight: AppTypography.semiBold,
    letterSpacing: -0.285,
    height: 24.7 / 19,
    color: AppColors.forest,
  );

  static const TextStyle small = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 12,
    fontWeight: AppTypography.regular,
    letterSpacing: 0,
    color: AppColors.moss,
  );

  static const TextStyle rowLabel = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 14,
    fontWeight: AppTypography.regular,
    letterSpacing: 0,
    color: AppColors.ink,
  );

  static const TextStyle rowValue = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 14,
    fontWeight: AppTypography.semiBold,
    letterSpacing: 0,
    color: AppColors.forest,
  );

  /// Body copy inside a trip card, e.g. under the validity.
  static const TextStyle note = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 13,
    fontWeight: AppTypography.regular,
    letterSpacing: 0,
    height: 18.85 / 13,
    color: AppColors.ink,
  );
}

/// White card with a grey border.
BoxDecoration resultCardDecoration({double radius = 16}) => BoxDecoration(
  color: AppColors.surface,
  border: Border.all(color: AppColors.cardBorder, width: 1.5),
  borderRadius: BorderRadius.all(Radius.circular(radius)),
);

/// Green 54 px button.
class ResultFilledButton extends StatelessWidget {
  const ResultFilledButton({
    super.key,
    required this.label,
    required this.onPressed,
  });

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        minimumSize: const Size(double.infinity, 54),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        backgroundColor: AppColors.green,
        foregroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(24)),
        ),
        textStyle: ResultTextStyles.button,
      ),
      child: Text(label, textAlign: TextAlign.center),
    );
  }
}

/// Borderless 54 px button with black text.
class ResultTextButton extends StatelessWidget {
  const ResultTextButton({
    super.key,
    required this.label,
    required this.onPressed,
  });

  final String label;

  /// Null disables the button.
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        minimumSize: const Size(double.infinity, 54),
        foregroundColor: Colors.black,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(24)),
        ),
        textStyle: ResultTextStyles.button,
      ),
      child: Text(label, textAlign: TextAlign.center),
    );
  }
}

/// A trip: its status, route, details, validity ([validity]) and, on
/// demand, more information.
class TripDetailsCard extends StatelessWidget {
  const TripDetailsCard({
    super.key,
    required this.heading,
    required this.plate,
    required this.vehicleType,
    required this.trip,
    required this.validity,
    this.historical = false,
  });

  /// e.g. "Current trip".
  final String heading;

  final PlateNumber plate;
  final String vehicleType;
  final ChlTrip trip;

  /// Under the details: the countdown, or why there is none.
  final Widget validity;

  /// An earlier trip, styled as such.
  final bool historical;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: resultCardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(heading, style: ResultTextStyles.sectionTitle),
                ),
              ),
              const SizedBox(width: 8),
              _StateBadge(state: trip.state),
            ],
          ),
          const SizedBox(height: 10),
          _RouteSummary(trip: trip),
          const SizedBox(height: 18),
          _RouteMap(trip: trip),
          const SizedBox(height: 18),
          TripDefinition(
            label: 'Transaction reference',
            value: trip.transactionReference,
          ),
          _DefinitionPair(
            ('Trip start date/time', tripDateTime(trip.startedAt)),
            ('Payment date/time', tripDateTime(trip.paidAt)),
          ),
          _DefinitionPair(
            ('Vehicle plate number', plate.display),
            ('Vehicle type', vehicleType),
          ),
          _DefinitionPair(
            ('Transaction type', trip.transactionType),
            ('Originating state', trip.originState),
          ),
          _DefinitionPair(
            ('Originating LGA', trip.originLga),
            ('Destination state', trip.destinationState),
          ),
          _DefinitionPair(
            ('Destination LGA', trip.destinationLga),
            ('Trip status', trip.state.label),
          ),
          validity,
          _MoreTripInformation(trip: trip, historical: historical),
        ],
      ),
    );
  }
}

/// "✓ Active" on pale green; an expired trip reads in amber.
class _StateBadge extends StatelessWidget {
  const _StateBadge({required this.state});

  final ChlTripState state;

  @override
  Widget build(BuildContext context) {
    final expired = state == ChlTripState.expired;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: expired ? AppColors.warningContainer : AppColors.mint,
        borderRadius: const BorderRadius.all(Radius.circular(20)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!expired) ...[
            SvgPicture.asset(
              AssetPaths.iconResultActive,
              width: 14,
              height: 14,
              excludeFromSemantics: true,
            ),
            const SizedBox(width: 5),
          ],
          Text(
            state.label,
            style: TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 12,
              fontWeight: AppTypography.semiBold,
              letterSpacing: 0,
              color: expired ? AppColors.warning : AppColors.green,
            ),
          ),
        ],
      ),
    );
  }
}

/// Origin → destination, state and LGA.
class _RouteSummary extends StatelessWidget {
  const _RouteSummary({required this.trip});

  final ChlTrip trip;

  @override
  Widget build(BuildContext context) {
    Widget place(String state, String lga, CrossAxisAlignment align) => Column(
      crossAxisAlignment: align,
      children: [
        Text(
          state,
          textAlign: align == CrossAxisAlignment.end
              ? TextAlign.end
              : TextAlign.start,
          style: const TextStyle(
            fontFamily: AppTypography.fontFamily,
            fontSize: 18,
            fontWeight: AppTypography.bold,
            letterSpacing: 0,
            color: AppColors.forest,
          ),
        ),
        const SizedBox(height: 5),
        Text(
          lga,
          textAlign: align == CrossAxisAlignment.end
              ? TextAlign.end
              : TextAlign.start,
          style: ResultTextStyles.small,
        ),
      ],
    );

    return Semantics(
      container: true,
      label:
          'From ${trip.originLga}, ${trip.originState} to '
          '${trip.destinationLga}, ${trip.destinationState}',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.activityRing,
          border: Border.all(color: AppColors.green, width: 1.5),
          borderRadius: const BorderRadius.all(Radius.circular(18)),
        ),
        child: Row(
          children: [
            Expanded(
              child: place(
                trip.originState,
                trip.originLga,
                CrossAxisAlignment.start,
              ),
            ),
            const SizedBox(width: 12),
            SvgPicture.asset(
              AssetPaths.iconResultArrow,
              width: 24,
              height: 24,
              excludeFromSemantics: true,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: place(
                trip.destinationState,
                trip.destinationLga,
                CrossAxisAlignment.end,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// "Trip route": an illustration from origin A to destination B.
class _RouteMap extends StatelessWidget {
  const _RouteMap({required this.trip});

  final ChlTrip trip;

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: resultCardDecoration(radius: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                SvgPicture.asset(
                  AssetPaths.iconResultRoutePin,
                  width: 24,
                  height: 24,
                  excludeFromSemantics: true,
                ),
                const SizedBox(width: 7),
                const Expanded(
                  child: Text(
                    'Trip route',
                    style: TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: 14,
                      fontWeight: AppTypography.bold,
                      letterSpacing: 0,
                      color: AppColors.forest,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Origin → Destination',
                  style: ResultTextStyles.small.copyWith(fontSize: 11),
                ),
              ],
            ),
          ),
          Semantics(
            container: true,
            image: true,
            label:
                'Illustrative route from ${trip.originLga} to '
                '${trip.destinationLga}',
            child: Container(
              height: 200,
              color: AppColors.routeMapGround,
              child: SvgPicture.asset(
                AssetPaths.imageResultRouteMap,
                fit: BoxFit.cover,
                excludeFromSemantics: true,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A green label over its value, with a line under them.
class TripDefinition extends StatelessWidget {
  const TripDefinition({
    super.key,
    required this.label,
    required this.value,
    this.large = false,
    this.note,
    this.divider = AppColors.cardBorder,
  });

  final String label;
  final String value;

  /// Larger value, as for the trip validity.
  final bool large;

  /// A line of explanation under the value.
  final String? note;

  /// The line under the definition.
  final Color divider;

  @override
  Widget build(BuildContext context) {
    final note = this.note;
    return Semantics(
      container: true,
      label: '$label: $value${note == null ? '' : '. $note'}',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: divider, width: 1.5)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 12,
                fontWeight: AppTypography.regular,
                letterSpacing: 0,
                height: 1.5,
                color: AppColors.green,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              value,
              style: note != null
                  // An explained value (e.g. no countdown) reads as a
                  // statement rather than a figure.
                  ? const TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: 21,
                      fontWeight: AppTypography.bold,
                      letterSpacing: 0,
                      height: 1.5,
                      color: AppColors.forest,
                    )
                  : TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: large ? 21 : 15,
                      fontWeight: AppTypography.semiBold,
                      letterSpacing: 0,
                      height: 1.5,
                      color: AppColors.ink,
                    ),
            ),
            if (note != null) ...[
              const SizedBox(height: 8),
              Text(note, style: ResultTextStyles.note),
            ],
          ],
        ),
      ),
    );
  }
}

/// Two definitions side by side, their lines level.
class _DefinitionPair extends StatelessWidget {
  const _DefinitionPair(this.left, this.right);

  final (String, String) left;
  final (String, String) right;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: TripDefinition(label: left.$1, value: left.$2),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: TripDefinition(label: right.$1, value: right.$2),
          ),
        ],
      ),
    );
  }
}

/// "Additional trip information", opened on demand.
class _MoreTripInformation extends StatefulWidget {
  const _MoreTripInformation({required this.trip, required this.historical});

  final ChlTrip trip;

  /// For an earlier trip the title is darker when closed and bolder when
  /// open, and the labels are black.
  final bool historical;

  @override
  State<_MoreTripInformation> createState() => _MoreTripInformationState();
}

class _MoreTripInformationState extends State<_MoreTripInformation> {
  bool _open = false;

  TextStyle get _titleStyle {
    if (!widget.historical) {
      return const TextStyle(
        fontFamily: AppTypography.fontFamily,
        fontSize: 14,
        fontWeight: AppTypography.semiBold,
        letterSpacing: 0,
        color: AppColors.forest,
      );
    }
    return TextStyle(
      fontFamily: AppTypography.fontFamily,
      fontSize: 14,
      fontWeight: _open ? AppTypography.bold : AppTypography.semiBold,
      letterSpacing: 0,
      color: _open ? AppColors.forest : AppColors.ink,
    );
  }

  @override
  Widget build(BuildContext context) {
    final rows = [
      ('Cargo', widget.trip.cargo ?? 'Not declared'),
      ('Payment reference', widget.trip.paymentReference ?? 'Not recorded'),
    ];
    void toggle() => setState(() => _open = !_open);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          container: true,
          button: true,
          expanded: _open,
          label: 'Additional trip information',
          // Excluding the children drops their tap, so it is declared here.
          onTap: toggle,
          excludeSemantics: true,
          child: InkWell(
            onTap: toggle,
            borderRadius: const BorderRadius.all(Radius.circular(16)),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 52),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Additional trip information',
                      style: _titleStyle,
                    ),
                  ),
                  AnimatedRotation(
                    // The chevron points down when closed, up when open.
                    turns: _open ? -0.25 : 0.25,
                    duration: const Duration(milliseconds: 200),
                    child: SvgPicture.asset(
                      AssetPaths.iconResultChevron,
                      width: 24,
                      height: 24,
                      excludeFromSemantics: true,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (_open)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < rows.length; i++)
                  ResultDetailRow(
                    label: rows[i].$1,
                    value: rows[i].$2,
                    labelColor: widget.historical
                        ? AppColors.ink
                        : AppColors.moss,
                    divider: i < rows.length - 1 ? AppColors.syncDivider : null,
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

/// A label and its value on one line, the value on the right.
class ResultDetailRow extends StatelessWidget {
  const ResultDetailRow({
    super.key,
    required this.label,
    required this.value,
    this.labelColor = AppColors.ink,
    this.divider,
  });

  final String label;
  final String value;
  final Color labelColor;

  /// The line under the row, if any.
  final Color? divider;

  @override
  Widget build(BuildContext context) {
    final divider = this.divider;
    return Semantics(
      container: true,
      label: '$label: $value',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 11),
        decoration: divider == null
            ? null
            : BoxDecoration(
                border: Border(bottom: BorderSide(color: divider, width: 1.5)),
              ),
        // The label keeps its width (up to just over half the row); the
        // value takes the rest, on the right.
        child: LayoutBuilder(
          builder: (context, box) => Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ConstrainedBox(
                constraints: BoxConstraints(maxWidth: box.maxWidth * .55),
                child: Text(
                  label,
                  style: ResultTextStyles.rowLabel.copyWith(color: labelColor),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  value,
                  textAlign: TextAlign.end,
                  style: ResultTextStyles.rowValue,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
