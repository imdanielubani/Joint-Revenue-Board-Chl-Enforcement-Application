import 'package:flutter/material.dart';

import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../notifications/presentation/widgets/notifications_bell.dart';
import '../../../verification/domain/entities/scanned_qr.dart';
import '../../../verification/presentation/widgets/verification_page.dart';

/// "E-Tag receipt": what a scanned JRB E-Tag opens. Its design is not
/// ready yet, so the page says it is not available.
// TODO(e_tag): build the receipt once it is designed, from [code].
class ETagReceiptScreen extends StatelessWidget {
  const ETagReceiptScreen({super.key, this.code});

  /// The scanned E-Tag; null when the page is opened without one.
  final ScannedQr? code;

  @override
  Widget build(BuildContext context) {
    return const VerificationPageScaffold(
      title: 'E-Tag receipt',
      trailing: NotificationsBell(),
      body: EmptyState(title: 'E-Tag receipt', message: notBuiltYetMessage),
    );
  }
}
