import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// A thin ring with a green arc turning round it, drawn around an icon badge
/// while something is in progress. The arc holds still when the system asks
/// for reduced motion.
class RingSpinner extends StatefulWidget {
  const RingSpinner({
    super.key,
    required this.diameter,
    this.trackColor = AppColors.greenTint,
    this.arcColor = AppColors.green,
  });

  final double diameter;
  final Color trackColor;
  final Color arcColor;

  @override
  State<RingSpinner> createState() => _RingSpinnerState();
}

class _RingSpinnerState extends State<RingSpinner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: CustomPaint(
          size: Size.square(widget.diameter),
          painter: _RingPainter(
            turns: _controller,
            trackColor: widget.trackColor,
            arcColor: widget.arcColor,
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.turns,
    required this.trackColor,
    required this.arcColor,
  }) : super(repaint: turns);

  final Animation<double> turns;
  final Color trackColor;
  final Color arcColor;

  static const double _trackWidth = 1.5;
  static const double _arcWidth = 2.5;

  /// A quarter of the ring.
  static const double _sweep = math.pi / 2;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final ring = rect.deflate(_arcWidth / 2);

    canvas.drawOval(
      ring,
      Paint()
        ..color = trackColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = _trackWidth,
    );
    canvas.drawArc(
      ring,
      turns.value * 2 * math.pi - math.pi / 2,
      _sweep,
      false,
      Paint()
        ..color = arcColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = _arcWidth
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_RingPainter oldDelegate) =>
      oldDelegate.turns != turns ||
      oldDelegate.trackColor != trackColor ||
      oldDelegate.arcColor != arcColor;
}
