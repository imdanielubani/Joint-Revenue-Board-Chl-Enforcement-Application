import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_gradients.dart';
import '../../../core/theme/app_typography.dart';

/// Screen with a green gradient header and a rounded white sheet beneath it.
///
/// The header sits below the status bar; the sheet fills the rest of the
/// screen, and [body] is laid out inside it clear of the bottom system bars.
class GreenHeaderScaffold extends StatelessWidget {
  const GreenHeaderScaffold({
    super.key,
    required this.title,
    required this.body,
  });

  final String title;
  final Widget body;

  /// Header height below the status bar.
  static const double headerHeight = 69;

  static const double _sheetRadius = 30;

  static const TextStyle _titleStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 16,
    fontWeight: AppTypography.semiBold,
    color: Colors.white,
  );

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: AppColors.surface,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: AppColors.surface,
        body: DecoratedBox(
          decoration: const BoxDecoration(gradient: AppGradients.brandHeader),
          child: Column(
            children: [
              SafeArea(
                bottom: false,
                child: SizedBox(
                  height: headerHeight,
                  width: double.infinity,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
                    child: Text(
                      title,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: _titleStyle,
                    ),
                  ),
                ),
              ),
              Expanded(
                child: DecoratedBox(
                  decoration: const BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.vertical(
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
