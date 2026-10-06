import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/core/constants/storage_keys.dart';
import 'package:jbr_chl_enforcement/features/permissions/domain/entities/permission_step.dart';
import 'package:jbr_chl_enforcement/features/permissions/presentation/providers/permission_flow_controller.dart';
import 'package:jbr_chl_enforcement/shared/device/permissions/permission_adapter.dart';
import 'package:jbr_chl_enforcement/shared/storage/preferences_service.dart';

import '../../../helpers/fakes.dart';

void main() {
  late FakePermissionAdapter adapter;
  late FakePreferencesService preferences;

  ProviderContainer createContainer() {
    final container = ProviderContainer(
      overrides: [
        permissionAdapterProvider.overrideWithValue(adapter),
        preferencesServiceProvider.overrideWithValue(preferences),
      ],
    );
    addTearDown(container.dispose);
    return container;
  }

  Future<PermissionFlowState> load(ProviderContainer container) =>
      container.read(permissionFlowControllerProvider.future);

  PermissionFlowState current(ProviderContainer container) =>
      container.read(permissionFlowControllerProvider).requireValue;

  PermissionFlowController controller(ProviderContainer container) =>
      container.read(permissionFlowControllerProvider.notifier);

  String promptedKey(AppPermission permission) =>
      StorageKeys.permissionPrompted(permission.name);

  setUp(() {
    adapter = FakePermissionAdapter.allGranted();
    preferences = FakePreferencesService();
  });

  group('pending steps', () {
    test('none when everything is granted and GPS is on', () async {
      final state = await load(createContainer());

      expect(state.steps, isEmpty);
      expect(state.isComplete, isTrue);
    });

    test('lists denied permissions in design order', () async {
      adapter.statuses
        ..[AppPermission.notifications] = AppPermissionStatus.denied
        ..[AppPermission.camera] = AppPermissionStatus.permanentlyDenied
        ..[AppPermission.location] = AppPermissionStatus.denied;

      final state = await load(createContainer());

      expect(state.steps, [
        PermissionStep.notifications,
        PermissionStep.camera,
        PermissionStep.location,
      ]);
      expect(state.current, PermissionStep.notifications);
    });

    test('skips permissions that were already asked about', () async {
      adapter.statuses[AppPermission.camera] = AppPermissionStatus.denied;
      preferences.values[promptedKey(AppPermission.camera)] = true;

      final state = await load(createContainer());

      expect(state.steps, isEmpty);
    });

    test('skips permissions that are unavailable on the device', () async {
      adapter.statuses[AppPermission.notifications] =
          AppPermissionStatus.unavailable;

      final state = await load(createContainer());

      expect(state.steps, isEmpty);
    });

    test('adds the GPS step last when the location service is off', () async {
      adapter
        ..statuses[AppPermission.location] = AppPermissionStatus.denied
        ..locationServiceEnabled = false;

      final state = await load(createContainer());

      expect(state.steps, [
        PermissionStep.location,
        PermissionStep.gpsDisabled,
      ]);
    });
  });

  group('allow', () {
    test('requests the permission, remembers it and moves on', () async {
      adapter.statuses
        ..[AppPermission.notifications] = AppPermissionStatus.denied
        ..[AppPermission.camera] = AppPermissionStatus.denied;
      final container = createContainer();
      await load(container);

      await controller(container).allow();

      expect(adapter.requested, [AppPermission.notifications]);
      expect(
        preferences.values[promptedKey(AppPermission.notifications)],
        true,
      );
      expect(current(container).current, PermissionStep.camera);
      expect(current(container).isBusy, isFalse);
    });

    test('opens app settings for a blocked permission and continues on '
        'return', () async {
      adapter.statuses[AppPermission.camera] =
          AppPermissionStatus.permanentlyDenied;
      final container = createContainer();
      await load(container);

      await controller(container).allow();

      expect(adapter.requested, isEmpty);
      expect(adapter.appSettingsOpened, 1);
      expect(current(container).awaitingReturn, isTrue);
      expect(current(container).current, PermissionStep.camera);

      controller(container).onAppResumed();

      expect(current(container).isComplete, isTrue);
    });

    test('opens location settings for the GPS step and continues on '
        'return', () async {
      adapter.locationServiceEnabled = false;
      final container = createContainer();
      await load(container);

      await controller(container).allow();

      expect(adapter.locationSettingsOpened, 1);
      expect(current(container).isComplete, isFalse);

      controller(container).onAppResumed();

      expect(current(container).isComplete, isTrue);
    });

    test('ignores a second tap while the first is in progress', () async {
      adapter.statuses[AppPermission.notifications] =
          AppPermissionStatus.denied;
      final container = createContainer();
      await load(container);

      final first = controller(container).allow();
      final second = controller(container).allow();
      await Future.wait([first, second]);

      expect(adapter.requested, [AppPermission.notifications]);
    });
  });

  group('decline', () {
    test('remembers the permission and moves on without asking', () async {
      adapter.statuses[AppPermission.location] = AppPermissionStatus.denied;
      final container = createContainer();
      await load(container);

      await controller(container).decline();

      expect(adapter.requested, isEmpty);
      expect(preferences.values[promptedKey(AppPermission.location)], true);
      expect(current(container).isComplete, isTrue);
    });
  });

  test(
    'resuming the app without a settings hand-off changes nothing',
    () async {
      adapter.statuses[AppPermission.camera] = AppPermissionStatus.denied;
      final container = createContainer();
      await load(container);

      controller(container).onAppResumed();

      expect(current(container).current, PermissionStep.camera);
    },
  );
}
