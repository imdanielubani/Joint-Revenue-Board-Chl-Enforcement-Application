import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/app_notification.dart';
import 'notification_style.dart';

/// A notification in the inbox: icon, title (with a green dot while
/// unread), summary and "Category · time · Read". Tapping opens it.
class NotificationTile extends StatelessWidget {
  const NotificationTile({
    super.key,
    required this.notification,
    required this.onTap,
  });

  final AppNotification notification;
  final VoidCallback onTap;

  static const TextStyle _secondary = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontWeight: AppTypography.regular,
    letterSpacing: 0,
    color: AppColors.mutedText,
  );

  @override
  Widget build(BuildContext context) {
    final notification = this.notification;
    final type = notification.type;
    final unread = !notification.isRead;

    return Semantics(
      container: true,
      button: true,
      label: [
        notification.title,
        if (unread) 'Unread',
        notification.summary,
        NotificationDates.inboxLine(notification),
      ].join('. '),
      // The tap is declared here: excluding the children drops theirs.
      onTap: onTap,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 18),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 37.987,
                height: 37.987,
                decoration: BoxDecoration(
                  color: type.tint,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: SvgPicture.asset(
                  type.icon,
                  width: 21,
                  height: 21,
                  excludeFromSemantics: true,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: const TextStyle(
                              fontFamily: AppTypography.fontFamily,
                              fontSize: 14,
                              fontWeight: AppTypography.semiBold,
                              letterSpacing: 0,
                              height: 1.5,
                              color: AppColors.forest,
                            ),
                          ),
                        ),
                        if (unread) ...[
                          const SizedBox(width: 8),
                          Container(
                            width: 6.994,
                            height: 6.994,
                            decoration: const BoxDecoration(
                              color: AppColors.green,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 7),
                    Text(
                      notification.summary,
                      style: _secondary.copyWith(
                        fontSize: 13,
                        height: 21.45 / 13,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      NotificationDates.inboxLine(notification),
                      style: _secondary.copyWith(fontSize: 11, height: 1.6),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: SvgPicture.asset(
                  AssetPaths.iconNotificationChevron,
                  width: 15.9937,
                  height: 15.9937,
                  excludeFromSemantics: true,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
