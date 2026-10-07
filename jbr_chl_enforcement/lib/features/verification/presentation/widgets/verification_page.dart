import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';

/// Frame shared by the verification pages: green header with a back button,
/// and the grey sheet starting 73 px below the status bar.
class VerificationPageScaffold extends StatelessWidget {
  const VerificationPageScaffold({
    super.key,
    required this.title,
    required this.body,
  });

  final String title;
  final Widget body;

  /// Widest the page content grows on tablets.
  static const double maxContentWidth = 560;

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: title,
      headerHeight: 73,
      sheetColor: AppColors.canvas,
      onBack: context.popOrGoHome,
      body: body,
    );
  }
}

/// Centres [child] and caps its width at
/// [VerificationPageScaffold.maxContentWidth].
class VerificationContentWidth extends StatelessWidget {
  const VerificationContentWidth({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          maxWidth: VerificationPageScaffold.maxContentWidth,
        ),
        child: child,
      ),
    );
  }
}

/// Page heading with a short description under it. It sits 4 px further in
/// than the cards and fields below it, as designed.
class VerificationHeading extends StatelessWidget {
  const VerificationHeading({
    super.key,
    required this.heading,
    required this.description,
  });

  final String heading;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Semantics(
              header: true,
              child: Text(
                heading,
                style: const TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 22,
                  fontWeight: AppTypography.bold,
                  height: 25.96 / 22,
                  letterSpacing: -0.77,
                  color: AppColors.forest,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 3),
            child: Text(
              description,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 12,
                fontWeight: AppTypography.regular,
                height: 18 / 12,
                color: AppColors.ink,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
