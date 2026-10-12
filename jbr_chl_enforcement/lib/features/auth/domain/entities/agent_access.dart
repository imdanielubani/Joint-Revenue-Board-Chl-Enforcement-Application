import 'officer.dart';

/// Who may use the app as an enforcement agent.
///
/// Sign-in proves who the officer is; this decides whether that account may
/// work in the field. An officer with no role, or any other role, is
/// refused: access is only ever granted, never assumed.
abstract final class AgentAccessPolicy {
  /// Roles allowed in, in [normalize]d form.
  // TODO(auth): confirm the role names the API returns (and whether
  // supervisors may also use the app).
  static const Set<String> agentRoles = {'enforcement_agent'};

  static bool allows(Officer officer) {
    final role = officer.role;
    return role != null && agentRoles.contains(normalize(role));
  }

  /// [role] in lowercase with words joined by underscores, so
  /// "Enforcement Agent", "ENFORCEMENT_AGENT" and "enforcement-agent" match.
  static String normalize(String role) => role
      .trim()
      .toLowerCase()
      .replaceAll(RegExp('[^a-z0-9]+'), '_')
      .replaceAll(RegExp(r'^_+|_+$'), '');
}
