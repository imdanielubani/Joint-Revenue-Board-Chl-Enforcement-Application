import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Shows [builder]'s content as a floating card over the dark scrim.
///
/// The card can be dragged down, or the scrim tapped, to close it unless
/// [isDismissible] is false. Resolves to the value the card pops with, or
/// null when it was dismissed.
Future<T?> showAppSheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool isDismissible = true,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    isDismissible: isDismissible,
    enableDrag: isDismissible,
    backgroundColor: Colors.transparent,
    barrierColor: AppColors.scrim,
    elevation: 0,
    // The card draws its own handle; the theme's would add a second one.
    showDragHandle: false,
    builder: builder,
  );
}

/// White rounded card with a drag handle, floating above the bottom of the
/// screen with 16 px side margins. Its content scrolls if the screen is too
/// short to show it all.
class AppSheetCard extends StatelessWidget {
  const AppSheetCard({super.key, required this.child, this.bottomMargin = 32});

  final Widget child;

  /// Space below the card; grows to clear the system navigation bar or home
  /// indicator when that is taller.
  final double bottomMargin;

  /// Widest the card grows on tablets.
  static const double maxWidth = 420;

  @override
  Widget build(BuildContext context) {
    final bottom = math.max(
      bottomMargin,
      MediaQuery.viewPaddingOf(context).bottom,
    );

    return SafeArea(
      bottom: false,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, bottom),
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: maxWidth),
            child: DecoratedBox(
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.all(Radius.circular(24)),
                boxShadow: [
                  BoxShadow(
                    color: Color(0x1A000000),
                    offset: Offset(11, 4),
                    blurRadius: 13.5,
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(17, 15, 17, 15),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      decoration: const BoxDecoration(
                        color: AppColors.sheetHandle,
                        borderRadius: BorderRadius.all(Radius.circular(2)),
                      ),
                    ),
                    const SizedBox(height: 30),
                    // Scrolls when the screen is too short for the card
                    // (small phones in landscape, large text).
                    Flexible(child: SingleChildScrollView(child: child)),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
