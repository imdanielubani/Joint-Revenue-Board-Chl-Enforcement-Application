import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/device/rfid/rfid_reader_adapter.dart';
import '../../../../shared/ui/widgets/app_toast.dart';
import '../../../../shared/ui/widgets/screen_heading.dart';
import '../../../notifications/presentation/widgets/notifications_bell.dart';
import '../widgets/verification_page.dart';

/// Where the RFID reader stands on the page.
enum RfidReaderPhase {
  /// Not detected yet: "Connection not checked".
  notChecked,

  /// Looking for the reader.
  detecting,

  /// Found: the haulage tag can be read.
  connected,

  /// Not found, or lost.
  disconnected,
}

/// "RFID verification" (Haulage tag on Verify CHL Trip): detects the RFID
/// reader connected to the device, then lets the officer read a haulage
/// tag. Stop abandons a detection. When no reader is found it says so and
/// offers to detect again or continue by plate.
class RfidScanScreen extends ConsumerStatefulWidget {
  const RfidScanScreen({super.key});

  @override
  ConsumerState<RfidScanScreen> createState() => _RfidScanScreenState();
}

class _RfidScanScreenState extends ConsumerState<RfidScanScreen> {
  RfidReaderPhase _phase = RfidReaderPhase.notChecked;

  /// Counts detections, so the answer to a stopped one is ignored.
  int _detection = 0;

  Future<void> _detect() async {
    final detection = ++_detection;
    setState(() => _phase = RfidReaderPhase.detecting);
    final connected = await ref.read(rfidReaderDetectorProvider).detect();
    if (!mounted || detection != _detection) return;
    ref.read(rfidReaderStatusProvider.notifier).report(connected: connected);
    setState(
      () => _phase = connected
          ? RfidReaderPhase.connected
          : RfidReaderPhase.disconnected,
    );
  }

  void _stop() {
    _detection++;
    setState(() => _phase = RfidReaderPhase.notChecked);
  }

  // TODO(rfid): read the haulage tag and verify it once reading is designed
  // and the reader SDK is in place.
  void _startScanning() =>
      showAppToast(context, 'Reading haulage tags is not available yet.');

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
    };

    final List<Widget> actions = switch (_phase) {
      RfidReaderPhase.notChecked => [
        _RfidButton.filled('Detect Reader', onPressed: _detect),
        _RfidButton.outlined('Enter Plate Instead', onPressed: _enterPlate),
        _RfidButton.outlined(
          'Choose Another Method',
          onPressed: _chooseAnotherMethod,
        ),
      ],
      RfidReaderPhase.detecting => [
        _RfidButton.filled('Stop', onPressed: _stop),
        _RfidButton.outlined(
          'Choose Another Method',
          onPressed: _chooseAnotherMethod,
        ),
      ],
      RfidReaderPhase.connected => [
        _RfidButton.filled('Start Scanning', onPressed: _startScanning),
        _RfidButton.outlined(
          'Choose Another Method',
          onPressed: _chooseAnotherMethod,
        ),
      ],
      RfidReaderPhase.disconnected => [
        _RfidButton.filled(
          'Detect Reader Again',
          color: AppColors.rfidDanger,
          onPressed: _detect,
        ),
        _RfidButton.outlined('Enter Plate Instead', onPressed: _enterPlate),
        _RfidButton.outlined(
          'Choose Another Method',
          onPressed: _chooseAnotherMethod,
        ),
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

/// The reader: its icon, "RFID reader" and its status; and, when it is
/// disconnected, why that is not a finding.
class _ReaderPanel extends StatelessWidget {
  const _ReaderPanel({required this.phase});

  final RfidReaderPhase phase;

  @override
  Widget build(BuildContext context) {
    final disconnected = phase == RfidReaderPhase.disconnected;

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
              const _ReaderIcon(size: 76),
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
      RfidReaderPhase.connected => (AppColors.rfidConnected, 'Connected'),
      _ => (AppColors.rfidDisconnected, 'Disconnected'),
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
                _ReaderIcon(
                  size: 94,
                  disconnected: disconnected,
                  spinning: phase == RfidReaderPhase.detecting,
                ),
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
        if (disconnected) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.rfidDangerTint,
              border: Border.all(color: AppColors.rfidDanger, width: 1.5),
              borderRadius: const BorderRadius.all(Radius.circular(16)),
            ),
            child: Row(
              children: [
                SvgPicture.asset(
                  AssetPaths.iconRfidAlert,
                  width: 22,
                  height: 22,
                  excludeFromSemantics: true,
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'No scan failure is treated as a missing tag, invalid tag '
                    'or No Active Trip.',
                    style: TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: 14,
                      fontWeight: AppTypography.regular,
                      letterSpacing: 0,
                      height: 22.4 / 14,
                      color: Colors.black,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// The reader icon on a tinted disc; while detecting, a ring turns round
/// it.
class _ReaderIcon extends StatelessWidget {
  const _ReaderIcon({
    required this.size,
    this.disconnected = false,
    this.spinning = false,
  });

  final double size;
  final bool disconnected;
  final bool spinning;

  @override
  Widget build(BuildContext context) {
    final disc = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: disconnected ? AppColors.rfidDangerTint : AppColors.greenTint,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: SvgPicture.asset(
        disconnected
            ? AssetPaths.iconRfidReaderDisconnected
            : AssetPaths.iconRfidReader,
        width: 38,
        height: 38,
        excludeFromSemantics: true,
      ),
    );
    if (!spinning) return disc;
    // The ring is 8 px clear of the disc all round.
    return SizedBox(
      width: size + 16,
      height: size + 16,
      child: Stack(
        alignment: Alignment.center,
        children: [
          disc,
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
