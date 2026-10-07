import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../permissions/permission_adapter.dart';

/// Whether a location can be stamped on records: the location service is on
/// and the app is allowed to use it. Updates when the service is switched
/// on or off.
final gpsStatusProvider = StreamProvider<bool>((ref) async* {
  final permissions = ref.watch(permissionAdapterProvider);

  Future<bool> ready(bool serviceOn) async =>
      serviceOn &&
      await permissions.status(AppPermission.location) ==
          AppPermissionStatus.granted;

  yield await ready(await permissions.isLocationServiceEnabled());

  Stream<ServiceStatus> changes;
  try {
    changes = Geolocator.getServiceStatusStream();
  } catch (error) {
    // Not available on every platform (e.g. web); keep the first answer.
    debugPrint('Location service updates unavailable: $error');
    return;
  }
  await for (final status in changes.handleError((Object error) {
    debugPrint('Location service updates failed: $error');
  })) {
    yield await ready(status == ServiceStatus.enabled);
  }
});
