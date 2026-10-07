import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../core/constants/asset_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_gradients.dart';
import '../../../core/theme/app_typography.dart';

/// Screen with a green gradient header and a rounded white sheet beneath it.
///
/// The header sits below the status bar; the sheet fills the rest of the
/// screen, and [body] is laid out inside it clear of the bottom system bars.
/// Without [onBack] the title is centred; with it, a round back button sits
/// on the left and the title follows it.
class GreenHeaderScaffold extends StatelessWidget {
  const GreenHeaderScaffold({
    super.key,
    required this.title,
    required this.body,
    this.onBack,
    this.headerHeight = defaultHeaderHeight,
    this.sheetColor = AppColors.surface,
  });

  final String title;
  final Widget body;

  /// Shows the back button when set.
  final VoidCallback? onBack;

  /// Header height below the status bar, i.e. where the sheet starts.
  final double headerHeight;

  final Color sheetColor;

  static const double defaultHeaderHeight = 69;

  static const double _sheetRadius = 30;

  static const TextStyle _titleStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 16,
    fontWeight: AppTypography.semiBold,
    color: Colors.white,
  );

  @override
  Widget build(BuildContext context) {
    final onBack = this.onBack;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: sheetColor,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: sheetColor,
        body: DecoratedBox(
          decoration: const BoxDecoration(gradient: AppGradients.brandHeader),
          child: Column(
            children: [
              SafeArea(
                bottom: false,
                child: SizedBox(
                  height: headerHeight,
                  width: double.infinity,
                  child: onBack == null
                      ? Padding(
                          padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
                          child: Text(
                            title,
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: _titleStyle,
                          ),
                        )
                      : Stack(
                          children: [
                            // 41 px button drawn 16 from the left and 10
                            // below the status bar, inside a 48 px target.
                            Positioned(
                              left: 12.5,
                              top: 6.5,
                              child: _BackButton(onPressed: onBack),
                            ),
                            Positioned(
                              left: 71,
                              right: 16,
                              top: 17.5,
                              child: Semantics(
                                header: true,
                                child: Text(
                                  title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: _titleStyle,
                                ),
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              Expanded(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: sheetColor,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(_sheetRadius),
                    ),
                  ),
                  child: SafeArea(top: false, child: body),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  const _BackButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Back',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onPressed,
        child: SizedBox(
          width: 48,
          height: 48,
          child: Center(
            child: Container(
              width: 41,
              height: 41,
              decoration: const BoxDecoration(
                color: AppColors.green,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: SvgPicture.asset(
                AssetPaths.iconBack,
                width: 24,
                height: 24,
                excludeFromSemantics: true,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
