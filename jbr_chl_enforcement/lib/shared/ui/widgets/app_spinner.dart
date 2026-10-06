import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../core/constants/asset_paths.dart';

/// The design's loading symbol, rotating. Holds still when the system asks
/// for reduced motion.
class AppSpinner extends StatefulWidget {
  const AppSpinner({super.key, this.size = 22, this.semanticLabel});

  final double size;
  final String? semanticLabel;

  @override
  State<AppSpinner> createState() => _AppSpinnerState();
}

class _AppSpinnerState extends State<AppSpinner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
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
    return Semantics(
      label: widget.semanticLabel,
      child: RotationTransition(
        turns: _controller,
        child: SvgPicture.asset(
          AssetPaths.iconLoading,
          width: widget.size,
          height: widget.size,
          excludeFromSemantics: true,
        ),
      ),
    );
  }
}
