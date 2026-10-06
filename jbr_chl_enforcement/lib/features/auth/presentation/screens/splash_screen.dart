import 'dart:async';

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
/// Shows start-up progress, then moves on to sign-in once ready. The layout
/// follows the 390 × 844 design frame, with vertical positions scaled to the
/// screen height as in the design's constraints.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  /// How long "Ready..." stays visible before leaving the launch screen.
  static const Duration readyHoldDuration = Duration(milliseconds: 600);

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  // Design frame the positions below are measured against.
  static const double _frameWidth = 390;
  static const double _frameHeight = 844;

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
        body: LayoutBuilder(
          builder: (context, constraints) {
            final w = constraints.maxWidth;
            final h = constraints.maxHeight;

            return Stack(
              children: [
                // Faded road artwork, bleeding slightly past the screen edges.
                Positioned(
                  left: -11 / _frameWidth * w,
                  top: -26 / _frameHeight * h,
                  width: 412 / _frameWidth * w,
                  height: 897 / _frameHeight * h,
                  child: Image.asset(
                    AssetPaths.launchBackground,
                    fit: BoxFit.cover,
                    opacity: const AlwaysStoppedAnimation(0.25),
                    excludeFromSemantics: true,
                  ),
                ),
                Positioned(
                  top: h * 0.0833 - 1.33,
                  right: 16,
                  child: const LaunchTagline(),
                ),
                Positioned(
                  top: h * 0.25 + 41,
                  left: 0,
                  right: 0,
                  child: const Center(child: LaunchBrandBlock()),
                ),
                Positioned(
                  top: h * 0.8333 + 1.67,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: LaunchProgress(stage: stage, version: version),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
