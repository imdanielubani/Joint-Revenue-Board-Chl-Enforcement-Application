import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

/// The camera window of the QR scanner: [child] (the live picture, or a
/// message) in a rounded frame with white corner guides.
class QrScanFrame extends StatelessWidget {
  const QrScanFrame({super.key, required this.child});

  final Widget child;

  static const double radius = 18;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: const BorderRadius.all(Radius.circular(radius)),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Behind the picture until the camera starts.
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(-0.5, -0.6),
                radius: 1.1,
                colors: [
                  AppColors.scannerPreviewTop,
                  AppColors.scannerPreviewUpper,
                  AppColors.scannerPreviewLower,
                  AppColors.scannerPreviewEdge,
                ],
                stops: [0, 0.3, 0.6, 1],
              ),
            ),
          ),
          child,
          const IgnorePointer(child: CustomPaint(painter: _CornerGuides())),
        ],
      ),
    );
  }
}

/// White 3 px corners, 54 px long, following the frame's rounded corners.
class _CornerGuides extends CustomPainter {
  const _CornerGuides();

  static const double _length = 54;
  static const double _stroke = 3;

  @override
  void paint(Canvas canvas, Size size) {
    final corners = Path();
    for (final origin in [
      Offset.zero,
      Offset(size.width - _length, 0),
      Offset(0, size.height - _length),
      Offset(size.width - _length, size.height - _length),
    ]) {
      corners.addRect(origin & const Size(_length, _length));
    }

    canvas
      ..save()
      ..clipPath(corners)
      ..drawRRect(
        RRect.fromRectAndRadius(
          (Offset.zero & size).deflate(_stroke / 2),
          const Radius.circular(QrScanFrame.radius - _stroke / 2),
        ),
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.stroke
          ..strokeWidth = _stroke,
      )
      ..restore();
  }

  @override
  bool shouldRepaint(_CornerGuides oldDelegate) => false;
}
