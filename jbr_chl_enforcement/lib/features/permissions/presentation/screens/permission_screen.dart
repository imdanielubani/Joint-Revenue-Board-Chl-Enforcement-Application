import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/navigation/route_names.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../providers/permission_flow_controller.dart';
import '../widgets/permission_prompt.dart';
import '../widgets/permission_step_copy.dart';

/// Permission screen (Figma "Notification Permission", "Camera Permission",
/// "Location Permission" and "GPS Disabled", nodes 52:10568, 52:10591,
/// 52:10614 and 52:10637).
///
/// Walks through the pending permission steps, then continues to sign-in.
class PermissionScreen extends ConsumerStatefulWidget {
  const PermissionScreen({super.key});

  @override
  ConsumerState<PermissionScreen> createState() => _PermissionScreenState();
}

class _PermissionScreenState extends ConsumerState<PermissionScreen> {
  late final AppLifecycleListener _lifecycle;
  bool _leaving = false;

  @override
  void initState() {
    super.initState();
    // Settings are opened outside the app; continue when the user returns.
    _lifecycle = AppLifecycleListener(
      onResume: () =>
          ref.read(permissionFlowControllerProvider.notifier).onAppResumed(),
    );
    ref.listenManual(
      permissionFlowControllerProvider,
      _leaveWhenDone,
      fireImmediately: true,
    );
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    super.dispose();
  }

  void _leaveWhenDone(
    AsyncValue<PermissionFlowState>? previous,
    AsyncValue<PermissionFlowState> next,
  ) {
    final done = next.hasError || (next.value?.isComplete ?? false);
    if (!done || _leaving) return;
    _leaving = true;
    // Reached from initState when nothing is pending; navigate after the
    // first frame.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.goNamed(RouteNames.login);
    });
  }

  @override
  Widget build(BuildContext context) {
    final flow = ref.watch(permissionFlowControllerProvider).value;
    final step = flow?.current;
    final controller = ref.read(permissionFlowControllerProvider.notifier);

    return GreenHeaderScaffold(
      title: 'Permission',
      body: AnimatedSwitcher(
        duration: MediaQuery.disableAnimationsOf(context)
            ? Duration.zero
            : const Duration(milliseconds: 250),
        child: step == null
            ? const SizedBox.expand()
            : PermissionPrompt(
                key: ValueKey(step),
                iconAsset: step.iconAsset,
                title: step.title,
                message: step.message,
                allowLabel: step.allowLabel,
                onAllow: controller.allow,
                declineLabel: step.declineLabel,
                onDecline: controller.decline,
                isBusy: flow?.isBusy ?? false,
              ),
      ),
    );
  }
}
