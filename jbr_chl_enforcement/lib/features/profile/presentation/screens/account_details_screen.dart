import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/extensions/context_extensions.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../../shared/ui/widgets/header_icon_button.dart';
import '../../../../shared/ui/widgets/initials_avatar.dart';
import '../../../../shared/ui/widgets/screen_heading.dart';
import '../../../auth/presentation/providers/session_provider.dart';
import '../../../notifications/presentation/providers/notifications_controller.dart';
import '../widgets/assignment_card.dart';

/// Account Details: the signed-in officer's identity, read-only (it is
/// managed centrally).
class AccountDetailsScreen extends ConsumerWidget {
  const AccountDetailsScreen({super.key});

  static const double _maxContentWidth = 560;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final officer = ref.watch(sessionProvider)?.officer;
    final unread = ref.watch(unreadNotificationCountProvider);

    return GreenHeaderScaffold(
      title: 'Account Details',
      headerHeight: 73,
      sheetColor: AppColors.canvas,
      onBack: context.popOrGoHome,
      trailing: HeaderIconButton(
        iconAsset: AssetPaths.iconBell,
        semanticLabel: unread > 0
            ? 'Notifications, $unread unread'
            : 'Notifications',
        badgeCount: unread,
        onPressed: () => context.goNamed(RouteNames.notifications),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: _maxContentWidth),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Padding(
                    // The heading sits 4 px further in than the card.
                    padding: EdgeInsets.symmetric(horizontal: 4),
                    child: ScreenHeading(
                      heading: 'Account details',
                      description: 'Your identity is managed by central CHL.',
                    ),
                  ),
                  const SizedBox(height: 48),
                  Center(
                    child: InitialsAvatar(
                      initials: officer?.initials ?? '',
                      size: 103,
                      fontSize: 30,
                    ),
                  ),
                  const SizedBox(height: 30),
                  AssignmentCard(officer: officer),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
