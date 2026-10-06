import 'package:flutter/material.dart';

/// Brand and semantic colours for CHL Enforcement.
///
/// Brand colours are taken from the JRB CHL logo: navy shield and green road.
abstract final class AppColors {
  // Brand
  static const Color navy = Color(0xFF012F65);
  static const Color navyDark = Color(0xFF001F45);
  static const Color navyLight = Color(0xFF2E5A91);
  static const Color green = Color(0xFF137836);
  static const Color greenDark = Color(0xFF0B5A26);
  static const Color greenLight = Color(0xFF4CA36A);

  // Neutrals (light)
  static const Color background = Color(0xFFF5F7FA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFEDF1F6);
  static const Color border = Color(0xFFD9E0E8);
  static const Color textPrimary = Color(0xFF111827);
  static const Color textSecondary = Color(0xFF4B5563);
  static const Color textDisabled = Color(0xFF9CA3AF);

  // Neutrals (dark)
  static const Color backgroundDark = Color(0xFF0B1220);
  static const Color surfaceDark = Color(0xFF131C2E);
  static const Color surfaceVariantDark = Color(0xFF1C2740);
  static const Color borderDark = Color(0xFF2A3650);
  static const Color textPrimaryDark = Color(0xFFF3F4F6);
  static const Color textSecondaryDark = Color(0xFFB4BCC8);

  // Verification and enforcement status
  static const Color success = Color(0xFF15803D); // valid / compliant
  static const Color successContainer = Color(0xFFDCFCE7);
  static const Color warning = Color(0xFFB45309); // expiring / needs attention
  static const Color warningContainer = Color(0xFFFEF3C7);
  static const Color error = Color(0xFFB91C1C); // violation / invalid
  static const Color errorContainer = Color(0xFFFEE2E2);
  static const Color info = Color(0xFF1D4ED8); // pending / informational
  static const Color infoContainer = Color(0xFFDBEAFE);

  // SOS
  static const Color sos = Color(0xFFDC2626);
}
