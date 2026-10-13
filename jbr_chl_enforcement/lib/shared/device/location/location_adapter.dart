import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../permissions/permission_adapter.dart';

/// Whether a location can be stamped on records: the location service is on
/// and the app is allowed to use it. Updates when the service is switched
/// on or off, and is checked again whenever the app returns to the
/// foreground (permission may have been changed in the phone's settings).
final gpsStatusProvider = StreamProvider<bool>((ref) async* {
  final permissions = ref.watch(permissionAdapterProvider);

  // Recheck on return to the app; the last answer shows until then.
  final lifecycle = AppLifecycleListener(onResume: ref.invalidateSelf);
  ref.onDispose(lifecycle.dispose);

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

/// A position fix from the device.
@immutable
class DeviceLocation {
  const DeviceLocation({
    required this.latitude,
    required this.longitude,
    required this.accuracyMetres,
    required this.at,
  });

  final double latitude;
  final double longitude;

  /// Radius within which the true position lies, in metres.
  final double accuracyMetres;

  final DateTime at;
}

/// Why no position could be read.
enum LocationProblem {
  /// The location service (GPS) is switched off.
  serviceOff,

  /// The officer has not allowed the app to use the location.
  permissionDenied,

  /// No fix in time, or the platform failed.
  unavailable,
}

class LocationUnavailable implements Exception {
  const LocationUnavailable(this.problem);

  final LocationProblem problem;

  @override
  String toString() => 'LocationUnavailable: ${problem.name}';
}

final locationReaderProvider = Provider<LocationReader>(
  (ref) => GeolocatorLocationReader(ref.watch(permissionAdapterProvider)),
);

/// Reads the device's current position.
abstract class LocationReader {
  /// The current position; throws [LocationUnavailable].
  Future<DeviceLocation> current();
}

/// [LocationReader] backed by `geolocator`. Asks for location permission
/// when it has not been answered yet.
class GeolocatorLocationReader implements LocationReader {
  const GeolocatorLocationReader(this._permissions);

  final PermissionAdapter _permissions;

  /// Longest wait for a fix.
  static const Duration timeLimit = Duration(seconds: 20);

  @override
  Future<DeviceLocation> current() async {
    if (!await _permissions.isLocationServiceEnabled()) {
      throw const LocationUnavailable(LocationProblem.serviceOff);
    }
    var status = await _permissions.status(AppPermission.location);
    if (status == AppPermissionStatus.denied) {
      status = await _permissions.request(AppPermission.location);
    }
    if (status != AppPermissionStatus.granted) {
      throw const LocationUnavailable(LocationProblem.permissionDenied);
    }
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: timeLimit,
        ),
      );
      return DeviceLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMetres: position.accuracy,
        at: position.timestamp,
      );
    } catch (error) {
      debugPrint('Reading the location failed: $error');
      throw const LocationUnavailable(LocationProblem.unavailable);
    }
  }
}
