import 'package:flutter/widgets.dart';

/// 4-point spacing scale.
abstract final class AppSpacing {
  static const double xxs = 2;
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 48;

  /// Default horizontal padding for screens.
  static const EdgeInsets screen = EdgeInsets.symmetric(horizontal: lg);

  /// Minimum touch target for field use, including with gloves.
  static const double minTouchTarget = 48;
  static const double buttonHeight = 52;
}
