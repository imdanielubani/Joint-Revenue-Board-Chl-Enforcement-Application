import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/app_providers.dart';
import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/entities/launch_stage.dart';
import '../providers/launch_controller.dart';
import '../widgets/launch_brand_block.dart';
import '../widgets/launch_progress.dart';
import '../widgets/launch_tagline.dart';

/// Launch screen (Figma "Launch", nodes 49:6252, 49:6360, 49:6321).
///
/// Shows start-up progress, then moves on to sign-in once ready.
///
/// Layout: the design is laid out inside the safe area (clear of notches,
/// status and navigation bars) and scaled uniformly to the screen width,
/// up to [_SplashScreenState._maxScale] on tablets. Spare height is shared
/// between the gaps in the same proportions as the design, so a 390 × 844
/// screen matches the Figma frame exactly. On short screens, such as phones
/// in landscape, the whole layout shrinks to fit instead of overflowing.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  /// How long "Ready..." stays visible before leaving the launch screen.
  static const Duration readyHoldDuration = Duration(milliseconds: 5000);

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  /// Width of the design frame; content is scaled relative to it.
  static const double _designWidth = 390;

  /// Largest scale, so tablets get larger branding without it dominating.
  static const double _maxScale = 1.35;

  /// Height the content needs at scale 1: tagline, brand block and progress
  /// (about 381) plus a minimum of 48 spread across the gaps.
  static const double _minContentHeight = 429;

  // Gaps between blocks inside the design's safe area (390 × 763 after the
  // 47 status bar and 34 home indicator), used as flex weights.
  static const int _gapTop = 22;
  static const int _gapTaglineToBrand = 130;
  static const int _gapBrandToProgress = 203;
  static const int _gapBottom = 27;

  Timer? _exitTimer;

  @override
  void dispose() {
    _exitTimer?.cancel();
    super.dispose();
  }

  void _onStageChanged(LaunchStage? previous, LaunchStage next) {
    if (next != LaunchStage.ready || _exitTimer != null) return;
    _exitTimer = Timer(SplashScreen.readyHoldDuration, () {
      if (mounted) context.goNamed(RouteNames.login);
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(launchControllerProvider, _onStageChanged);
    final stage = ref.watch(launchControllerProvider);
    final version = ref.watch(appVersionProvider).value;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: AppColors.surface,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: AppColors.surface,
        body: Stack(
          children: [
            // Faded road artwork fills the whole screen, behind system bars.
            Positioned.fill(
              child: Image.asset(
                AssetPaths.launchBackground,
                fit: BoxFit.cover,
                opacity: const AlwaysStoppedAnimation(0.25),
                excludeFromSemantics: true,
              ),
            ),
            SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final scale = math.min(
                    math.min(constraints.maxWidth / _designWidth, _maxScale),
                    constraints.maxHeight / _minContentHeight,
                  );

                  return Center(
                    child: SizedBox(
                      width: _designWidth * scale,
                      height: constraints.maxHeight,
                      child: FittedBox(
                        child: SizedBox(
                          width: _designWidth,
                          height: constraints.maxHeight / scale,
                          // The layout is scaled as a whole, so system text
                          // scaling would only make it overflow.
                          child: MediaQuery.withNoTextScaling(
                            child: _LaunchContent(
                              stage: stage,
                              version: version,
                              renderScale: scale,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The launch layout in design units (390 wide).
class _LaunchContent extends StatelessWidget {
  const _LaunchContent({
    required this.stage,
    required this.version,
    required this.renderScale,
  });

  final LaunchStage stage;
  final String? version;
  final double renderScale;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Spacer(flex: _SplashScreenState._gapTop),
        const Align(
          alignment: Alignment.centerRight,
          child: Padding(
            padding: EdgeInsets.only(right: 16),
            child: LaunchTagline(),
          ),
        ),
        const Spacer(flex: _SplashScreenState._gapTaglineToBrand),
        LaunchBrandBlock(renderScale: renderScale),
        const Spacer(flex: _SplashScreenState._gapBrandToProgress),
        LaunchProgress(stage: stage, version: version),
        const Spacer(flex: _SplashScreenState._gapBottom),
      ],
    );
  }
}
