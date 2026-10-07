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
  static const Color greenTint = Color(0x1A137836); // green at 10%

  /// Dark end of the green header gradient.
  static const Color greenDeep = Color(0xFF13271A);

  // Ink used for headings on white sheets, and its 50% tint for body copy.
  static const Color ink = Color(0xFF1A0C21);
  static const Color inkMuted = Color(0x801A0C21);

  /// Text links on white, e.g. "Forgot Password!".
  static const Color link = Color(0xFF266E43);

  /// Secondary text on the green header.
  static const Color onHeaderMuted = Color(0xFFE1E1E1);

  // "Secure Enforcement Platform" pill on the green header.
  static const Color statusPillFill = Color(0x8000DB50);
  static const Color statusPillBorder = Color(0x8000FF5D);
  static const Color statusDot = Color(0xFF00FF5D);
  static const Color statusDotGlow = Color(0xFF02BE46);

  // Dashboard and signed-in screens.
  static const Color canvas = Color(0xFFF7F7F8); // sheet behind cards
  static const Color cardBorder = Color(0xFFD6D6D6);
  static const Color forest = Color(0xFF173E20); // headings and values
  static const Color moss = Color(0xFF536952); // captions on cards
  static const Color forestLink = Color(0xFF18491F); // "View all"
  static const Color navActive = Color(0xFF00CE47);
  static const Color badgeRing = Color(0xFF00B53F);
  static const Color headerButton = Color(0x4DFFFFFF); // white at 30%
  static const Color mint = Color(0xFFE8F3E4); // behind green icons
  static const Color inkHalf = Color(0x801A0C21); // ink at 50%, card details
  static const Color plateGuide = Color(
    0xFFB4B8BF,
  ); // --- --- -- in the plate field

  // Status dots on the dashboard tiles, and their (readable) labels.
  static const Color statusOk = Color(0xFF00FF5D);
  static const Color statusPending = Color(0xFFFCC20A);
  static const Color statusDown = Color(0xFFEE4031);
  static const Color statusDownText = Color(0xFFB42318);

  // Daily activity icon badges.
  static const Color activityScans = Color(0xFFFFF0C0);
  static const Color activityActive = Color(0xFFFFE2CC);
  static const Color activityNoActive = Color(0xFFE6E1FF);
  static const Color activityViolations = Color(0xFFEDF4E8);
  static const Color activityRing = Color(0xFFEEF1E8);

  // Recent verification icon backgrounds.
  static const Color recentActive = mint;
  static const Color recentNoActive = Color(0xFFFFF3D9);
  static const Color recentEscalated = Color(0xFFFFDCD9);

  // Disabled primary button.
  static const Color buttonDisabledFill = Color(0xFFF3F3F3);
  static const Color buttonDisabledBorder = Color(0xFFD6D6D6);
  static const Color buttonDisabledText = Color(0xFF8C929C);

  // Bottom sheets.
  static const Color scrim = Color(0xCC000000); // black at 80%
  static const Color sheetHandle = Color(0xFFD1D5DB);
  static const Color sheetTitle = Color(0xFF272936);
  static const Color sheetBody = Color(0xFF6B7280);
  static const Color sheetBodyAlt = Color(0xFF5E626D);

  // Status sheets: danger (account deactivated) and warning (session
  // expired). Text on these colours uses the accessible variants.
  static const Color dangerTint = Color(0x1AFF0000); // icon halo
  static const Color amber = Color(0xFFF0B800);
  static const Color warningTint = Color(0x1AF0B800); // icon halo
  static const Color warningSurface = Color(0xFFFFFCF3);
  static const Color warningText = Color(0xFFB54708); // AA on light fills

  // Invalid form fields: a calm, deep red (AA contrast on white).
  static const Color fieldError = Color(0xFFD92D20);
  static const Color fieldErrorText = Color(0xFFB42318);

  // Inline alerts (toasts) above forms.
  static const Color alertError = Color(0xFFD92D20); // icon
  static const Color alertErrorText = Color(0xFFB42318);
  static const Color alertErrorFill = Color(0xFFFEF3F2);
  static const Color alertErrorBorder = Color(0xFFFECDCA);
  static const Color alertSuccess = Color(0xFF22C55E);
  static const Color alertSuccessFill = Color(0x3322C55E);
  static const Color alertSuccessText = Color(0xFF28292A);

  /// Lighter success alert used inside sheets, with a mint icon halo.
  static const Color alertSuccessSubtleFill = Color(0x1A22C55E);
  static const Color successIconHalo = Color(0x1A01E17B);

  // Neutrals (light)
  static const Color background = Color(0xFFF5F7FA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFEDF1F6);
  static const Color border = Color(0xFFD9E0E8);
  static const Color textPrimary = Color(0xFF111827);
  static const Color textSecondary = Color(0xFF4B5563);
  static const Color textDisabled = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF525252);
  static const Color progressTrack = Color(0xFFDADADA);

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
  static const Color sos = Color(0xFFEE4031);
}
