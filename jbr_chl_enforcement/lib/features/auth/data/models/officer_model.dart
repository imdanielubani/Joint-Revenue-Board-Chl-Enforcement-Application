import '../../domain/entities/officer.dart';

/// JSON mapping for [Officer].
abstract final class OfficerModel {
  static Officer fromJson(Map<String, dynamic> json) {
    return Officer(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
    );
  }

  static Map<String, dynamic> toJson(Officer officer) => {
    'id': officer.id,
    'name': officer.name,
    'email': officer.email,
  };
}
