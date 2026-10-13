import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/sheets/app_bottom_sheet.dart';

/// Asks the officer to confirm signing out. Resolves to true for "Sign out";
/// false or null when they keep working (button, close, drag or scrim tap).
Future<bool> confirmSignOut(BuildContext context) async {
  final confirmed = await showAppSheet<bool>(
    context: context,
    // Over the whole screen, navigation bar included.
    useRootNavigator: true,
    builder: (context) => const SignOutSheet(),
  );
  return confirmed ?? false;
}

/// The "Sign out of JRB CHL?" card, floating near the bottom of the screen.
class SignOutSheet extends StatelessWidget {
  const SignOutSheet({super.key});

  static const String title = 'Sign out of JRB CHL?';
  static const String message =
      'Return to sign-in? Saved operational records are not deleted.';

  /// Widest the card grows on tablets.
  static const double maxWidth = 420;

  /// Space between the card and the bottom of the screen. The iPhone home
  /// indicator only fills the lower part of its inset, so the card may sit
  /// 15 px into it, as designed; other phones keep clear of the whole inset
  /// (e.g. Android's navigation buttons).
  static double bottomMargin(BuildContext context) {
    final inset = MediaQuery.viewPaddingOf(context).bottom;
    final usable = Theme.of(context).platform == TargetPlatform.iOS
        ? inset - 15
        : inset;
    return math.max(12, usable);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: EdgeInsets.fromLTRB(12, 0, 12, bottomMargin(context)),
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: maxWidth),
            child: DecoratedBox(
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.all(Radius.circular(28)),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.signOutShadow,
                    offset: Offset(0, 18),
                    blurRadius: 60,
                  ),
                ],
              ),
              child: Stack(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(22, 18, 22, 24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 40,
                          height: 5,
                          decoration: const BoxDecoration(
                            color: AppColors.signOutHandle,
                            borderRadius: BorderRadius.all(Radius.circular(5)),
                          ),
                        ),
                        // Scrolls when the screen is too short for the card
                        // (small phones in landscape, large text).
                        const Flexible(
                          child: SingleChildScrollView(child: _Content()),
                        ),
                      ],
                    ),
                  ),
                  Positioned(
                    top: 26,
                    right: 12,
                    child: _CloseButton(
                      onPressed: () => Navigator.of(context).pop(false),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Content extends StatelessWidget {
  const _Content();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 30 below the handle's top, as designed.
        const SizedBox(height: 25),
        Center(
          child: Container(
            width: 63.984,
            height: 63.984,
            decoration: const BoxDecoration(
              color: AppColors.signOutHalo,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: SvgPicture.asset(
              AssetPaths.iconSignOutLock,
              width: 31.9922,
              height: 31.9922,
              excludeFromSemantics: true,
            ),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Account',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: AppTypography.fontFamily,
            fontSize: 12,
            fontWeight: AppTypography.semiBold,
            letterSpacing: 0.3,
            height: 1.5,
            color: AppColors.moss,
          ),
        ),
        const SizedBox(height: 10),
        Semantics(
          header: true,
          child: const Text(
            SignOutSheet.title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 23,
              fontWeight: AppTypography.bold,
              letterSpacing: -0.575,
              height: 28.75 / 23,
              color: AppColors.forest,
            ),
          ),
        ),
        const SizedBox(height: 12.25),
        const Text(
          SignOutSheet.message,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: AppTypography.fontFamily,
            fontSize: 14,
            fontWeight: AppTypography.regular,
            letterSpacing: 0,
            height: 1.6,
            color: AppColors.signOutBody,
          ),
        ),
        const SizedBox(height: 22),
        _SheetButton(
          label: 'Sign out',
          background: AppColors.statusDownText,
          foreground: Colors.white,
          onPressed: () => Navigator.of(context).pop(true),
        ),
        const SizedBox(height: 10),
        _SheetButton(
          label: 'Keep working',
          background: AppColors.surface,
          foreground: Colors.black,
          border: Colors.black,
          onPressed: () => Navigator.of(context).pop(false),
        ),
      ],
    );
  }
}

/// 52 px pill button, filled or outlined.
class _SheetButton extends StatelessWidget {
  const _SheetButton({
    required this.label,
    required this.background,
    required this.foreground,
    required this.onPressed,
    this.border,
  });

  final String label;
  final Color background;
  final Color foreground;
  final Color? border;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        backgroundColor: background,
        foregroundColor: foreground,
        shape: RoundedRectangleBorder(
          borderRadius: const BorderRadius.all(Radius.circular(28)),
          side: border == null
              ? BorderSide.none
              : BorderSide(color: border!, width: 1.5),
        ),
        textStyle: const TextStyle(
          fontFamily: AppTypography.fontFamily,
          fontSize: 14,
          fontWeight: AppTypography.semiBold,
          letterSpacing: 0,
          height: 18.9 / 14,
        ),
      ),
      child: Text(label, textAlign: TextAlign.center),
    );
  }
}

class _CloseButton extends StatelessWidget {
  const _CloseButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Close and keep working',
      excludeSemantics: true,
      child: InkResponse(
        onTap: onPressed,
        radius: 24,
        child: SizedBox(
          width: 48,
          height: 48,
          child: Center(
            child: SvgPicture.asset(
              AssetPaths.iconDialogClose,
              width: 20,
              height: 20,
              excludeFromSemantics: true,
            ),
          ),
        ),
      ),
    );
  }
}
