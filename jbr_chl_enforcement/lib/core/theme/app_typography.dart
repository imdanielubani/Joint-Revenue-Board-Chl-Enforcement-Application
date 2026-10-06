import 'package:flutter/material.dart';

/// Poppins type scale, registered in pubspec.yaml with weights 300–700.
abstract final class AppTypography {
  static const String fontFamily = 'Poppins';

  static const FontWeight light = FontWeight.w300;
  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semiBold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;

  static TextTheme textTheme(Color primary, Color secondary) {
    return TextTheme(
      displayLarge: _style(48, bold, 1.12, -0.5, primary),
      displayMedium: _style(40, bold, 1.16, -0.25, primary),
      displaySmall: _style(32, semiBold, 1.22, 0, primary),
      headlineLarge: _style(28, semiBold, 1.25, 0, primary),
      headlineMedium: _style(24, semiBold, 1.29, 0, primary),
      headlineSmall: _style(20, semiBold, 1.33, 0, primary),
      titleLarge: _style(18, semiBold, 1.33, 0, primary),
      titleMedium: _style(16, medium, 1.5, 0.1, primary),
      titleSmall: _style(14, medium, 1.43, 0.1, primary),
      bodyLarge: _style(16, regular, 1.5, 0.15, primary),
      bodyMedium: _style(14, regular, 1.43, 0.25, primary),
      bodySmall: _style(12, regular, 1.33, 0.4, secondary),
      labelLarge: _style(14, semiBold, 1.43, 0.1, primary),
      labelMedium: _style(12, medium, 1.33, 0.5, primary),
      labelSmall: _style(11, medium, 1.45, 0.5, secondary),
    );
  }

  /// Monospaced-feel style for plate numbers and E-Tag IDs.
  static const TextStyle plateNumber = TextStyle(
    fontFamily: fontFamily,
    fontSize: 22,
    fontWeight: bold,
    letterSpacing: 2,
    fontFeatures: [FontFeature.tabularFigures()],
  );

  static TextStyle _style(
    double size,
    FontWeight weight,
    double height,
    double letterSpacing,
    Color color,
  ) {
    return TextStyle(
      fontFamily: fontFamily,
      fontSize: size,
      fontWeight: weight,
      height: height,
      letterSpacing: letterSpacing,
      color: color,
    );
  }
}
