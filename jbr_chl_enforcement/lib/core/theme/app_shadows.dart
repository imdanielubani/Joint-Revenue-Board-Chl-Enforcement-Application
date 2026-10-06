import 'package:flutter/widgets.dart';

import 'app_colors.dart';

abstract final class AppShadows {
  static const List<BoxShadow> sm = [
    BoxShadow(color: Color(0x0F012F65), blurRadius: 4, offset: Offset(0, 1)),
  ];

  static const List<BoxShadow> md = [
    BoxShadow(color: Color(0x14012F65), blurRadius: 12, offset: Offset(0, 4)),
  ];

  static const List<BoxShadow> lg = [
    BoxShadow(color: Color(0x1F012F65), blurRadius: 24, offset: Offset(0, 8)),
  ];

  static List<BoxShadow> glow(Color color) => [
    BoxShadow(color: color.withValues(alpha: 0.35), blurRadius: 20),
  ];

  static List<BoxShadow> get sos => glow(AppColors.sos);
}
