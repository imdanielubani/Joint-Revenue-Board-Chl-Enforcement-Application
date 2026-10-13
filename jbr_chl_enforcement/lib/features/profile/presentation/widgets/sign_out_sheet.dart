import 'package:flutter/material.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/ui/sheets/app_bottom_sheet.dart';
import '../../../../shared/ui/sheets/status_modal.dart';

/// Asks the officer to confirm signing out. Resolves to true for "Sign out";
/// false when they keep working (button, close, drag or scrim tap).
Future<bool> confirmSignOut(BuildContext context) async {
  final confirmed = await showAppSheet<bool>(
    context: context,
    // Over the whole screen, navigation bar included.
    useRootNavigator: true,
    builder: (context) => const SignOutSheet(),
  );
  return confirmed ?? false;
}

/// The "Sign out of JRB CHL?" card.
class SignOutSheet extends StatelessWidget {
  const SignOutSheet({super.key});

  static const String title = 'Sign out of JRB CHL?';
  static const String message =
      'Return to sign-in? Saved operational records are not deleted.';

  @override
  Widget build(BuildContext context) {
    void close(bool signOut) => Navigator.of(context).pop(signOut);

    return StatusModal(
      iconAsset: AssetPaths.iconSignOutLock,
      haloColor: AppColors.signOutHalo,
      eyebrow: 'Account',
      title: title,
      message: message,
      onClose: () => close(false),
      closeLabel: 'Close and keep working',
      actions: [
        StatusModalButton.filled(
          label: 'Sign out',
          color: AppColors.statusDownText,
          onPressed: () => close(true),
        ),
        StatusModalButton.outlined(
          label: 'Keep working',
          onPressed: () => close(false),
        ),
      ],
    );
  }
}
