import 'package:flutter/foundation.dart';

/// The signed-in enforcement officer.
@immutable
class Officer {
  const Officer({
    required this.id,
    required this.name,
    required this.email,
    this.region,
    this.role,
  });

  final String id;
  final String name;
  final String email;

  /// State or area the officer is posted to, e.g. "Lagos State".
  final String? region;

  /// Job title, e.g. "Enforcement Agent".
  final String? role;

  /// Up to two initials from [name], e.g. "Daniel John" -> "DJ".
  String get initials {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    final first = parts.first[0];
    final last = parts.length > 1 ? parts.last[0] : '';
    return (first + last).toUpperCase();
  }

  @override
  bool operator ==(Object other) =>
      other is Officer &&
      other.id == id &&
      other.name == name &&
      other.email == email &&
      other.region == region &&
      other.role == role;

  @override
  int get hashCode => Object.hash(id, name, email, region, role);
}
