import 'package:flutter/painting.dart';

import 'app_colors.dart';

abstract final class AppGradients {
  /// Green brand background behind headers: the design's 143.5° CSS
  /// gradient over the full screen, with stops at 1.8% and 70.5%, expressed
  /// as alignments.
  static const LinearGradient brandHeader = LinearGradient(
    begin: Alignment(-1.389, -0.867),
    end: Alignment(1.389, 0.867),
    colors: [AppColors.greenDeep, AppColors.green],
    stops: [0.018, 0.705],
  );
}
