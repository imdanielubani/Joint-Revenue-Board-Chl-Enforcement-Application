import '../../domain/entities/officer.dart';

/// JSON mapping for [Officer].
abstract final class OfficerModel {
  static Officer fromJson(Map<String, dynamic> json) {
    return Officer(
      id: (json['id'] ?? json['email']).toString(),
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      region: json['region'] as String?,
      role: json['role'] as String?,
      agentId: json['agentId'] as String?,
      assignment: json['assignment'] as String?,
      organization: json['organization'] as String?,
    );
  }

  static Map<String, dynamic> toJson(Officer officer) => {
    'id': officer.id,
    'name': officer.name,
    'email': officer.email,
    'region': officer.region,
    'role': officer.role,
    'agentId': officer.agentId,
    'assignment': officer.assignment,
    'organization': officer.organization,
  };
}
