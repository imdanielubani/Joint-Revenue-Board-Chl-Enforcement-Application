import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../notifications/presentation/widgets/notifications_bell.dart';
import '../../../verification/presentation/widgets/verification_page.dart';
import '../../domain/entities/verification_result.dart';
import '../widgets/trip_details_card.dart';

/// "Last CHL trip": the vehicle's most recent earlier trip, opened from a
/// result with no active trip. It is historical, so there is no countdown
/// and its status stays as CHL reported it. Return To Result goes back;
/// Return to Dashboard ends the check. When CHL returned no earlier trip it
/// says "No Trip History", with Return To Verification.
class LastChlTripScreen extends StatelessWidget {
  const LastChlTripScreen({super.key, this.result});

  /// The verification whose last trip is shown; null when the page is
  /// opened without one.
  final VerificationResult? result;

  @override
  Widget build(BuildContext context) {
    final result = this.result;
    final trip = result?.lastTrip;
    void toDashboard() => context.goNamed(RouteNames.dashboard);
    void backToResult() => context.canPop()
        ? context.pop()
        : context.goNamed(RouteNames.verificationResult, extra: result);

    return VerificationPageScaffold(
      title: 'Last CHL trip',
      trailing: const NotificationsBell(),
      body: result == null
          ? const EmptyState(
              title: 'Last CHL trip',
              message: 'There is no earlier trip to show.',
            )
          : trip == null
          ? _NoTripHistory(onReturn: backToResult)
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
              children: [
                VerificationContentWidth(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const VerificationHeading(
                        heading: 'Last CHL trip',
                        description:
                            'Only the most recent historical trip is shown. '
                            'This is not an active trip.',
                      ),
                      const SizedBox(height: 16),
                      TripDetailsCard(
                        heading: 'Current trip',
                        plate: result.plate,
                        vehicleType: result.vehicleType,
                        trip: trip,
                        historical: true,
                        validity: _HistoricalValidity(
                          completedAt: trip.completedAt,
                        ),
                      ),
                      const SizedBox(height: 24),
                      ResultFilledButton(
                        label: 'Return To Result',
                        onPressed: backToResult,
                      ),
                      const SizedBox(height: 10),
                      ResultTextButton(
                        label: 'Return to Dashboard',
                        onPressed: toDashboard,
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

/// "No Trip History": CHL returned no earlier trip for the vehicle, so
/// nothing is shown or made up.
class _NoTripHistory extends StatelessWidget {
  const _NoTripHistory({required this.onReturn});

  final VoidCallback onReturn;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, box) => SingleChildScrollView(
        // Capped in width first, so the height is measured at the width the
        // content really has.
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: VerificationPageScaffold.maxContentWidth + 32,
              minHeight: box.maxHeight,
            ),
            child: IntrinsicHeight(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const VerificationHeading(
                      heading: 'No Trip History',
                      description:
                          'CHL returned no previous trip for this vehicle.',
                    ),
                    const SizedBox(height: 24),
                    Expanded(
                      child: Center(
                        child: Semantics(
                          container: true,
                          liveRegion: true,
                          label: 'No Trip History',
                          excludeSemantics: true,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 76,
                                height: 76,
                                padding: const EdgeInsets.only(top: 2),
                                decoration: const BoxDecoration(
                                  color: AppColors.greenTint,
                                  shape: BoxShape.circle,
                                ),
                                alignment: Alignment.center,
                                child: SvgPicture.asset(
                                  AssetPaths.iconResultNoTripHistory,
                                  width: 30,
                                  height: 30,
                                  excludeFromSemantics: true,
                                ),
                              ),
                              const SizedBox(height: 22),
                              const Text(
                                'No Trip History',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontFamily: AppTypography.fontFamily,
                                  fontSize: 16,
                                  fontWeight: AppTypography.regular,
                                  letterSpacing: 0,
                                  height: 24.8 / 16,
                                  color: AppColors.forest,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ResultFilledButton(
                      label: 'Return To Verification',
                      onPressed: onReturn,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Where the countdown would be: why there is none, and when the trip was
/// completed.
class _HistoricalValidity extends StatelessWidget {
  const _HistoricalValidity({required this.completedAt});

  final DateTime? completedAt;

  @override
  Widget build(BuildContext context) {
    final completedAt = this.completedAt;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const TripDefinition(
          label: 'Trip validity countdown',
          value: 'Historical · no running countdown',
          note:
              'Historical status is retained from the response; elapsed '
              'time does not reclassify this trip.',
          divider: AppColors.syncDivider,
        ),
        if (completedAt != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              'Completion recorded ${tripDateTime(completedAt)}.',
              style: ResultTextStyles.note,
            ),
          ),
        const SizedBox(height: 9),
      ],
    );
  }
}
