import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Whether the device has a network connection (Wi-Fi, mobile data,
/// ethernet or VPN), updated as it changes.
///
/// A connection does not guarantee the server can be reached; API calls
/// still handle failures themselves.
final internetStatusProvider = StreamProvider<bool>((ref) async* {
  final connectivity = Connectivity();
  try {
    yield _isOnline(await connectivity.checkConnectivity());
    yield* connectivity.onConnectivityChanged.map(_isOnline);
  } catch (error) {
    debugPrint('Connectivity check failed: $error');
    yield false;
  }
});

bool _isOnline(List<ConnectivityResult> results) =>
    results.any((result) => result != ConnectivityResult.none);
