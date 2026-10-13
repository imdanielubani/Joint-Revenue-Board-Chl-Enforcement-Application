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
    this.agentId,
    this.assignment,
    this.organization,
  });

  final String id;
  final String name;
  final String email;

  /// State or area the officer is posted to, e.g. "Lagos State".
  final String? region;

  /// Job title, e.g. "Enforcement Agent".
  final String? role;

  /// Badge number, e.g. "JRB-AG-0142".
  final String? agentId;

  /// Line of work, e.g. "Revenue Collection".
  final String? assignment;

  /// Unit the officer belongs to, e.g. "CHL Enforcement Unit".
  final String? organization;

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
      other.role == role &&
      other.agentId == agentId &&
      other.assignment == assignment &&
      other.organization == organization;

  @override
  int get hashCode => Object.hash(
    id,
    name,
    email,
    region,
    role,
    agentId,
    assignment,
    organization,
  );
}
