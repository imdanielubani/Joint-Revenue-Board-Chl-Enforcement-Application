import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/storage_keys.dart';
import '../../../../shared/device/permissions/permission_adapter.dart';
import '../../../../shared/storage/preferences_service.dart';
import '../../domain/entities/permission_step.dart';

final permissionFlowControllerProvider =
    AsyncNotifierProvider<PermissionFlowController, PermissionFlowState>(
      PermissionFlowController.new,
    );

@immutable
class PermissionFlowState {
  const PermissionFlowState({
    required this.steps,
    this.index = 0,
    this.isBusy = false,
    this.awaitingReturn = false,
  });

  /// Steps that still need the user's attention, in order.
  final List<PermissionStep> steps;
  final int index;

  /// A permission request or settings hand-off is in progress.
  final bool isBusy;

  /// Settings were opened; the flow moves on when the app is resumed.
  final bool awaitingReturn;

  bool get isComplete => index >= steps.length;
  PermissionStep? get current => isComplete ? null : steps[index];

  PermissionFlowState copyWith({
    int? index,
    bool? isBusy,
    bool? awaitingReturn,
  }) {
    return PermissionFlowState(
      steps: steps,
      index: index ?? this.index,
      isBusy: isBusy ?? this.isBusy,
      awaitingReturn: awaitingReturn ?? this.awaitingReturn,
    );
  }

  PermissionFlowState next() =>
      copyWith(index: index + 1, isBusy: false, awaitingReturn: false);
}

/// Decides which permission steps to show and handles the user's choices.
///
/// A permission step is shown only if the permission is not granted and the
/// app has not asked about it before, so returning users are not asked on
/// every launch; features can still request a permission when they need it.
/// The GPS step is shown whenever the location service is off.
class PermissionFlowController extends AsyncNotifier<PermissionFlowState> {
  PermissionAdapter get _adapter => ref.read(permissionAdapterProvider);
  PreferencesService get _preferences => ref.read(preferencesServiceProvider);

  @override
  Future<PermissionFlowState> build() async {
    final steps = <PermissionStep>[];
    for (final step in PermissionStep.values) {
      final permission = step.permission;
      if (permission == null) continue;
      if (await _wasPrompted(permission)) continue;
      final status = await _adapter.status(permission);
      if (status == AppPermissionStatus.denied ||
          status == AppPermissionStatus.permanentlyDenied) {
        steps.add(step);
      }
    }
    if (!await _adapter.isLocationServiceEnabled()) {
      steps.add(PermissionStep.gpsDisabled);
    }
    return PermissionFlowState(steps: steps);
  }

  /// Primary button: request the permission, or open settings where the
  /// system dialog can no longer be shown.
  Future<void> allow() async {
    final current = state.value;
    final step = current?.current;
    if (current == null || step == null || current.isBusy) return;
    state = AsyncData(current.copyWith(isBusy: true));

    var openedSettings = false;
    try {
      final permission = step.permission;
      if (permission == null) {
        openedSettings = await _adapter.openLocationSettings();
      } else {
        await _markPrompted(permission);
        final status = await _adapter.status(permission);
        if (status == AppPermissionStatus.permanentlyDenied) {
          openedSettings = await _adapter.openAppSettings();
        } else if (status == AppPermissionStatus.denied) {
          await _adapter.request(permission);
        }
      }
    } catch (error, stackTrace) {
      debugPrint('Permission step failed: $error\n$stackTrace');
    }

    if (!ref.mounted) return;
    final latest = state.requireValue;
    state = AsyncData(
      openedSettings
          ? latest.copyWith(isBusy: false, awaitingReturn: true)
          : latest.next(),
    );
  }

  /// Secondary button: move on without asking.
  Future<void> decline() async {
    final current = state.value;
    final step = current?.current;
    if (current == null || step == null || current.isBusy) return;

    final permission = step.permission;
    if (permission != null) await _markPrompted(permission);
    if (!ref.mounted) return;
    state = AsyncData(state.requireValue.next());
  }

  /// Call when the app returns to the foreground; continues after settings.
  void onAppResumed() {
    final current = state.value;
    if (current == null || !current.awaitingReturn) return;
    state = AsyncData(current.next());
  }

  Future<bool> _wasPrompted(AppPermission permission) =>
      _preferences.getBool(StorageKeys.permissionPrompted(permission.name));

  Future<void> _markPrompted(AppPermission permission) => _preferences.setBool(
    StorageKeys.permissionPrompted(permission.name),
    true,
  );
}
