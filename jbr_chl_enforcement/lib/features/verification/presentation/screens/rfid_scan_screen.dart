import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/clock.dart';
import '../../../../shared/device/rfid/rfid_reader_adapter.dart';
import '../../../../shared/ui/widgets/screen_heading.dart';
import '../../../notifications/presentation/widgets/notifications_bell.dart';
import '../../data/repositories/verification_repository_impl.dart';
import '../../domain/entities/haulage_tag.dart';
import '../../domain/entities/unresolved_verification.dart';
import '../../domain/entities/verification_request.dart';
import '../../domain/repositories/verification_repository.dart';
import '../widgets/verification_page.dart';

/// Where RFID verification stands on the page.
enum RfidReaderPhase {
  /// Not detected yet: "Connection not checked".
  notChecked,

  /// Looking for the reader.
  detecting,

  /// Found: the haulage tag can be read.
  connected,

  /// Not found.
  disconnected,

  /// The reader stopped answering during a scan; nothing was concluded.
  communicationError,

  /// Waiting for a haulage tag to come into range.
  scanning,

  /// A JRB tag was read; not yet a verified vehicle.
  tagDetected,

  /// The tag read is not a JRB haulage tag.
  unknownTag,

  /// Verifying the tag with CHL.
  verifying,
}

/// "RFID verification" (Haulage tag on Verify CHL Trip): detects the RFID
/// reader connected to the device, reads a haulage tag, and verifies it
/// like a plate, ending in the verification result. Stop abandons a
/// detection, scan or verification. When no reader is found, or it stops
/// answering, it says so and offers to detect again or continue by plate;
/// a tag that is not JRB's is not verified at all.
class RfidScanScreen extends ConsumerStatefulWidget {
  const RfidScanScreen({super.key});

  @override
  ConsumerState<RfidScanScreen> createState() => _RfidScanScreenState();
}

class _RfidScanScreenState extends ConsumerState<RfidScanScreen> {
  RfidReaderPhase _phase = RfidReaderPhase.notChecked;

  /// Counts reader requests, so the answer to a stopped one is ignored.
  int _request = 0;

  /// The tag read, until it is verified.
  HaulageTag? _tag;

  StreamSubscription<VerificationProgress>? _verification;

  @override
  void dispose() {
    unawaited(_verification?.cancel());
    super.dispose();
  }

  void _show(RfidReaderPhase phase) => setState(() => _phase = phase);

  void _reportReader({required bool connected}) =>
      ref.read(rfidReaderStatusProvider.notifier).report(connected: connected);

  Future<void> _detect() async {
    final request = ++_request;
    _show(RfidReaderPhase.detecting);
    final connected = await ref.read(rfidReaderProvider).detect();
    if (!mounted || request != _request) return;
    _reportReader(connected: connected);
    _show(connected ? RfidReaderPhase.connected : RfidReaderPhase.disconnected);
  }

  Future<void> _scan() async {
    final request = ++_request;
    _show(RfidReaderPhase.scanning);
    try {
      final tag = HaulageTag(await ref.read(rfidReaderProvider).readTag());
      if (!mounted || request != _request) return;
      // A tag that is not JRB's is never sent to CHL.
      _tag = tag.isJrb ? tag : null;
      _show(
        tag.isJrb ? RfidReaderPhase.tagDetected : RfidReaderPhase.unknownTag,
      );
    } on RfidReaderLost {
      if (!mounted || request != _request) return;
      _reportReader(connected: false);
      _show(RfidReaderPhase.communicationError);
    }
  }

  void _verify() {
    final tag = _tag;
    if (tag == null) return;
    final request = TagVerification(tag);
    _show(RfidReaderPhase.verifying);
    _verification = ref
        .read(verificationRepositoryProvider)
        .verify(request)
        .listen(
          (progress) => switch (progress) {
            VerificationCompleted(:final result) => _open(result),
            NoVehicleFound(:final location) => _open(
              VehicleNotFound(
                request: request,
                checkedAt: ref.read(clockProvider)(),
                location: location,
              ),
            ),
            // The checks run unseen here; the card shows they are running.
            StageStarted() || VehicleIdentified() => null,
          },
          // Whatever went wrong, nothing was concluded.
          onError: (Object _) => _open(
            VerificationUnavailable(
              request: request,
              checkedAt: ref.read(clockProvider)(),
            ),
          ),
          cancelOnError: true,
        );
  }

  /// Replaces this page with the result, so back returns to the methods.
  void _open(Object outcome) {
    if (!mounted) return;
    context.pushReplacementNamed(RouteNames.verificationResult, extra: outcome);
  }

  /// Stops what is running and goes back a step.
  void _stop() {
    _request++;
    unawaited(_verification?.cancel());
    _verification = null;
    _show(switch (_phase) {
      RfidReaderPhase.scanning => RfidReaderPhase.connected,
      RfidReaderPhase.verifying => RfidReaderPhase.tagDetected,
      _ => RfidReaderPhase.notChecked,
    });
  }

  void _enterPlate() => context.pushReplacementNamed(RouteNames.manualPlate);

  void _chooseAnotherMethod() => context.goNamed(RouteNames.verifyTrip);

  @override
  Widget build(BuildContext context) {
    final (String heading, String description) = switch (_phase) {
      RfidReaderPhase.notChecked => (
        'Detect RFID reader',
        'Connect the reader to your device, then tap Detect reader.',
      ),
      RfidReaderPhase.detecting => (
        'Detecting your reader',
        'Checking the RFID reader already connected to your device.',
      ),
      RfidReaderPhase.connected => (
        'Reader detected',
        'The reader is connected. Select Start scanning to read a haulage '
            'tag.',
      ),
      RfidReaderPhase.disconnected => (
        'RFID Reader Disconnected',
        'Check the cable or approved reader connection, then detect the '
            'reader again. You can continue by plate number.',
      ),
      RfidReaderPhase.communicationError => (
        'Reader communication unavailable',
        'The reader could not complete the scan. Reconnect and retry, or '
            'verify by plate. No tag or trip finding has been made.',
      ),
      RfidReaderPhase.unknownTag => (
        'Tag Not Part of JRB CHL Architecture',
        'This local confirmed response identifies an unknown tag. Vehicle '
            'identity and CHL trip status remain unconfirmed.',
      ),
      RfidReaderPhase.scanning => (
        'Scanning for haulage tag',
        'Hold the reader near the physical E-Tag. Keep other vehicle tags '
            'outside the reading area.',
      ),
      RfidReaderPhase.tagDetected => (
        'Haulage tag detected',
        'A tag was detected. Verify it to resolve the vehicle, validate the '
            'E-Tag and check its CHL trip.',
      ),
      RfidReaderPhase.verifying => (
        'Haulage tag detected',
        'Resolving vehicle identity, E-Tag validation and CHL trip status '
            'through the shared verification response.',
      ),
    };

    final chooseAnotherMethod = _RfidButton.outlined(
      'Choose Another Method',
      onPressed: _chooseAnotherMethod,
    );
    final enterPlate = _RfidButton.outlined(
      'Enter Plate Instead',
      onPressed: _enterPlate,
    );
    final List<Widget> actions = switch (_phase) {
      RfidReaderPhase.notChecked => [
        _RfidButton.filled('Detect Reader', onPressed: _detect),
        enterPlate,
        chooseAnotherMethod,
      ],
      RfidReaderPhase.detecting ||
      RfidReaderPhase.scanning ||
      RfidReaderPhase.verifying => [
        _RfidButton.filled('Stop', onPressed: _stop),
        chooseAnotherMethod,
      ],
      RfidReaderPhase.connected => [
        _RfidButton.filled('Start Scanning', onPressed: _scan),
        chooseAnotherMethod,
      ],
      RfidReaderPhase.tagDetected => [
        _RfidButton.filled('Verify Detected Tag', onPressed: _verify),
        chooseAnotherMethod,
      ],
      RfidReaderPhase.disconnected || RfidReaderPhase.communicationError => [
        _RfidButton.filled(
          'Detect Reader Again',
          color: AppColors.rfidDanger,
          onPressed: _detect,
        ),
        enterPlate,
        chooseAnotherMethod,
      ],
      RfidReaderPhase.unknownTag => [
        _RfidButton.filled('Scan Another Tag', onPressed: _scan),
        enterPlate,
        chooseAnotherMethod,
      ],
    };

    return VerificationPageScaffold(
      title: 'RFID verification',
      trailing: const NotificationsBell(),
      body: LayoutBuilder(
        builder: (context, box) => SingleChildScrollView(
          // Capped in width first, so the height is measured at the width
          // the content really has.
          child: Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: VerificationPageScaffold.maxContentWidth + 32,
                minHeight: box.maxHeight,
              ),
              child: IntrinsicHeight(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Padding(
                        // The heading sits a little further in, as designed.
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: ScreenHeading(
                          heading: heading,
                          description: description,
                        ),
                      ),
                      const SizedBox(height: 24),
                      // The reader sits in the middle of the free space.
                      Expanded(
                        child: Center(child: _ReaderPanel(phase: _phase)),
                      ),
                      const SizedBox(height: 24),
                      for (var i = 0; i < actions.length; i++) ...[
                        if (i > 0) const SizedBox(height: 13),
                        actions[i],
                      ],
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
}

/// The reader: its icon, "RFID reader" and its status; and a note under it
/// when it is disconnected or has read a tag.
class _ReaderPanel extends StatelessWidget {
  const _ReaderPanel({required this.phase});

  final RfidReaderPhase phase;

  @override
  Widget build(BuildContext context) {
    if (phase == RfidReaderPhase.notChecked) {
      // Before detection the reader is shown without a card.
      return Semantics(
        container: true,
        liveRegion: true,
        label: 'RFID reader, Connection not checked',
        excludeSemantics: true,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 26),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const _ReaderIcon(
                size: 76,
                asset: AssetPaths.iconRfidReader,
                disc: AppColors.greenTint,
              ),
              const SizedBox(height: 12),
              const Text('RFID reader', style: _Styles.readerTitle),
              const SizedBox(height: 12),
              Text(
                'Connection not checked',
                textAlign: TextAlign.center,
                style: _Styles.readerTitle.copyWith(
                  fontSize: 15,
                  fontWeight: AppTypography.regular,
                  color: AppColors.forest,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'We’ll detect the reader already connected to this device.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 15,
                  fontWeight: AppTypography.regular,
                  letterSpacing: 0,
                  height: 24.8 / 15,
                  color: Colors.black,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final (Color dot, String status) = switch (phase) {
      RfidReaderPhase.detecting => (AppColors.rfidDetecting, 'Detecting'),
      RfidReaderPhase.disconnected => (
        AppColors.rfidDisconnected,
        'Disconnected',
      ),
      RfidReaderPhase.communicationError => (
        AppColors.rfidDisconnected,
        'Communication error',
      ),
      _ => (AppColors.rfidConnected, 'Connected'),
    };
    final (String icon, Color disc) = switch (phase) {
      RfidReaderPhase.disconnected => (
        AssetPaths.iconRfidReaderDisconnected,
        AppColors.rfidDangerTint,
      ),
      RfidReaderPhase.communicationError => (
        AssetPaths.iconRfidCommunicationError,
        AppColors.rfidDangerTint,
      ),
      RfidReaderPhase.unknownTag => (
        AssetPaths.iconRfidUnknownTag,
        AppColors.greenTint,
      ),
      RfidReaderPhase.scanning => (
        AssetPaths.iconRfidReader,
        AppColors.rfidScanningDisc,
      ),
      RfidReaderPhase.tagDetected => (
        AssetPaths.iconRfidTagDetected,
        AppColors.greenTint,
      ),
      RfidReaderPhase.verifying => (
        AssetPaths.iconRfidVerifying,
        AppColors.greenTint,
      ),
      _ => (AssetPaths.iconRfidReader, AppColors.greenTint),
    };
    final busy = switch (phase) {
      RfidReaderPhase.detecting ||
      RfidReaderPhase.scanning ||
      RfidReaderPhase.verifying => true,
      _ => false,
    };

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          container: true,
          liveRegion: true,
          label: 'RFID reader, $status',
          excludeSemantics: true,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 26),
            decoration: BoxDecoration(
              color: AppColors.surface,
              border: Border.all(color: AppColors.rfidCardBorder, width: 1.5),
              borderRadius: const BorderRadius.all(Radius.circular(24)),
            ),
            child: Column(
              children: [
                _ReaderIcon(size: 94, asset: icon, disc: disc, spinning: busy),
                const SizedBox(height: 12),
                const Text('RFID reader', style: _Styles.readerTitle),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: dot,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        status,
                        style: const TextStyle(
                          fontFamily: AppTypography.fontFamily,
                          fontSize: 14,
                          fontWeight: AppTypography.regular,
                          letterSpacing: 0,
                          color: AppColors.rfidStatusText,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        if (phase == RfidReaderPhase.disconnected) ...[
          const SizedBox(height: 16),
          const _Note(
            icon: AssetPaths.iconRfidAlert,
            border: AppColors.rfidDanger,
            fill: AppColors.rfidDangerTint,
            textColor: Colors.black,
            text:
                'No scan failure is treated as a missing tag, invalid tag or '
                'No Active Trip.',
          ),
        ],
        if (phase == RfidReaderPhase.tagDetected) ...[
          const SizedBox(height: 16),
          const _Note(
            icon: AssetPaths.iconRfidInfo,
            border: AppColors.rfidSuccess,
            fill: AppColors.rfidSuccessTint,
            textColor: AppColors.rfidTitle,
            text:
                'A detected tag is not yet a verified vehicle. Raw tag '
                'references are hidden.',
          ),
        ],
      ],
    );
  }
}

/// A note in a coloured box with its icon.
class _Note extends StatelessWidget {
  const _Note({
    required this.icon,
    required this.border,
    required this.fill,
    required this.textColor,
    required this.text,
  });

  final String icon;
  final Color border;
  final Color fill;
  final Color textColor;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: fill,
        border: Border.all(color: border, width: 1.5),
        borderRadius: const BorderRadius.all(Radius.circular(16)),
      ),
      child: Row(
        children: [
          SvgPicture.asset(
            icon,
            width: 22,
            height: 22,
            excludeFromSemantics: true,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 14,
                fontWeight: AppTypography.regular,
                letterSpacing: 0,
                height: 22.4 / 14,
                color: textColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// [asset] on a tinted disc; while something runs, a ring turns round it.
class _ReaderIcon extends StatelessWidget {
  const _ReaderIcon({
    required this.size,
    required this.asset,
    required this.disc,
    this.spinning = false,
  });

  final double size;
  final String asset;
  final Color disc;
  final bool spinning;

  @override
  Widget build(BuildContext context) {
    final circle = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: disc, shape: BoxShape.circle),
      alignment: Alignment.center,
      child: SvgPicture.asset(
        asset,
        width: 38,
        height: 38,
        excludeFromSemantics: true,
      ),
    );
    if (!spinning) return circle;
    // The ring is 8 px clear of the disc all round.
    return SizedBox(
      width: size + 16,
      height: size + 16,
      child: Stack(
        alignment: Alignment.center,
        children: [
          circle,
          const Positioned.fill(child: _TurningRing()),
        ],
      ),
    );
  }
}

/// A pale ring with a darker arc turning round it.
class _TurningRing extends StatefulWidget {
  const _TurningRing();

  @override
  State<_TurningRing> createState() => _TurningRingState();
}

class _TurningRingState extends State<_TurningRing>
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
  Widget build(BuildContext context) => RotationTransition(
    turns: _controller,
    child: const CustomPaint(painter: _RingPainter()),
  );
}

class _RingPainter extends CustomPainter {
  const _RingPainter();

  static const double _stroke = 1.5;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = (Offset.zero & size).deflate(_stroke / 2);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = _stroke
      ..color = AppColors.rfidRing;
    canvas.drawOval(rect, paint);
    canvas.drawArc(
      rect,
      0,
      1.2,
      false,
      paint
        ..color = AppColors.green
        ..strokeWidth = 2.5
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_RingPainter oldDelegate) => false;
}

abstract final class _Styles {
  static const TextStyle readerTitle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 17,
    fontWeight: AppTypography.bold,
    letterSpacing: 0,
    color: AppColors.rfidTitle,
  );

  static const TextStyle button = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 15,
    fontWeight: AppTypography.semiBold,
    letterSpacing: 0,
    height: 20.25 / 15,
  );
}

/// A 54 px filled button, or a 52 px white one with a black outline.
class _RfidButton extends StatelessWidget {
  const _RfidButton.filled(
    this.label, {
    required this.onPressed,
    this.color = AppColors.green,
  }) : filled = true;

  const _RfidButton.outlined(this.label, {required this.onPressed})
    : filled = false,
      color = AppColors.surface;

  final String label;
  final VoidCallback onPressed;
  final bool filled;
  final Color color;

  @override
  Widget build(BuildContext context) {
    const padding = EdgeInsets.symmetric(horizontal: 18, vertical: 13);
    final text = Text(label, textAlign: TextAlign.center);
    if (filled) {
      return FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          minimumSize: const Size(double.infinity, 54),
          padding: padding,
          backgroundColor: color,
          foregroundColor: Colors.white,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(24)),
          ),
          textStyle: _Styles.button,
        ),
        child: text,
      );
    }
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        padding: padding,
        backgroundColor: color,
        foregroundColor: Colors.black,
        side: const BorderSide(width: 1.5),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(28)),
        ),
        textStyle: _Styles.button,
      ),
      child: text,
    );
  }
}
