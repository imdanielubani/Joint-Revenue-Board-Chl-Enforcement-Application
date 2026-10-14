import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/app/app.dart';
import 'package:jbr_chl_enforcement/app/environment/app_environment.dart';

void main() {
  group('flavor', () {
    test('from --flavor, else from APP_ENV, else dev', () {
      expect(AppFlavor.resolve('staging', 'prod'), AppFlavor.staging);
      expect(AppFlavor.resolve(null, 'prod'), AppFlavor.prod);
      expect(AppFlavor.resolve('', 'production'), AppFlavor.prod);
      expect(AppFlavor.resolve(null, ' Staging '), AppFlavor.staging);
      expect(AppFlavor.resolve(null, ''), AppFlavor.dev);
      expect(AppFlavor.resolve('qa', ''), AppFlavor.dev);
    });

    test('only production has no banner', () {
      expect(AppFlavor.dev.bannerLabel, 'DEV');
      expect(AppFlavor.staging.bannerLabel, 'STAGING');
      expect(AppFlavor.prod.bannerLabel, isEmpty);
    });

    test('tests run as dev, with no API and no demo data', () {
      expect(AppEnvironment.flavor, AppFlavor.dev);
      expect(AppEnvironment.isProduction, isFalse);
      expect(AppEnvironment.hasApi, isFalse);
    });
  });

  group('API address', () {
    test('https always; http only in debug builds', () {
      const https = 'https://api.jrb.gov.ng/api/v1';
      const http = 'http://10.0.2.2:4000/api/v1';
      expect(AppEnvironment.isUsableApiUrl(https, release: true), isTrue);
      expect(AppEnvironment.isUsableApiUrl(http, release: false), isTrue);
      expect(AppEnvironment.isUsableApiUrl(http, release: true), isFalse);
    });

    test('missing or malformed is not usable', () {
      for (final url in ['', '   ', 'api.jrb.gov.ng', 'ftp://x.gov.ng']) {
        expect(AppEnvironment.isUsableApiUrl(url, release: false), isFalse);
      }
    });
  });

  test('config files: one per flavor, production on https or unset', () {
    for (final flavor in AppFlavor.values) {
      final file = File('config/${flavor.name}.json');
      final config =
          jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
      expect(AppFlavor.resolve(null, config['APP_ENV'] as String), flavor);
      final url = config['API_BASE_URL'] as String;
      if (flavor != AppFlavor.dev && url.isNotEmpty) {
        expect(url, startsWith('https://'), reason: file.path);
      }
    }
  });

  group('FlavorBanner', () {
    testWidgets('shows the label over the screen', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          debugShowCheckedModeBanner: false,
          home: FlavorBanner(label: 'STAGING', child: Text('screen')),
        ),
      );
      expect(find.text('screen'), findsOneWidget);
      expect(find.byType(Banner), findsOneWidget);
    });

    testWidgets('production shows nothing extra', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          debugShowCheckedModeBanner: false,
          home: FlavorBanner(label: '', child: Text('screen')),
        ),
      );
      expect(find.byType(Banner), findsNothing);
    });
  });
}
