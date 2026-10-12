import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/agent_access.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/officer.dart';

void main() {
  Officer withRole(String? role) =>
      Officer(id: '1', name: 'A', email: 'a@jbr.com', role: role);

  test('allows the enforcement agent role however it is written', () {
    for (final role in [
      'Enforcement Agent',
      'ENFORCEMENT_AGENT',
      'enforcement-agent',
      '  enforcement agent  ',
    ]) {
      expect(AgentAccessPolicy.allows(withRole(role)), isTrue, reason: role);
    }
  });

  test('refuses other roles, and officers without a role', () {
    for (final role in [
      null,
      '',
      'Revenue Clerk',
      'Agent',
      'Enforcement',
      'Enforcement Agent Trainee',
    ]) {
      expect(AgentAccessPolicy.allows(withRole(role)), isFalse, reason: role);
    }
  });

  test('normalizes roles to lowercase words joined by underscores', () {
    expect(
      AgentAccessPolicy.normalize(' Field  Enforcement-Agent '),
      'field_enforcement_agent',
    );
    expect(AgentAccessPolicy.normalize('__Agent__'), 'agent');
  });
}
