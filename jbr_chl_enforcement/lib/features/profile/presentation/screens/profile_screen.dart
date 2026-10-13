import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/main_shell_scaffold.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../../shared/ui/widgets/header_icon_button.dart';
import '../../../../shared/ui/widgets/screen_heading.dart';
import '../../../auth/data/repositories/auth_repository_impl.dart';
import '../../../auth/presentation/providers/session_provider.dart';
import '../../../notifications/presentation/providers/notifications_controller.dart';
import '../../../settings/presentation/widgets/settings_section.dart';
import '../../../settings/presentation/widgets/settings_tile.dart';
import '../widgets/profile_header.dart';

/// Profile tab ("My Account"): the officer's card (opens Account Details),
/// links to Verification history and App settings, and Sign out.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  /// Widest the content grows on tablets.
  static const double _maxContentWidth = 560;

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    ref.read(sessionProvider.notifier).end();
    try {
      await ref.read(authLocalDataSourceProvider).clearSession();
    } catch (error) {
      debugPrint('Could not clear the saved session: $error');
    }
    if (context.mounted) context.goNamed(RouteNames.login);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final officer = ref.watch(sessionProvider)?.officer;
    final unread = ref.watch(unreadNotificationCountProvider);

    return GreenHeaderScaffold(
      title: 'My Account',
      onBack: () => context.goNamed(RouteNames.dashboard),
      trailing: HeaderIconButton(
        iconAsset: AssetPaths.iconBell,
        semanticLabel: unread > 0
            ? 'Notifications, $unread unread'
            : 'Notifications',
        badgeCount: unread,
        onPressed: () => context.goNamed(RouteNames.notifications),
      ),
      body: CustomScrollView(
        slivers: [
          SliverFillRemaining(
            hasScrollBody: false,
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: _maxContentWidth),
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    16,
                    16,
                    16,
                    // Sign out 28 px above the floating navigation bar. The
                    // sheet already ends above the system inset.
                    MainShellScaffold.contentBottomInset(context) -
                        MediaQuery.viewPaddingOf(context).bottom +
                        12,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const ScreenHeading(
                        heading: 'Profile',
                        description: 'Your agent identity and account access.',
                      ),
                      const SizedBox(height: 17),
                      ProfileHeaderCard(
                        officer: officer,
                        onTap: () =>
                            context.pushNamed(RouteNames.accountDetails),
                      ),
                      const SizedBox(height: 18),
                      SettingsSection(
                        title: 'Activity & account',
                        children: [
                          SettingsTile(
                            iconAsset: AssetPaths.iconRowHistory,
                            title: 'Verification history',
                            subtitle: 'Review your CHL trip status',
                            onTap: () => context.goNamed(RouteNames.history),
                          ),
                          SettingsTile(
                            iconAsset: AssetPaths.iconRowDevice,
                            title: 'App settings',
                            subtitle:
                                'Preferences, security and synchronization',
                            onTap: () => context.pushNamed(RouteNames.settings),
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),
                      const Spacer(),
                      _SignOutButton(onPressed: () => _signOut(context, ref)),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SignOutButton extends StatelessWidget {
  const _SignOutButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        foregroundColor: AppColors.destructive,
        backgroundColor: Colors.white,
        side: const BorderSide(color: AppColors.destructive, width: 1.5),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(30)),
        ),
        textStyle: const TextStyle(
          fontFamily: AppTypography.fontFamily,
          fontSize: 15,
          fontWeight: AppTypography.bold,
          letterSpacing: 0,
          height: 20.25 / 15,
        ),
      ),
      child: const Text('Sign out'),
    );
  }
}
