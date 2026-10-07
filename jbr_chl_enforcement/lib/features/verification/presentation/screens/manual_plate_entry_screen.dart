import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/navigation/route_names.dart';
import '../../../../shared/ui/widgets/app_button.dart';
import '../../domain/entities/plate_number.dart';
import '../widgets/plate_input_field.dart';
import '../widgets/verification_page.dart';

/// Manual plate entry: the officer types the registration number, which is
/// normalised as they type, then verifies it.
///
/// "Verify Plate" stays disabled until the plate has at least
/// [PlateNumber.minLength] characters. The button sits at the bottom and
/// rises with the keyboard.
class ManualPlateEntryScreen extends StatefulWidget {
  const ManualPlateEntryScreen({super.key});

  @override
  State<ManualPlateEntryScreen> createState() => _ManualPlateEntryScreenState();
}

class _ManualPlateEntryScreenState extends State<ManualPlateEntryScreen> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _verify() {
    final plate = PlateNumber.tryParse(_controller.text);
    if (plate == null) return;
    FocusScope.of(context).unfocus();
    context.pushNamed(RouteNames.verificationResult, extra: plate);
  }

  /// Below this body height (e.g. a phone in landscape with the keyboard
  /// open) the button scrolls with the form instead of staying pinned.
  static const double _minPinnedHeight = 160;

  @override
  Widget build(BuildContext context) {
    final form = VerificationContentWidth(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const VerificationHeading(
            heading: 'Enter vehicle plate',
            description:
                'Spaces, hyphens and lowercase are corrected\n'
                'automatically.',
          ),
          const SizedBox(height: 17),
          PlateInputField(controller: _controller, onSubmitted: _verify),
        ],
      ),
    );
    final button = VerificationContentWidth(
      child: ValueListenableBuilder<TextEditingValue>(
        valueListenable: _controller,
        builder: (context, value, _) => AppButton.primary(
          label: 'Verify Plate',
          onPressed: PlateNumber.tryParse(value.text) == null ? null : _verify,
        ),
      ),
    );

    return VerificationPageScaffold(
      title: 'Manual plate entry',
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxHeight < _minPinnedHeight) {
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
              children: [form, const SizedBox(height: 16), button],
            );
          }
          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  children: [form],
                ),
              ),
              Padding(
                // 10 px above the keyboard or the bottom inset.
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                child: button,
              ),
            ],
          );
        },
      ),
    );
  }
}
