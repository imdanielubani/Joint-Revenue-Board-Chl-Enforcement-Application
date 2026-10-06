import 'package:flutter/material.dart';

/// Sign-in screen. Placeholder until the login design is implemented.
class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: const Center(child: Text('Sign in')),
    );
  }
}
