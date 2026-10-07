import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../navigation/route_names.dart';

extension BackNavigation on BuildContext {
  /// Goes back, or to the dashboard when there is nothing to go back to
  /// (e.g. the page was opened directly by its URL).
  void popOrGoHome() {
    if (canPop()) {
      pop();
    } else {
      goNamed(RouteNames.dashboard);
    }
  }
}
