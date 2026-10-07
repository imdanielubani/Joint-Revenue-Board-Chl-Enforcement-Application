import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

/// Centred title and message for screens with nothing to show yet.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, this.message});

  final String title;
  final String? message;

  @override
  Widget build(BuildContext context) {
    final message = this.message;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 18,
                fontWeight: AppTypography.semiBold,
                color: AppColors.forest,
              ),
            ),
            if (message != null) ...[
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 14,
                  height: 1.5,
                  color: AppColors.moss,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// A screen whose design has not been built yet.
const String notBuiltYetMessage = 'This screen is not available yet.';
