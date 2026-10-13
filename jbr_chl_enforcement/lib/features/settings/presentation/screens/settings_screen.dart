import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/extensions/context_extensions.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../../shared/ui/widgets/header_icon_button.dart';
import '../../../../shared/ui/widgets/screen_heading.dart';
import '../../../notifications/presentation/providers/notifications_controller.dart';
import '../../../offline_sync/presentation/providers/sync_controller.dart';
import '../providers/settings_controller.dart';
import '../widgets/settings_section.dart';
import '../widgets/settings_tile.dart';

/// App settings ("My Preferences"): notifications and device permissions,
/// password, and offline sync.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  static const double _maxContentWidth = 560;

  /// The Sync queue row's line, e.g. "2 local records awaiting
  /// synchronization".
  static String queueSummary(int pending) => switch (pending) {
    0 => 'No local records awaiting synchronization',
    1 => '1 local record awaiting synchronization',
    _ => '$pending local records awaiting synchronization',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadNotificationCountProvider);
    final alertsOn = ref.watch(deviceAlertsProvider).value ?? true;
    final permissionsOn = ref.watch(devicePermissionsProvider).value ?? false;
    final permissions = ref.read(devicePermissionsProvider.notifier);
    final pending = ref.watch(pendingSyncCountProvider);

    return GreenHeaderScaffold(
      title: 'My Preferences',
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
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: _maxContentWidth),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const ScreenHeading(
                    heading: 'App settings',
                    description: 'Manage how the app works for you.',
                  ),
                  const SizedBox(height: 16),
                  SettingsSection(
                    title: 'Preferences',
                    children: [
                      SettingsSwitchTile(
                        iconAsset: AssetPaths.iconRowBell,
                        title: 'Notifications',
                        subtitle:
                            'Device alerts only. Your inbox stays available.',
                        value: alertsOn,
                        onChanged: ref.read(deviceAlertsProvider.notifier).set,
                      ),
                      SettingsSwitchTile(
                        iconAsset: AssetPaths.iconRowDevice,
                        title: 'Permissions & devices',
                        subtitle: 'App access to camera and location.',
                        value: permissionsOn,
                        onChanged: (_) => permissions.toggle(),
                      ),
                      SettingsLinkRow(
                        label: 'Review access details',
                        onTap: permissions.reviewInSettings,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SettingsSection(
                    title: 'Account protection',
                    children: [
                      SettingsTile(
                        iconAsset: AssetPaths.iconRowLock,
                        title: 'Security',
                        subtitle: 'Change your CHL password',
                        onTap: () =>
                            context.pushNamed(RouteNames.changePassword),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SettingsSection(
                    title: 'Saved work',
                    children: [
                      SettingsTile(
                        iconAsset: AssetPaths.iconRowSync,
                        title: 'Offline sync',
                        subtitle: 'Review connection and sync status',
                        onTap: () => context.pushNamed(RouteNames.syncStatus),
                      ),
                      SettingsTile(
                        iconAsset: AssetPaths.iconRowDatabase,
                        title: 'Sync queue',
                        subtitle: queueSummary(pending),
                        onTap: () => context.pushNamed(RouteNames.syncQueue),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
