import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/clock.dart';
import '../../../../shared/device/location/location_adapter.dart';
import '../../../../shared/ui/widgets/app_toast.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/header_icon_button.dart';
import '../../../../shared/ui/widgets/screen_heading.dart';
import '../../../chl_trips/domain/entities/chl_trip.dart';
import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../notifications/presentation/providers/notifications_controller.dart';
import '../../../verification/data/repositories/verification_repository_impl.dart';
import '../../../verification/domain/repositories/verification_repository.dart';
import '../../../verification/presentation/widgets/verification_page.dart';
import '../../domain/entities/e_tag_status.dart';
import '../../domain/entities/verification_result.dart';

/// "Verification result" for an active CHL trip: the vehicle, its E-Tag and
/// trip status; the trip (route, payment, validity countdown, more details
/// on demand); and the destination check, where the officer records their
/// location for CHL. Finish Verification returns to the dashboard; Refresh
/// Trip Status asks CHL again. Other results have no design yet and show a
/// placeholder.
class VerificationResultScreen extends ConsumerStatefulWidget {
  const VerificationResultScreen({super.key, this.result});

  /// Null when the page is opened without a verification.
  final VerificationResult? result;

  /// "05 Oct 2026, 16:28 GMT+1", in the phone's time zone.
  static String dateTime(DateTime at) =>
      '${DateFormat('dd MMM yyyy, HH:mm').format(at)} '
      '${zone(at.timeZoneOffset)}';

  /// "GMT", "GMT+1", "GMT-3:30".
  static String zone(Duration offset) {
    if (offset == Duration.zero) return 'GMT';
    final minutes = offset.inMinutes.abs();
    final hours = minutes ~/ 60;
    final rest = minutes % 60;
    return 'GMT${offset.isNegative ? '-' : '+'}$hours'
        '${rest == 0 ? '' : ':${rest.toString().padLeft(2, '0')}'}';
  }

  /// "04 h 21 min 02 sec".
  static String countdown(Duration left) {
    String two(int value) => value.toString().padLeft(2, '0');
    return '${two(left.inHours)} h ${two(left.inMinutes.remainder(60))} min '
        '${two(left.inSeconds.remainder(60))} sec';
  }

  /// "8.97440°, 7.45281° · ±97 m".
  static String coordinates(RecordedLocation location) =>
      '${location.latitude.toStringAsFixed(5)}°, '
      '${location.longitude.toStringAsFixed(5)}° · '
      '±${location.accuracyMetres.round()} m';

  /// How the E-Tag reads in the summary.
  static String eTagValidity(ETagStatus status) => switch (status) {
    ETagStatus.valid => 'Valid JRB E-Tag',
    ETagStatus.invalid => 'Invalid JRB E-Tag',
    ETagStatus.missing => 'No E-Tag',
  };

  @override
  ConsumerState<VerificationResultScreen> createState() =>
      _VerificationResultScreenState();
}

enum _LocationState { idle, recording, recorded }

class _VerificationResultScreenState
    extends ConsumerState<VerificationResultScreen> {
  late VerificationResult? _result = widget.result;
  bool _refreshing = false;
  _LocationState _locationState = _LocationState.idle;
  RecordedLocation? _recorded;

  Future<void> _refresh() async {
    final result = _result;
    if (result == null || _refreshing) return;
    setState(() => _refreshing = true);
    try {
      final fresh = await ref
          .read(verificationRepositoryProvider)
          .refresh(result);
      if (!mounted) return;
      setState(() => _result = fresh);
      showAppToast(context, 'Trip status updated.');
    } on VerificationFailure catch (failure) {
      if (mounted) showAppToast(context, failure.message);
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  Future<void> _recordLocation() async {
    final trip = _result?.trip;
    if (trip == null || _locationState == _LocationState.recording) return;
    final previous = _locationState;
    setState(() => _locationState = _LocationState.recording);
    try {
      final location = await ref.read(locationReaderProvider).current();
      final recorded = await ref
          .read(verificationRepositoryProvider)
          .recordDestinationLocation(trip.transactionReference, location);
      if (!mounted) return;
      setState(() {
        _recorded = recorded;
        _locationState = _LocationState.recorded;
      });
    } on LocationUnavailable catch (error) {
      if (!mounted) return;
      setState(() => _locationState = previous);
      showAppToast(context, switch (error.problem) {
        LocationProblem.serviceOff =>
          'Turn on location (GPS) to record your location.',
        LocationProblem.permissionDenied =>
          'Allow location access to record your location.',
        LocationProblem.unavailable =>
          'Your location could not be read. Try again.',
      });
    } on VerificationFailure catch (failure) {
      if (!mounted) return;
      setState(() => _locationState = previous);
      showAppToast(context, failure.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final unread = ref.watch(unreadNotificationCountProvider);
    final result = _result;

    final Widget body;
    if (result == null) {
      body = const EmptyState(
        title: 'Verification result',
        message: 'There is no verification to show.',
      );
    } else if (result.tripStatus != TripStatus.active || result.trip == null) {
      body = EmptyState(
        title: result.plate.display,
        message: notBuiltYetMessage,
      );
    } else {
      body = _ActiveTrip(
        result: result,
        trip: result.trip!,
        locationState: _locationState,
        recorded: _recorded,
        refreshing: _refreshing,
        onRecordLocation: _recordLocation,
        onRefresh: _refresh,
        onFinish: () => context.goNamed(RouteNames.dashboard),
      );
    }

    return VerificationPageScaffold(
      title: 'Verification result',
      trailing: HeaderIconButton(
        iconAsset: AssetPaths.iconBell,
        semanticLabel: unread > 0
            ? 'Notifications, $unread unread'
            : 'Notifications',
        badgeCount: unread,
        onPressed: () => context.goNamed(RouteNames.notifications),
      ),
      body: body,
    );
  }
}

/// The page for an active trip.
class _ActiveTrip extends StatelessWidget {
  const _ActiveTrip({
    required this.result,
    required this.trip,
    required this.locationState,
    required this.recorded,
    required this.refreshing,
    required this.onRecordLocation,
    required this.onRefresh,
    required this.onFinish,
  });

  final VerificationResult result;
  final ChlTrip trip;
  final _LocationState locationState;
  final RecordedLocation? recorded;
  final bool refreshing;
  final VoidCallback onRecordLocation;
  final VoidCallback onRefresh;
  final VoidCallback onFinish;

  @override
  Widget build(BuildContext context) {
    final check = result.destinationCheck;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
      children: [
        VerificationContentWidth(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: Container(
                  width: 58,
                  height: 58,
                  decoration: const BoxDecoration(
                    color: AppColors.green,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: SvgPicture.asset(
                    AssetPaths.iconResultVerified,
                    width: 30,
                    height: 30,
                    excludeFromSemantics: true,
                  ),
                ),
              ),
              const SizedBox(height: 11),
              const ScreenHeading(
                heading: 'Active CHL trip',
                description:
                    'Review the trip status returned with this vehicle '
                    'verification.',
              ),
              const SizedBox(height: 16),
              _Summary(result: result),
              const SizedBox(height: 10),
              _CurrentTrip(result: result, trip: trip),
              if (check != null) ...[
                const SizedBox(height: 16),
                _DestinationCheckCard(
                  trip: trip,
                  check: check,
                  state: locationState,
                  recorded: recorded,
                  onRecord: onRecordLocation,
                ),
              ],
              const SizedBox(height: 24),
              _GreenButton(label: 'Finish Verification', onPressed: onFinish),
              const SizedBox(height: 10),
              TextButton(
                onPressed: refreshing ? null : onRefresh,
                style: TextButton.styleFrom(
                  minimumSize: const Size(double.infinity, 54),
                  foregroundColor: Colors.black,
                  shape: const RoundedRectangleBorder(
                    borderRadius: BorderRadius.all(Radius.circular(24)),
                  ),
                  textStyle: _Styles.button,
                ),
                child: Text(
                  refreshing
                      ? 'Refreshing Trip Status…'
                      : 'Refresh Trip Status',
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

abstract final class _Styles {
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
}

BoxDecoration _card({double radius = 16}) => BoxDecoration(
  color: AppColors.surface,
  border: Border.all(color: AppColors.cardBorder, width: 1.5),
  borderRadius: BorderRadius.all(Radius.circular(radius)),
);

/// Vehicle identity, E-Tag validity and CHL trip status.
class _Summary extends StatelessWidget {
  const _Summary({required this.result});

  final VerificationResult result;

  @override
  Widget build(BuildContext context) {
    final rows = [
      (AssetPaths.iconResultVehicle, 'Vehicle identity', result.plate.display),
      (
        AssetPaths.iconResultETag,
        'E-Tag validity',
        VerificationResultScreen.eTagValidity(result.eTagStatus),
      ),
      (AssetPaths.iconResultTrip, 'CHL trip status', 'Active'),
    ];
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: _card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < rows.length; i++)
            Semantics(
              container: true,
              label: '${rows[i].$2}: ${rows[i].$3}',
              excludeSemantics: true,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 18,
                ),
                decoration: i == rows.length - 1
                    ? null
                    : BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: i == 0
                                ? AppColors.syncDivider
                                : AppColors.cardBorder,
                            width: 1.5,
                          ),
                        ),
                      ),
                child: Row(
                  children: [
                    SvgPicture.asset(
                      rows[i].$1,
                      width: 24,
                      height: 24,
                      excludeFromSemantics: true,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(rows[i].$2, style: _Styles.small),
                          const SizedBox(height: 4),
                          Text(
                            rows[i].$3,
                            style: const TextStyle(
                              fontFamily: AppTypography.fontFamily,
                              fontSize: 15,
                              fontWeight: AppTypography.bold,
                              letterSpacing: 0,
                              color: AppColors.forest,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// "Current trip": route, its details and the validity countdown.
class _CurrentTrip extends StatelessWidget {
  const _CurrentTrip({required this.result, required this.trip});

  final VerificationResult result;
  final ChlTrip trip;

  @override
  Widget build(BuildContext context) {
    final date = VerificationResultScreen.dateTime;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: _card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Semantics(
                  header: true,
                  child: const Text(
                    'Current trip',
                    style: _Styles.sectionTitle,
                  ),
                ),
              ),
              const _ActiveBadge(),
            ],
          ),
          const SizedBox(height: 10),
          _RouteSummary(trip: trip),
          const SizedBox(height: 18),
          _RouteMap(trip: trip),
          const SizedBox(height: 18),
          _Definition(
            label: 'Transaction reference',
            value: trip.transactionReference,
          ),
          _DefinitionPair(
            ('Trip start date/time', date(trip.startedAt)),
            ('Payment date/time', date(trip.paidAt)),
          ),
          _DefinitionPair(
            ('Vehicle plate number', result.plate.display),
            ('Vehicle type', result.vehicleType),
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
            ('Trip status', 'Active'),
          ),
          _Countdown(trip: trip),
          _MoreTripInformation(trip: trip),
        ],
      ),
    );
  }
}

/// "✓ Active" on pale green.
class _ActiveBadge extends StatelessWidget {
  const _ActiveBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: const BoxDecoration(
        color: AppColors.mint,
        borderRadius: BorderRadius.all(Radius.circular(20)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SvgPicture.asset(
            AssetPaths.iconResultActive,
            width: 14,
            height: 14,
            excludeFromSemantics: true,
          ),
          const SizedBox(width: 5),
          const Text(
            'Active',
            style: TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 12,
              fontWeight: AppTypography.semiBold,
              letterSpacing: 0,
              color: AppColors.green,
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
          style: _Styles.small,
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
      decoration: _card(radius: 20),
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
                  style: _Styles.small.copyWith(fontSize: 11),
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
class _Definition extends StatelessWidget {
  const _Definition({
    required this.label,
    required this.value,
    this.large = false,
  });

  final String label;
  final String value;

  /// Larger value, as for the countdown.
  final bool large;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: '$label: $value',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: const BoxDecoration(
          border: Border(
            bottom: BorderSide(color: AppColors.cardBorder, width: 1.5),
          ),
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
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: large ? 21 : 15,
                fontWeight: AppTypography.semiBold,
                letterSpacing: 0,
                height: 1.5,
                color: AppColors.ink,
              ),
            ),
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
            child: _Definition(label: left.$1, value: left.$2),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: _Definition(label: right.$1, value: right.$2),
          ),
        ],
      ),
    );
  }
}

/// "Trip validity countdown", ticking every second.
class _Countdown extends ConsumerWidget {
  const _Countdown({required this.trip});

  final ChlTrip trip;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now =
        ref.watch(secondTickerProvider).value ?? ref.watch(clockProvider)();
    return _Definition(
      label: 'Trip validity countdown',
      value: VerificationResultScreen.countdown(trip.remainingAt(now)),
      large: true,
    );
  }
}

/// "Additional trip information", opened on demand.
class _MoreTripInformation extends StatefulWidget {
  const _MoreTripInformation({required this.trip});

  final ChlTrip trip;

  @override
  State<_MoreTripInformation> createState() => _MoreTripInformationState();
}

class _MoreTripInformationState extends State<_MoreTripInformation> {
  bool _open = false;

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
                  const Expanded(
                    child: Text(
                      'Additional trip information',
                      style: TextStyle(
                        fontFamily: AppTypography.fontFamily,
                        fontSize: 14,
                        fontWeight: AppTypography.semiBold,
                        letterSpacing: 0,
                        color: AppColors.forest,
                      ),
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
                  _Row(
                    label: rows[i].$1,
                    value: rows[i].$2,
                    labelColor: AppColors.moss,
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
class _Row extends StatelessWidget {
  const _Row({
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
                  style: _Styles.rowLabel.copyWith(color: labelColor),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  value,
                  textAlign: TextAlign.end,
                  style: _Styles.rowValue,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// "Destination check": what CHL compares, and recording the officer's
/// location for it.
class _DestinationCheckCard extends StatelessWidget {
  const _DestinationCheckCard({
    required this.trip,
    required this.check,
    required this.state,
    required this.recorded,
    required this.onRecord,
  });

  final ChlTrip trip;
  final DestinationCheck check;
  final _LocationState state;
  final RecordedLocation? recorded;
  final VoidCallback onRecord;

  @override
  Widget build(BuildContext context) {
    final rows = [
      ('Destination LGA', trip.destinationLga),
      ('Enforcement point', check.enforcementPoint),
      ('Completion decision', check.completionDecision),
      ('Centrally defined delay', '${check.centralDelay.inSeconds} seconds'),
    ];
    final recorded = this.recorded;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: _card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: const Text('Destination check', style: _Styles.sectionTitle),
          ),
          const SizedBox(height: 10),
          const Text(
            'Record this agent’s location for CHL to validate against the '
            'enforcement point and destination-LGA geofence.',
            style: TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 14,
              fontWeight: AppTypography.regular,
              letterSpacing: 0,
              height: 21.7 / 14,
              color: AppColors.ink,
            ),
          ),
          const SizedBox(height: 16),
          for (var i = 0; i < rows.length; i++)
            _Row(
              label: rows[i].$1,
              value: rows[i].$2,
              divider: i < rows.length - 1 ? AppColors.cardBorder : null,
            ),
          if (state == _LocationState.recorded && recorded != null) ...[
            const SizedBox(height: 16),
            _LocationReceived(location: recorded),
          ],
          const SizedBox(height: 18),
          switch (state) {
            _LocationState.idle => OutlinedButton(
              onPressed: onRecord,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, 52),
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 13,
                ),
                backgroundColor: AppColors.surface,
                foregroundColor: AppColors.ink,
                side: const BorderSide(color: AppColors.cardBorder, width: 1.5),
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.all(Radius.circular(28)),
                ),
                textStyle: _Styles.button,
              ),
              child: const Text(
                'Record location for destination check',
                textAlign: TextAlign.center,
              ),
            ),
            _LocationState.recording => Semantics(
              liveRegion: true,
              child: OutlinedButton(
                onPressed: null,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 54),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 13,
                  ),
                  disabledBackgroundColor: AppColors.buttonDisabledFill,
                  disabledForegroundColor: AppColors.inkHalf,
                  side: const BorderSide(
                    color: AppColors.cardBorder,
                    width: 1.5,
                  ),
                  shape: const RoundedRectangleBorder(
                    borderRadius: BorderRadius.all(Radius.circular(24)),
                  ),
                  textStyle: _Styles.button,
                ),
                child: const Text(
                  'Recording Location...',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            _LocationState.recorded => OutlinedButton(
              // Records again, e.g. after moving.
              onPressed: onRecord,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, 54),
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 13,
                ),
                foregroundColor: AppColors.green,
                side: const BorderSide(color: AppColors.green, width: 1.5),
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.all(Radius.circular(24)),
                ),
                textStyle: _Styles.button,
              ),
              child: const Text(
                'Location Record Updated',
                textAlign: TextAlign.center,
              ),
            ),
          },
        ],
      ),
    );
  }
}

/// "Location received": where and when CHL received the location.
class _LocationReceived extends StatelessWidget {
  const _LocationReceived({required this.location});

  final RecordedLocation location;

  static const TextStyle _detail = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 13,
    fontWeight: AppTypography.regular,
    letterSpacing: 0,
    height: 20.15 / 13,
    color: AppColors.forest,
  );

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.activityRing,
          border: Border.all(color: AppColors.green, width: 1.5),
          borderRadius: const BorderRadius.all(Radius.circular(16)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Location received',
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 16,
                fontWeight: AppTypography.bold,
                letterSpacing: 0,
                color: AppColors.forest,
              ),
            ),
            const SizedBox(height: 7),
            Text(
              VerificationResultScreen.coordinates(location),
              style: _detail,
            ),
            const SizedBox(height: 7),
            Text(
              VerificationResultScreen.dateTime(location.recordedAt),
              style: _detail,
            ),
          ],
        ),
      ),
    );
  }
}

/// Green 54 px button.
class _GreenButton extends StatelessWidget {
  const _GreenButton({required this.label, required this.onPressed});

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
        textStyle: _Styles.button,
      ),
      child: Text(label, textAlign: TextAlign.center),
    );
  }
}
