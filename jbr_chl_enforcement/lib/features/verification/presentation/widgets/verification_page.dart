import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../../shared/ui/widgets/screen_heading.dart';

/// Frame shared by the verification pages: green header with a back button,
/// and the grey sheet starting 73 px below the status bar.
class VerificationPageScaffold extends StatelessWidget {
  const VerificationPageScaffold({
    super.key,
    required this.title,
    required this.body,
    this.trailing,
  });

  final String title;
  final Widget body;

  /// Shown at the right of the header, e.g. the notifications bell.
  final Widget? trailing;

  /// Widest the page content grows on tablets.
  static const double maxContentWidth = 560;

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: title,
      headerHeight: 73,
      sheetColor: AppColors.canvas,
      onBack: context.popOrGoHome,
      trailing: trailing,
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
      child: ScreenHeading(heading: heading, description: description),
    );
  }
}
