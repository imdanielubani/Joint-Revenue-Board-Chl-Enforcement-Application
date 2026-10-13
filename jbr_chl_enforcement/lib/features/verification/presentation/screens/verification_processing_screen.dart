import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/extensions/context_extensions.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/clock.dart';
import '../../../../shared/ui/widgets/header_icon_button.dart';
import '../../../notifications/presentation/providers/notifications_controller.dart';
import '../../data/repositories/verification_repository_impl.dart';
import '../../domain/entities/plate_number.dart';
import '../../domain/entities/scanned_qr.dart';
import '../../domain/entities/unresolved_verification.dart';
import '../../domain/entities/verification_request.dart';
import '../../domain/repositories/verification_repository.dart';
import '../widgets/verification_page.dart';

/// "Verification processing": checks the vehicle in [request] with CHL,
/// showing each check as it runs (identifying the vehicle, validating the
/// E-Tag, checking the CHL trip), then opens the result. Cancel abandons
/// it. When CHL has no such vehicle, or cannot be reached, the result page
/// says so instead.
class VerificationProcessingScreen extends ConsumerStatefulWidget {
  const VerificationProcessingScreen({super.key, required this.request});

  final VerificationRequest request;

  /// How long the finished checks stay on screen before the result opens.
  static const Duration finishedPause = Duration(milliseconds: 600);

  @override
  ConsumerState<VerificationProcessingScreen> createState() =>
      _VerificationProcessingScreenState();
}

class _VerificationProcessingScreenState
    extends ConsumerState<VerificationProcessingScreen> {
  StreamSubscription<VerificationProgress>? _progress;
  Timer? _openResult;

  VerificationStage? _stage;
  final Set<VerificationStage> _done = {};
  PlateNumber? _plate;

  @override
  void initState() {
    super.initState();
    _plate = widget.request.plate;
    _start();
  }

  @override
  void dispose() {
    _openResult?.cancel();
    unawaited(_progress?.cancel());
    super.dispose();
  }

  void _start() {
    _progress = ref
        .read(verificationRepositoryProvider)
        .verify(widget.request)
        .listen(
          _onProgress,
          // Whatever went wrong, nothing was concluded.
          onError: (Object _) => _showUnresolved(
            VerificationUnavailable(
              request: widget.request,
              checkedAt: ref.read(clockProvider)(),
            ),
          ),
          cancelOnError: true,
        );
  }

  /// Replaces this page with the result page for a verification that
  /// ended without a vehicle result.
  void _showUnresolved(UnresolvedVerification outcome) {
    if (!mounted) return;
    context.pushReplacementNamed(RouteNames.verificationResult, extra: outcome);
  }

  void _onProgress(VerificationProgress progress) {
    if (!mounted) return;
    switch (progress) {
      case StageStarted(:final stage):
        setState(() {
          // Every earlier check is finished.
          _done.addAll(VerificationStage.values.take(stage.index));
          _stage = stage;
        });
      case VehicleIdentified(:final plate):
        setState(() => _plate = plate);
      case NoVehicleFound(:final location):
        _showUnresolved(
          VehicleNotFound(
            request: widget.request,
            checkedAt: ref.read(clockProvider)(),
            location: location,
          ),
        );
      case VerificationCompleted(:final result):
        setState(() {
          _done.addAll(VerificationStage.values);
          _stage = null;
        });
        _openResult = Timer(VerificationProcessingScreen.finishedPause, () {
          if (!mounted) return;
          context.pushReplacementNamed(
            RouteNames.verificationResult,
            extra: result,
          );
        });
    }
  }

  void _cancel() {
    _openResult?.cancel();
    unawaited(_progress?.cancel());
    context.popOrGoHome();
  }

  /// The plate once known; until a scanned code is looked up, what was
  /// scanned.
  String get _badge =>
      _plate?.display ??
      switch (widget.request) {
        QrVerification(code: ScannedQr(kind: ScannedQrKind.eTag)) => 'E-Tag QR',
        _ => 'Receipt QR',
      };

  @override
  Widget build(BuildContext context) {
    final unread = ref.watch(unreadNotificationCountProvider);

    return VerificationPageScaffold(
      title: 'Verification processing',
      trailing: HeaderIconButton(
        iconAsset: AssetPaths.iconBell,
        semanticLabel: unread > 0
            ? 'Notifications, $unread unread'
            : 'Notifications',
        badgeCount: unread,
        onPressed: () => context.goNamed(RouteNames.notifications),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                VerificationContentWidth(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const VerificationHeading(
                        heading: 'Checking vehicle…',
                        description:
                            'Vehicle identity, E-Tag validation and CHL trip '
                            'status\nare checked together.',
                      ),
                      const SizedBox(height: 49),
                      _StatusCard(badge: _badge, stage: _stage, done: _done),
                    ],
                  ),
                ),
              ],
            ),
          ),
          VerificationContentWidth(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
              child: _FilledButton(
                label: 'Cancel Verification',
                onPressed: _cancel,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The white card: turning icon, plate, and the three checks.
class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.badge,
    required this.stage,
    required this.done,
  });

  final String badge;
  final VerificationStage? stage;
  final Set<VerificationStage> done;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 19, vertical: 32),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border.fromBorderSide(
          BorderSide(color: AppColors.cardBorder, width: 1.5),
        ),
        borderRadius: BorderRadius.all(Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              color: AppColors.activityRing,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: const _Turning(
              child: _Svg(AssetPaths.iconProcessingChecking, size: 40),
            ),
          ),
          const SizedBox(height: 17),
          Container(
            constraints: const BoxConstraints(minHeight: 48),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border.fromBorderSide(
                BorderSide(color: AppColors.forest, width: 1.5),
              ),
              borderRadius: BorderRadius.all(Radius.circular(8)),
            ),
            child: Text(
              badge,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 21,
                fontWeight: AppTypography.semiBold,
                letterSpacing: -0.315,
                height: 29.4 / 21,
                color: AppColors.forest,
              ),
            ),
          ),
          const SizedBox(height: 21),
          Semantics(
            liveRegion: true,
            child: Column(
              children: [
                const Text(
                  'Verifying vehicle',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: AppTypography.fontFamily,
                    fontSize: 20,
                    fontWeight: AppTypography.semiBold,
                    letterSpacing: 0,
                    height: 28 / 20,
                    color: AppColors.processingText,
                  ),
                ),
                const Text(
                  'Waiting for CHL confirmation',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: AppTypography.fontFamily,
                    fontSize: 13,
                    fontWeight: AppTypography.regular,
                    letterSpacing: 0,
                    height: 20 / 13,
                    color: AppColors.inkHalf,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 37),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final step in VerificationStage.values) ...[
                  if (step.index > 0) const SizedBox(height: 12),
                  _Step(
                    label: step.label,
                    state: done.contains(step)
                        ? _StepState.done
                        : step == stage
                        ? _StepState.active
                        : _StepState.pending,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

enum _StepState { pending, active, done }

/// One check: its disc (dot, spinner or tick) and its name.
class _Step extends StatelessWidget {
  const _Step({required this.label, required this.state});

  final String label;
  final _StepState state;

  @override
  Widget build(BuildContext context) {
    final (Color disc, Widget mark, String status) = switch (state) {
      _StepState.pending => (
        AppColors.stepPending,
        Container(
          width: 8,
          height: 8,
          decoration: const BoxDecoration(
            color: AppColors.stepPendingDot,
            shape: BoxShape.circle,
          ),
        ),
        'waiting',
      ),
      _StepState.active => (
        AppColors.stepActive,
        const _Turning(
          child: _Svg(AssetPaths.iconProcessingStepActive, size: 20),
        ),
        'in progress',
      ),
      _StepState.done => (
        AppColors.stepDone,
        const _Svg(AssetPaths.iconProcessingStepDone, size: 20),
        'done',
      ),
    };

    return Semantics(
      container: true,
      label: '$label, $status',
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(color: disc, shape: BoxShape.circle),
            alignment: Alignment.center,
            child: mark,
          ),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 14,
                fontWeight: state == _StepState.pending
                    ? AppTypography.regular
                    : AppTypography.medium,
                letterSpacing: 0,
                height: 22 / 14,
                color: state == _StepState.pending
                    ? AppColors.stepPendingText
                    : AppColors.processingText,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Turns [child] round and round.
class _Turning extends StatefulWidget {
  const _Turning({required this.child});

  final Widget child;

  @override
  State<_Turning> createState() => _TurningState();
}

class _TurningState extends State<_Turning>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      RotationTransition(turns: _controller, child: widget.child);
}

class _Svg extends StatelessWidget {
  const _Svg(this.asset, {required this.size});

  final String asset;
  final double size;

  @override
  Widget build(BuildContext context) => SvgPicture.asset(
    asset,
    width: size,
    height: size,
    excludeFromSemantics: true,
  );
}

/// Green 54 px button.
class _FilledButton extends StatelessWidget {
  const _FilledButton({required this.label, required this.onPressed});

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
        textStyle: const TextStyle(
          fontFamily: AppTypography.fontFamily,
          fontSize: 16,
          fontWeight: AppTypography.semiBold,
          letterSpacing: 0,
        ),
      ),
      child: Text(label, textAlign: TextAlign.center),
    );
  }
}
