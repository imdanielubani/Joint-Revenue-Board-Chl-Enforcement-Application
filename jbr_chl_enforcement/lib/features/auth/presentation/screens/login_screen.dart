import 'dart:async';

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

/// Sign-in screen (Figma "Login Screen", nodes 52:9138 default, 52:9330
/// filled, 52:9234 signing in, 52:9185 error and 52:9282 success).
///
/// Green header with the form on a white sheet. The page scrolls when space
/// is short (small phones, landscape, keyboard open, large text); otherwise
/// the sheet fills the screen and the Sign in button sits near the bottom.
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
            builder: (context, viewport) {
              // Side space that caps content at _maxContentWidth on tablets.
              // Applied as padding: a max-width box would misreport its
              // intrinsic height to the IntrinsicHeight below.
              final inset = EdgeInsets.symmetric(
                horizontal: ((viewport.maxWidth - _maxContentWidth) / 2).clamp(
                  0,
                  double.infinity,
                ),
              );
              return SingleChildScrollView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: viewport.maxHeight),
                  child: IntrinsicHeight(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SafeArea(
                          bottom: false,
                          child: Padding(
                            padding: inset,
                            child: const Padding(
                              padding: EdgeInsets.fromLTRB(16, 39, 16, 71),
                              child: LoginHeader(),
                            ),
                          ),
                        ),
                        Expanded(
                          child: DecoratedBox(
                            decoration: const BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.vertical(
                                top: Radius.circular(_sheetRadius),
                              ),
                            ),
                            child: SafeArea(
                              top: false,
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
                                    onInputChanged: controller.onInputChanged,
                                    onForgotPassword: () => context.pushNamed(
                                      RouteNames.forgotPassword,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
