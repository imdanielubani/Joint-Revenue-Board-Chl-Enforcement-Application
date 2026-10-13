import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../auth/presentation/screens/forgot_password_screen.dart';

/// App settings → Security ("Account Security"): the officer asks for a
/// password reset link, as on sign-in, then returns to settings.
class ChangePasswordScreen extends StatelessWidget {
  const ChangePasswordScreen({super.key});

  static const String title = 'Account Security';
  static const String returnToSettings = 'Return to Settings';

  @override
  Widget build(BuildContext context) {
    return ForgotPasswordScreen(
      title: title,
      leaveLabel: returnToSettings,
      onLeave: context.popOrGoHome,
    );
  }
}
