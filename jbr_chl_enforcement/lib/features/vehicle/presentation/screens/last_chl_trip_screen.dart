import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../verification/presentation/widgets/verification_page.dart';
import '../../domain/entities/verification_result.dart';
import '../widgets/trip_details_card.dart';

/// "Last CHL trip": the vehicle's most recent earlier trip, opened from a
/// result with no active trip. It is historical, so there is no countdown
/// and its status stays as CHL reported it. Return To Result goes back;
/// Return to Dashboard ends the check.
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

    return VerificationPageScaffold(
      title: 'Last CHL trip',
      trailing: const ResultNotificationsButton(),
      body: result == null || trip == null
          ? const EmptyState(
              title: 'Last CHL trip',
              message: 'There is no earlier trip to show.',
            )
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
                        onPressed: () => context.canPop()
                            ? context.pop()
                            : context.goNamed(
                                RouteNames.verificationResult,
                                extra: result,
                              ),
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
