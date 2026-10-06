import '../../../../core/constants/asset_paths.dart';
import '../../domain/entities/permission_step.dart';

/// Icon and wording shown for each [PermissionStep].
extension PermissionStepCopy on PermissionStep {
  String get iconAsset => switch (this) {
    PermissionStep.notifications => AssetPaths.permissionNotifications,
    PermissionStep.camera => AssetPaths.permissionCamera,
    PermissionStep.location => AssetPaths.permissionLocation,
    PermissionStep.gpsDisabled => AssetPaths.permissionGpsDisabled,
  };

  String get title => switch (this) {
    PermissionStep.notifications => 'Allow notifications',
    PermissionStep.camera => 'Allow camera',
    PermissionStep.location => 'Allow Location',
    PermissionStep.gpsDisabled => 'GPS is disabled',
  };

  String get message => switch (this) {
    PermissionStep.notifications =>
      'Get repeat-vehicle alerts, payment confirmations and sync updates.',
    PermissionStep.camera =>
      'Needed for QR, OCR plate scanning and evidence photos. '
          'Photos are captured live only.',
    PermissionStep.location =>
      'Every verification and violation is stamped with your location for '
          'legal integrity.',
    PermissionStep.gpsDisabled =>
      'Violations need a location. Without GPS, records are flagged and use '
          'your last known position.',
  };

  String get allowLabel => switch (this) {
    PermissionStep.notifications => 'Allow Notifications',
    PermissionStep.camera => 'Allow Camera',
    PermissionStep.location => 'Allow Location',
    PermissionStep.gpsDisabled => 'Turn On Location',
  };

  /// Label of the secondary button, or null when the step has none.
  String? get declineLabel =>
      this == PermissionStep.gpsDisabled ? null : 'Don’t Allow';
}
