import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/clock.dart';
import '../../../../shared/device/location/location_adapter.dart';
import '../../../../shared/ui/widgets/app_toast.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/screen_heading.dart';
import '../../../chl_trips/domain/entities/chl_trip.dart';
import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../notifications/presentation/widgets/notifications_bell.dart';
import '../../../verification/data/repositories/verification_repository_impl.dart';
import '../../../verification/domain/repositories/verification_repository.dart';
import '../../../verification/presentation/widgets/verification_page.dart';
import '../../domain/entities/e_tag_status.dart';
import '../../domain/entities/load_status.dart';
import '../../domain/entities/verification_result.dart';
import '../widgets/trip_details_card.dart';

/// "Verification result": the vehicle, its E-Tag and trip status, then
/// what follows from them.
/// - An active trip: the trip (route, payment, validity countdown, more
///   details on demand) and the destination check, where the officer
///   records their location for CHL. Finish Verification returns to the
///   dashboard; Refresh Trip Status asks CHL again.
/// - No active trip (or no trip ever): "No Active Trip Found", the haulage
///   check (Loaded / Empty, sent to CHL) and View Last CHL Trip, which shows
///   the last trip or "No Trip History".
class VerificationResultScreen extends ConsumerStatefulWidget {
  const VerificationResultScreen({super.key, this.result});

  /// Null when the page is opened without a verification.
  final VerificationResult? result;

  /// "October 12, 2026 12:49 PM", in the phone's time zone.
  static String dateTime(DateTime at) => tripDateTime(at);

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

  /// How the CHL trip status reads in the summary. Only an earlier trip
  /// is still no active trip.
  static String tripStatus(TripStatus status) => switch (status) {
    TripStatus.active => 'Active',
    TripStatus.noActive || TripStatus.previous => 'No Active Trip',
    // The last trip page says there is no history.
    TripStatus.noHistory => 'No Active Trip',
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
    final result = _result;
    if (result == null ||
        result.trip == null ||
        _locationState == _LocationState.recording) {
      return;
    }
    final previous = _locationState;
    setState(() => _locationState = _LocationState.recording);
    try {
      final location = await ref.read(locationReaderProvider).current();
      final recorded = await ref
          .read(verificationRepositoryProvider)
          .recordDestinationLocation(result, location);
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
    final result = _result;
    void finish() => context.goNamed(RouteNames.dashboard);

    final Widget body;
    if (result == null) {
      body = const EmptyState(
        title: 'Verification result',
        message: 'There is no verification to show.',
      );
    } else if (result.tripStatus == TripStatus.active && result.trip != null) {
      body = _ActiveTrip(
        result: result,
        trip: result.trip!,
        locationState: _locationState,
        recorded: _recorded,
        refreshing: _refreshing,
        onRecordLocation: _recordLocation,
        onRefresh: _refresh,
        onFinish: finish,
      );
    } else {
      body = _NoActiveTrip(
        result: result,
        // The last trip page shows "No Trip History" when there is none.
        onViewLastTrip: () =>
            context.pushNamed(RouteNames.lastChlTrip, extra: result),
      );
    }

    return VerificationPageScaffold(
      title: 'Verification result',
      trailing: const NotificationsBell(),
      body: body,
    );
  }
}

/// The 58 px round icon above the heading.
class _ResultIcon extends StatelessWidget {
  const _ResultIcon({required this.asset, required this.color});

  final String asset;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: Container(
        width: 58,
        height: 58,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        alignment: Alignment.center,
        child: SvgPicture.asset(
          asset,
          width: 30,
          height: 30,
          excludeFromSemantics: true,
        ),
      ),
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
              const _ResultIcon(
                asset: AssetPaths.iconResultVerified,
                color: AppColors.green,
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
              TripDetailsCard(
                heading: 'Current trip',
                plate: result.plate,
                vehicleType: result.vehicleType,
                trip: trip,
                validity: _Countdown(trip: trip),
              ),
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
              ResultFilledButton(
                label: 'Finish Verification',
                onPressed: onFinish,
              ),
              const SizedBox(height: 10),
              ResultTextButton(
                label: refreshing
                    ? 'Refreshing Trip Status…'
                    : 'Refresh Trip Status',
                onPressed: refreshing ? null : onRefresh,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// The page when the vehicle has no active trip: the summary, the haulage
/// check, and the way to its last trip at the bottom.
class _NoActiveTrip extends StatelessWidget {
  const _NoActiveTrip({required this.result, required this.onViewLastTrip});

  final VerificationResult result;
  final VoidCallback onViewLastTrip;

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
          sliver: SliverToBoxAdapter(
            child: VerificationContentWidth(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _ResultIcon(
                    asset: AssetPaths.iconResultNoTrip,
                    color: AppColors.noTripIconFill,
                  ),
                  const SizedBox(height: 11),
                  const ScreenHeading(
                    heading: 'No Active Trip Found',
                    description:
                        'No current active trip was returned. Review the '
                        'latest trip and physical facts before taking action.',
                  ),
                  const SizedBox(height: 20),
                  _Summary(result: result),
                  const SizedBox(height: 16),
                  _HaulageCheck(result: result),
                ],
              ),
            ),
          ),
        ),
        // The button sits at the bottom of the page, or under the summary
        // when the page scrolls.
        SliverFillRemaining(
          hasScrollBody: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
            child: Align(
              alignment: Alignment.bottomCenter,
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: VerificationPageScaffold.maxContentWidth,
                ),
                child: ResultFilledButton(
                  label: 'View Last CHL Trip',
                  onPressed: onViewLastTrip,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// "Haulage check": the officer confirms whether the vehicle is carrying
/// haulage goods (Loaded) or not (Empty); CHL enforcement applies only to a
/// loaded vehicle. The answer is sent to CHL and can be changed.
class _HaulageCheck extends ConsumerStatefulWidget {
  const _HaulageCheck({required this.result});

  final VerificationResult result;

  @override
  ConsumerState<_HaulageCheck> createState() => _HaulageCheckState();
}

class _HaulageCheckState extends ConsumerState<_HaulageCheck> {
  /// What CHL has recorded.
  LoadStatus? _recorded;

  /// Being sent.
  LoadStatus? _sending;

  Future<void> _record(LoadStatus status) async {
    if (_sending != null || status == _recorded) return;
    setState(() => _sending = status);
    try {
      await ref
          .read(verificationRepositoryProvider)
          .recordLoadStatus(widget.result, status);
      if (!mounted) return;
      setState(() => _recorded = status);
    } on VerificationFailure catch (failure) {
      if (mounted) showAppToast(context, failure.message);
    } on Object {
      if (mounted) {
        showAppToast(
          context,
          'The haulage check could not be sent. Check the connection and '
          'try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _sending = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final recorded = _recorded;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: resultCardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: const Text(
              'Haulage check',
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 15,
                fontWeight: AppTypography.bold,
                letterSpacing: 0,
                color: AppColors.forest,
              ),
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Is this vehicle carrying haulage goods? CHL enforcement applies '
            'only to a loaded vehicle.',
            style: TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 12,
              fontWeight: AppTypography.regular,
              letterSpacing: 0,
              height: 18 / 12,
              color: AppColors.ink,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              for (final status in LoadStatus.values) ...[
                if (status.index > 0) const SizedBox(width: 10),
                Expanded(
                  child: _LoadChoice(
                    status: status,
                    selected: status == recorded,
                    sending: status == _sending,
                    onPressed: _sending == null ? () => _record(status) : null,
                  ),
                ),
              ],
            ],
          ),
          if (recorded != null) ...[
            const SizedBox(height: 12),
            Semantics(
              liveRegion: true,
              child: Text(switch (recorded) {
                LoadStatus.loaded =>
                  'Recorded: carrying haulage goods. CHL enforcement '
                      'applies.',
                LoadStatus.empty =>
                  'Recorded: not carrying haulage goods. No CHL '
                      'enforcement is needed.',
              }, style: ResultTextStyles.small),
            ),
          ],
        ],
      ),
    );
  }
}

/// Loaded or Empty: green when it is the recorded answer.
class _LoadChoice extends StatelessWidget {
  const _LoadChoice({
    required this.status,
    required this.selected,
    required this.sending,
    required this.onPressed,
  });

  final LoadStatus status;
  final bool selected;
  final bool sending;

  /// Null while an answer is being sent.
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final label = sending ? 'Sending…' : status.label;
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        backgroundColor: selected ? AppColors.green : AppColors.surface,
        foregroundColor: selected ? Colors.white : AppColors.forest,
        disabledBackgroundColor: selected ? AppColors.green : AppColors.surface,
        disabledForegroundColor: selected ? Colors.white : AppColors.inkHalf,
        side: BorderSide(
          color: selected ? AppColors.green : AppColors.cardBorder,
          width: 1.5,
        ),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(24)),
        ),
        textStyle: ResultTextStyles.button.copyWith(fontSize: 14),
      ),
      // Read out as the chosen answer.
      child: Semantics(
        selected: selected,
        child: Text(label, textAlign: TextAlign.center),
      ),
    );
  }
}

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
      (
        AssetPaths.iconResultTrip,
        'CHL trip status',
        VerificationResultScreen.tripStatus(result.tripStatus),
      ),
    ];
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: resultCardDecoration(),
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
                          Text(rows[i].$2, style: ResultTextStyles.small),
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

/// "Trip validity countdown", ticking every second.
class _Countdown extends ConsumerWidget {
  const _Countdown({required this.trip});

  final ChlTrip trip;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now =
        ref.watch(secondTickerProvider).value ?? ref.watch(clockProvider)();
    return TripDefinition(
      label: 'Trip validity countdown',
      value: VerificationResultScreen.countdown(trip.remainingAt(now)),
      large: true,
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
      decoration: resultCardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: const Text(
              'Destination check',
              style: ResultTextStyles.sectionTitle,
            ),
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
            ResultDetailRow(
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
                textStyle: ResultTextStyles.button,
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
                  textStyle: ResultTextStyles.button,
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
                textStyle: ResultTextStyles.button,
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
