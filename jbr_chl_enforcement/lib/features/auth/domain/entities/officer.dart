import 'package:flutter/foundation.dart';

/// The signed-in enforcement officer.
@immutable
class Officer {
  const Officer({required this.id, required this.name, required this.email});

  final String id;
  final String name;
  final String email;

  @override
  bool operator ==(Object other) =>
      other is Officer &&
      other.id == id &&
      other.name == name &&
      other.email == email;

  @override
  int get hashCode => Object.hash(id, name, email);
}
