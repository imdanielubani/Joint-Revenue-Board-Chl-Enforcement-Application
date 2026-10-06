import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_gradients.dart';
import '../providers/auth_controller.dart';
import '../widgets/login_form.dart';
import '../widgets/login_header.dart';

/// Sign-in screen.
///
/// The green header (logo, title, status pill) is fixed; only the white
/// sheet with the form scrolls. When space is short (keyboard open, small
/// phones, landscape) the sheet slides up over the lower part of the header
/// so the form keeps room, and scrolls inside itself.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  /// How long "Login Successful..." shows before moving on.
  static const Duration successHoldDuration = Duration(milliseconds: 1200);

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  /// Widest the content grows on tablets.
  static const double _maxContentWidth = 480;
  static const double _sheetRadius = 30;

  Timer? _exitTimer;

  @override
  void dispose() {
    _exitTimer?.cancel();
    super.dispose();
  }

  void _onStateChanged(LoginState? previous, LoginState next) {
    if (next.status != LoginStatus.success || _exitTimer != null) return;
    _exitTimer = Timer(LoginScreen.successHoldDuration, () {
      if (mounted) context.goNamed(RouteNames.dashboard);
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(loginControllerProvider, _onStateChanged);
    final state = ref.watch(loginControllerProvider);
    final controller = ref.read(loginControllerProvider.notifier);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: AppColors.surface,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: AppColors.surface,
        body: DecoratedBox(
          decoration: const BoxDecoration(gradient: AppGradients.brandHeader),
          child: LayoutBuilder(
            builder: (context, body) {
              // Side space that caps content at _maxContentWidth on tablets,
              // from the space this screen actually has. Applied as padding:
              // a max-width box would misreport its intrinsic height to the
              // sheet's IntrinsicHeight.
              final inset = EdgeInsets.symmetric(
                horizontal: math.max(0, (body.maxWidth - _maxContentWidth) / 2),
              );
              return CustomMultiChildLayout(
                delegate: _HeaderSheetLayout(
                  minSheetTop: MediaQuery.paddingOf(context).top,
                ),
                children: [
                  LayoutId(
                    id: _Slot.header,
                    child: SafeArea(
                      bottom: false,
                      child: Padding(
                        padding: inset,
                        child: const Padding(
                          padding: EdgeInsets.fromLTRB(16, 39, 16, 71),
                          child: LoginHeader(),
                        ),
                      ),
                    ),
                  ),
                  LayoutId(
                    id: _Slot.sheet,
                    child: DecoratedBox(
                      decoration: const BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.vertical(
                          top: Radius.circular(_sheetRadius),
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(_sheetRadius),
                        ),
                        child: SafeArea(
                          top: false,
                          child: LayoutBuilder(
                            builder: (context, sheet) => SingleChildScrollView(
                              keyboardDismissBehavior:
                                  ScrollViewKeyboardDismissBehavior.onDrag,
                              child: ConstrainedBox(
                                constraints: BoxConstraints(
                                  minHeight: sheet.maxHeight,
                                ),
                                child: IntrinsicHeight(
                                  child: Padding(
                                    padding: inset,
                                    child: Padding(
                                      padding: const EdgeInsets.fromLTRB(
                                        16,
                                        17,
                                        16,
                                        20,
                                      ),
                                      child: LoginForm(
                                        state: state,
                                        onSubmit: (email, password) =>
                                            controller.submit(
                                              email: email,
                                              password: password,
                                            ),
                                        onRememberChanged:
                                            controller.setRememberSession,
                                        onInputChanged:
                                            controller.onInputChanged,
                                        onForgotPassword: () =>
                                            context.pushNamed(
                                              RouteNames.forgotPassword,
                                            ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

enum _Slot { header, sheet }

/// Places the fixed header at the top and the sheet directly below it,
/// moving the sheet up over the header only as far as needed to leave it
/// [minSheetHeight] (never above the status bar).
class _HeaderSheetLayout extends MultiChildLayoutDelegate {
  _HeaderSheetLayout({required this.minSheetTop});

  /// Room the form keeps before the sheet starts covering the header: the
  /// email field and the start of the password field.
  static const double minSheetHeight = 300;

  /// The sheet never rises above this (the status bar).
  final double minSheetTop;

  @override
  void performLayout(Size size) {
    // The header takes its natural height; anything beyond the screen (very
    // large text) simply sits under the sheet.
    final headerHeight = layoutChild(
      _Slot.header,
      BoxConstraints.tightFor(width: size.width),
    ).height;
    final sheetTop = math.max(
      math.min(headerHeight, size.height - minSheetHeight),
      math.min(minSheetTop, size.height),
    );
    layoutChild(
      _Slot.sheet,
      BoxConstraints.tight(
        Size(size.width, math.max(0, size.height - sheetTop)),
      ),
    );
    positionChild(_Slot.header, Offset.zero);
    positionChild(_Slot.sheet, Offset(0, sheetTop));
  }

  @override
  bool shouldRelayout(_HeaderSheetLayout oldDelegate) =>
      oldDelegate.minSheetTop != minSheetTop;
}
