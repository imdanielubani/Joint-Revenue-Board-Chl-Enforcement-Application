import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/launch_stage.dart';

/// Progress bar, current stage message and "Powered by" footer.
class LaunchProgress extends StatelessWidget {
  const LaunchProgress({super.key, required this.stage, this.version});

  final LaunchStage stage;

  /// App version shown in the footer; omitted until it has loaded.
  final String? version;

  static const double width = 253;

  static const TextStyle _statusStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 12,
    fontWeight: AppTypography.medium,
    height: 18 / 12,
    color: AppColors.success,
  );

  static const TextStyle _footerStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 12,
    fontWeight: AppTypography.semiBold,
    height: 18 / 12,
    color: AppColors.success,
  );

  static String messageFor(LaunchStage stage) => switch (stage) {
    LaunchStage.checkingSession => 'Checking secure session...',
    LaunchStage.loadingOfflineCache => 'Loading offline vehicle cache…',
    LaunchStage.ready => 'Ready...',
  };

  @override
  Widget build(BuildContext context) {
    final message = messageFor(stage);
    final footer = version == null
        ? 'Powered by Cyber1 System Network'
        : 'Powered by Cyber1 System Network · v$version';
    final animate = !MediaQuery.disableAnimationsOf(context);

    // Only the bar is fixed to the design width; the texts are centred on
    // it and may extend past it, as in the design.
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: width,
          height: 6,
          child: Semantics(
            label: 'Loading',
            value: '${(stage.progress * 100).round()}%',
            child: ClipRRect(
              borderRadius: AppRadii.pillAll,
              child: ColoredBox(
                color: AppColors.progressTrack,
                child: TweenAnimationBuilder<double>(
                  tween: Tween(end: stage.progress),
                  duration: animate
                      ? const Duration(milliseconds: 450)
                      : Duration.zero,
                  curve: Curves.easeOutCubic,
                  builder: (context, value, _) => Align(
                    alignment: Alignment.centerLeft,
                    child: FractionallySizedBox(
                      widthFactor: value,
                      heightFactor: 1,
                      child: const DecoratedBox(
                        decoration: BoxDecoration(
                          color: AppColors.green,
                          borderRadius: AppRadii.pillAll,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Semantics(
            liveRegion: true,
            child: Text(
              message,
              textAlign: TextAlign.center,
              maxLines: 1,
              softWrap: false,
              style: _statusStyle,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 24),
          child: Text(
            footer,
            textAlign: TextAlign.center,
            maxLines: 1,
            softWrap: false,
            style: _footerStyle,
          ),
        ),
      ],
    );
  }
}
