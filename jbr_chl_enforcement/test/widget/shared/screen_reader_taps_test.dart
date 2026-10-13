import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/core/constants/asset_paths.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/officer.dart';
import 'package:jbr_chl_enforcement/features/chl_trips/domain/entities/trip_status.dart';
import 'package:jbr_chl_enforcement/features/profile/presentation/widgets/profile_header.dart';
import 'package:jbr_chl_enforcement/features/settings/presentation/widgets/settings_tile.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_method.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/widgets/verification_method_tile.dart';
import 'package:jbr_chl_enforcement/features/verification_history/domain/entities/verification_record.dart';
import 'package:jbr_chl_enforcement/features/verification_history/presentation/widgets/history_list_item.dart';
import 'package:jbr_chl_enforcement/shared/ui/sheets/status_modal.dart';
import 'package:jbr_chl_enforcement/shared/ui/widgets/green_header_scaffold.dart';
import 'package:jbr_chl_enforcement/shared/ui/widgets/header_icon_button.dart';

/// Controls that merge their content into one screen-reader label must
/// still be activatable by the screen reader (double tap on TalkBack and
/// VoiceOver), not only by touch.
Future<void> _expectScreenReaderTap(
  WidgetTester tester, {
  required Widget Function(VoidCallback onTap) build,
  required Pattern label,
}) async {
  var taps = 0;
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(body: build(() => taps++)),
    ),
  );
  tester.semantics.tap(find.semantics.byLabel(label));
  await tester.pump();
  expect(taps, 1, reason: 'screen reader tap on "$label"');
}

void main() {
  testWidgets('header button', (tester) async {
    await _expectScreenReaderTap(
      tester,
      label: 'Notifications',
      build: (onTap) => HeaderIconButton(
        iconAsset: AssetPaths.iconBell,
        semanticLabel: 'Notifications',
        onPressed: onTap,
      ),
    );
  });

  testWidgets('back button', (tester) async {
    await _expectScreenReaderTap(
      tester,
      label: 'Back',
      build: (onTap) => GreenHeaderScaffold(
        title: 'Page',
        onBack: onTap,
        body: const SizedBox(),
      ),
    );
  });

  testWidgets('settings row and link row', (tester) async {
    await _expectScreenReaderTap(
      tester,
      label: RegExp('^Security'),
      build: (onTap) => SettingsTile(
        iconAsset: AssetPaths.iconRowLock,
        title: 'Security',
        subtitle: 'Change your CHL password',
        onTap: onTap,
      ),
    );
    await _expectScreenReaderTap(
      tester,
      label: 'Review access details',
      build: (onTap) =>
          SettingsLinkRow(label: 'Review access details', onTap: onTap),
    );
  });

  testWidgets('profile card', (tester) async {
    await _expectScreenReaderTap(
      tester,
      label: RegExp('Account details'),
      build: (onTap) => ProfileHeaderCard(
        officer: const Officer(id: '1', name: 'Daniel John', email: 'a@b.co'),
        onTap: onTap,
      ),
    );
  });

  testWidgets('verification method', (tester) async {
    await _expectScreenReaderTap(
      tester,
      label: RegExp('^Read RFID tag'),
      build: (onTap) => VerificationMethodTile(
        option: VerificationOption(
          iconAsset: AssetPaths.iconMethodRfid,
          title: 'Read RFID tag',
          description: 'Connect a reader and scan the haulage tag.',
          onSelected: onTap,
        ),
      ),
    );
  });

  testWidgets('verification record', (tester) async {
    await _expectScreenReaderTap(
      tester,
      label: RegExp('^ABC 123 AA'),
      build: (onTap) => VerificationRecordTile(
        record: VerificationRecord(
          id: '1',
          plateNumber: 'ABC 123 AA',
          tripStatus: TripStatus.active,
          method: VerificationMethod.rfid,
          outcome: VerificationOutcome.verified,
          recordedAt: DateTime(2026, 10, 13, 9, 34),
        ),
        onTap: onTap,
      ),
    );
  });

  testWidgets('status card close button', (tester) async {
    await _expectScreenReaderTap(
      tester,
      label: 'Close synchronization',
      build: (onTap) => SingleChildScrollView(
        child: StatusModal(
          iconAsset: AssetPaths.iconSyncModal,
          eyebrow: 'Saved work',
          title: 'Offline synchronization',
          message: 'Records are waiting.',
          actions: const [],
          onClose: onTap,
          closeLabel: 'Close synchronization',
        ),
      ),
    );
  });
}
