import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/navigation/route_names.dart';
import '../../../../shared/ui/widgets/app_spinner.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../domain/entities/verification_record.dart';
import '../providers/history_controller.dart';

/// One verification record. Placeholder until its design is implemented;
/// shows which plate it is about.
class HistoryRecordDetailsScreen extends ConsumerWidget {
  const HistoryRecordDetailsScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(historyProvider);
    VerificationRecord? record;
    for (final candidate in history.value ?? const <VerificationRecord>[]) {
      if (candidate.id == id) record = candidate;
    }

    final Widget body;
    if (record != null) {
      body = EmptyState(title: record.plateNumber, message: notBuiltYetMessage);
    } else if (history.isLoading) {
      body = const Center(
        child: AppSpinner(semanticLabel: 'Loading the verification record'),
      );
    } else {
      body = const EmptyState(
        title: 'Record unavailable',
        message: 'This verification record is not in your history.',
      );
    }

    return GreenHeaderScaffold(
      title: 'Verification Record',
      onBack: () {
        if (context.canPop()) {
          context.pop();
        } else {
          context.goNamed(RouteNames.history);
        }
      },
      body: body,
    );
  }
}
