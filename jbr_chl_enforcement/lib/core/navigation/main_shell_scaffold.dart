import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../constants/asset_paths.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

/// Signed-in layout: the current tab with the floating green navigation bar
/// over the bottom of it.
class MainShellScaffold extends StatelessWidget {
  const MainShellScaffold({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const double _navHeight = 60;
  static const double _navMaxWidth = 350;

  /// Space below the navigation bar: clear of the system navigation / home
  /// indicator, and never less than a small margin.
  static double _navBottom(BuildContext context) =>
      math.max(8, MediaQuery.viewPaddingOf(context).bottom);

  /// Bottom padding for scrolling tab content so its end can scroll above
  /// the navigation bar.
  static double contentBottomInset(BuildContext context) =>
      _navBottom(context) + _navHeight + 16;

  static const _items = [
    _NavItem('Dashboard', AssetPaths.navDashboard),
    _NavItem('History', AssetPaths.navHistory),
    _NavItem('Notifications', AssetPaths.navNotifications),
    _NavItem('Profile', AssetPaths.navProfile),
  ];

  void _select(int index) => navigationShell.goBranch(
    index,
    // Tapping the current tab returns it to its first page.
    initialLocation: index == navigationShell.currentIndex,
  );

  @override
  Widget build(BuildContext context) {
    final bottom = _navBottom(context);

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(child: navigationShell),
          // Light veil behind the bar so content scrolling under it stays
          // distinct.
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: bottom + _navHeight + 31,
            child: const IgnorePointer(
              child: ColoredBox(color: Color(0x33EEF1E8)),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: bottom,
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: _navMaxWidth),
                child: _NavBar(
                  items: _items,
                  currentIndex: navigationShell.currentIndex,
                  onSelected: _select,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem {
  const _NavItem(this.label, this.iconAsset);

  final String label;
  final String iconAsset;
}

class _NavBar extends StatelessWidget {
  const _NavBar({
    required this.items,
    required this.currentIndex,
    required this.onSelected,
  });

  final List<_NavItem> items;
  final int currentIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: 'Main navigation',
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: const BoxDecoration(
          color: AppColors.green,
          borderRadius: BorderRadius.all(Radius.circular(34)),
          boxShadow: [
            BoxShadow(
              color: Color(0x12294D1B),
              offset: Offset(0, 9),
              blurRadius: 12,
            ),
          ],
        ),
        child: Row(
          children: [
            for (var i = 0; i < items.length; i++) ...[
              if (i > 0) const SizedBox(width: 3),
              Expanded(
                // The selected item is wider and shows its label.
                flex: i == currentIndex ? 119 : 54,
                child: _NavButton(
                  item: items[i],
                  selected: i == currentIndex,
                  onPressed: () => onSelected(i),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({
    required this.item,
    required this.selected,
    required this.onPressed,
  });

  final _NavItem item;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: item.label,
      excludeSemantics: true,
      child: Material(
        color: selected ? AppColors.navActive : Colors.transparent,
        borderRadius: const BorderRadius.all(Radius.circular(28)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onPressed,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.all(7),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SvgPicture.asset(
                      item.iconAsset,
                      width: 20,
                      height: 20,
                      excludeFromSemantics: true,
                    ),
                    if (selected) ...[
                      const SizedBox(width: 5),
                      Text(
                        item.label,
                        style: const TextStyle(
                          fontFamily: AppTypography.fontFamily,
                          fontSize: 11,
                          fontWeight: AppTypography.semiBold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
