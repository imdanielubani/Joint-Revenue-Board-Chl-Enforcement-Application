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
import '../../../../shared/ui/widgets/screen_heading.dart';
import '../../../auth/presentation/providers/session_provider.dart';
import '../../../notifications/presentation/widgets/notifications_bell.dart';
import '../../../verification/domain/entities/unresolved_verification.dart';
import '../../../verification/domain/entities/verification_request.dart';
import '../../../verification/presentation/widgets/verification_page.dart';
import '../../../verification_history/domain/entities/verification_record_details.dart';
import '../widgets/trip_details_card.dart';

/// "Verification result" for a verification that ended without a result
/// for a vehicle:
/// - [VehicleNotFound]: "Vehicle Not Found", what was checked, the
///   verification details on demand, and Check Plate Again;
/// - [VerificationUnavailable]: "Verification Unavailable", that nothing
///   was concluded, Try again and Choose another method.
class UnresolvedVerificationScreen extends ConsumerWidget {
  const UnresolvedVerificationScreen({super.key, required this.outcome});

  final UnresolvedVerification outcome;

  /// "Checked just now", "Checked 5 min ago", then the time.
  static String checkedAgo(DateTime checkedAt, DateTime now) {
    final elapsed = now.difference(checkedAt);
    if (elapsed.inMinutes < 1) return 'Checked just now';
    if (elapsed.inMinutes < 60) return 'Checked ${elapsed.inMinutes} min ago';
    return 'Checked at ${DateFormat('HH:mm').format(checkedAt)}';
  }

  /// "3 Oct 2026, 09:41".
  static String checkedAt(DateTime at) =>
      DateFormat('d MMM yyyy, HH:mm').format(at);

  /// "6.6018° N, 3.3515° E".
  static String gps(RecordLocation location) {
    String part(double value, String positive, String negative) =>
        '${value.abs().toStringAsFixed(4)}° '
        '${value < 0 ? negative : positive}';
    return '${part(location.latitude, 'N', 'S')}, '
        '${part(location.longitude, 'E', 'W')}';
  }

  /// How the request was made.
  static String method(VerificationRequest request) => switch (request) {
    PlateVerification() => 'Manual plate',
    QrVerification() => 'QR code',
    TagVerification() => 'Haulage tag',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now =
        ref.watch(secondTickerProvider).value ?? ref.watch(clockProvider)();
    final request = outcome.request;
    final scanned = request is! PlateVerification;
    final checked = checkedAgo(outcome.checkedAt, now);

    final List<Widget> content;
    final List<Widget> actions;
    switch (outcome) {
      case VehicleNotFound(:final location):
        content = [
          const _OutcomeIcon(AssetPaths.iconResultNotFound),
          const SizedBox(height: 11),
          ScreenHeading(
            heading: 'Vehicle Not Found',
            description: switch (request) {
              PlateVerification() =>
                'We couldn’t find a vehicle for this plate. Check the '
                    'number and try again.',
              QrVerification() =>
                'We couldn’t find a vehicle for this code. Scan it again '
                    'or enter the plate instead.',
              TagVerification() =>
                'We couldn’t find a vehicle for this tag. Read it again '
                    'or enter the plate instead.',
            },
          ),
          const SizedBox(height: 16),
          _Checked(checked),
          const SizedBox(height: 20),
          _RequestPill(request),
          const SizedBox(height: 26),
          const _Summary(
            vehicle: 'Not resolved',
            eTag: 'Not verified',
            trip: 'Not resolved',
          ),
          const SizedBox(height: 16),
          _VerificationDetails(
            rows: [
              ('Verification method', method(request)),
              ('Checked at', checkedAt(outcome.checkedAt)),
              ('GPS', location == null ? 'Not recorded' : gps(location)),
              (
                'Agent',
                ref.watch(sessionProvider)?.officer.name ?? 'Not recorded',
              ),
            ],
          ),
        ];
        actions = [
          if (scanned)
            ResultFilledButton(
              label: 'Enter Plate Instead',
              onPressed: () =>
                  context.pushReplacementNamed(RouteNames.manualPlate),
            )
          else
            ResultFilledButton(
              label: 'Check Plate Again',
              // Back to plate entry, the plate still typed in.
              onPressed: () => context.canPop()
                  ? context.pop()
                  : context.goNamed(RouteNames.manualPlate),
            ),
        ];
      case VerificationUnavailable():
        content = [
          const _OutcomeIcon(AssetPaths.iconResultUnavailable),
          const SizedBox(height: 11),
          const ScreenHeading(
            heading: 'Verification Unavailable',
            description:
                'CHL verification could not be completed. Please retry when '
                'the service or connection is available.',
          ),
          const SizedBox(height: 16),
          _Checked(checked),
          const SizedBox(height: 20),
          _RequestPill(request),
          const SizedBox(height: 18),
          const _Note(
            'No trip conclusion has been made. This is not a No Active Trip '
            'or invalid E-Tag finding.',
          ),
          const SizedBox(height: 26),
          const _Summary(
            vehicle: 'Not verified',
            eTag: 'Not verified',
            trip: 'Not resolved',
          ),
        ];
        actions = [
          _RoundedButton(
            label: 'Try again',
            filled: true,
            onPressed: () => context.pushReplacementNamed(
              RouteNames.verificationProcessing,
              extra: request,
            ),
          ),
          const SizedBox(height: 10),
          _RoundedButton(
            label: 'Choose another method',
            filled: false,
            onPressed: () => context.goNamed(RouteNames.verifyTrip),
          ),
        ];
    }

    return VerificationPageScaffold(
      title: 'Verification result',
      trailing: const NotificationsBell(),
      body: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 15, 16, 0),
            sliver: SliverToBoxAdapter(
              child: VerificationContentWidth(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: content,
                ),
              ),
            ),
          ),
          // The buttons sit at the bottom of the page, or under the content
          // when the page scrolls.
          SliverFillRemaining(
            hasScrollBody: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 22, 16, 16),
              child: Align(
                alignment: Alignment.bottomCenter,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: VerificationPageScaffold.maxContentWidth,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: actions,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The 58 px brown disc with the outcome's icon.
class _OutcomeIcon extends StatelessWidget {
  const _OutcomeIcon(this.asset);

  final String asset;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: Container(
        width: 58,
        height: 58,
        decoration: const BoxDecoration(
          color: AppColors.unresolvedIconFill,
          shape: BoxShape.circle,
        ),
        alignment: Alignment.center,
        child: SvgPicture.asset(
          asset,
          width: 32,
          height: 32,
          excludeFromSemantics: true,
        ),
      ),
    );
  }
}

/// "Checked just now".
class _Checked extends StatelessWidget {
  const _Checked(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(text, style: ResultTextStyles.small);
  }
}

/// What was checked: the plate as entered, or that a QR code was scanned
/// or a haulage tag read.
class _RequestPill extends StatelessWidget {
  const _RequestPill(this.request);

  final VerificationRequest request;

  @override
  Widget build(BuildContext context) {
    final request = this.request;
    final (String text, String semantics) = switch (request) {
      PlateVerification(:final plate) => (
        plate.display,
        'Plate ${plate.display}',
      ),
      QrVerification() => ('QR code', 'Scanned QR code'),
      TagVerification() => ('Haulage tag', 'Haulage tag read by RFID'),
    };
    return Semantics(
      container: true,
      label: semantics,
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.greenTint,
          border: Border.all(color: Colors.black),
          borderRadius: const BorderRadius.all(Radius.circular(24)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SvgPicture.asset(
              switch (request) {
                PlateVerification() => AssetPaths.iconResultPlateKeyboard,
                QrVerification() => AssetPaths.iconMethodQr,
                TagVerification() => AssetPaths.iconRfidReader,
              },
              width: 20,
              height: 20,
              excludeFromSemantics: true,
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                text,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 14,
                  fontWeight: AppTypography.semiBold,
                  letterSpacing: 0,
                  height: 21 / 14,
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

/// A pale green note, centred.
class _Note extends StatelessWidget {
  const _Note(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: const BoxDecoration(
        color: AppColors.greenTint,
        borderRadius: BorderRadius.all(Radius.circular(16)),
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: ResultTextStyles.small.copyWith(height: 19.2 / 12),
      ),
    );
  }
}

/// Vehicle identity, E-Tag validity and CHL trip status, none concluded.
class _Summary extends StatelessWidget {
  const _Summary({
    required this.vehicle,
    required this.eTag,
    required this.trip,
  });

  final String vehicle;
  final String eTag;
  final String trip;

  @override
  Widget build(BuildContext context) {
    final rows = [
      (AssetPaths.iconResultVehicle, 'Vehicle identity', vehicle),
      (AssetPaths.iconResultETag, 'E-Tag validity', eTag),
      (AssetPaths.iconResultTrip, 'CHL trip status', trip),
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
                    : const BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: AppColors.cardBorder,
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

/// "Verification details": how, when, where and by whom, opened on
/// demand.
class _VerificationDetails extends StatefulWidget {
  const _VerificationDetails({required this.rows});

  final List<(String, String)> rows;

  @override
  State<_VerificationDetails> createState() => _VerificationDetailsState();
}

class _VerificationDetailsState extends State<_VerificationDetails> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final rows = widget.rows;
    void toggle() => setState(() => _open = !_open);

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: resultCardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            container: true,
            button: true,
            expanded: _open,
            label: 'Verification details',
            // Excluding the children drops their tap, so it is declared here.
            onTap: toggle,
            excludeSemantics: true,
            child: InkWell(
              onTap: toggle,
              child: Container(
                constraints: const BoxConstraints(minHeight: 52),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                alignment: AlignmentDirectional.centerStart,
                child: const Text(
                  'Verification details',
                  style: TextStyle(
                    fontFamily: AppTypography.fontFamily,
                    fontSize: 14,
                    fontWeight: AppTypography.bold,
                    letterSpacing: 0,
                    color: AppColors.forest,
                  ),
                ),
              ),
            ),
          ),
          if (_open)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (var i = 0; i < rows.length; i++)
                    ResultDetailRow(
                      label: rows[i].$1,
                      value: rows[i].$2,
                      labelColor: AppColors.moss,
                      divider: i < rows.length - 1
                          ? AppColors.cardBorder
                          : null,
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// 52 px fully rounded button: green, or white with a black outline.
class _RoundedButton extends StatelessWidget {
  const _RoundedButton({
    required this.label,
    required this.filled,
    required this.onPressed,
  });

  final String label;
  final bool filled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    const shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(28)),
    );
    const padding = EdgeInsets.symmetric(horizontal: 18, vertical: 13);
    final text = Text(label, textAlign: TextAlign.center);
    if (filled) {
      return FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          minimumSize: const Size(double.infinity, 52),
          padding: padding,
          backgroundColor: AppColors.green,
          foregroundColor: Colors.white,
          shape: shape,
          textStyle: const TextStyle(
            fontFamily: AppTypography.fontFamily,
            fontSize: 14,
            fontWeight: AppTypography.semiBold,
            letterSpacing: 0,
            height: 18.9 / 14,
          ),
        ),
        child: text,
      );
    }
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        padding: padding,
        backgroundColor: AppColors.surface,
        foregroundColor: Colors.black,
        side: const BorderSide(width: 1.5),
        shape: shape,
        textStyle: const TextStyle(
          fontFamily: AppTypography.fontFamily,
          fontSize: 14,
          fontWeight: AppTypography.bold,
          letterSpacing: 0,
          height: 18.9 / 14,
        ),
      ),
      child: text,
    );
  }
}
