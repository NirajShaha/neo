package com.neo.backend.service;

import com.neo.backend.domain.Notification;
import com.neo.backend.repo.NotificationRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notifications;
    private final IdentityService identity;
    private final UserEventService events;
    private final NotificationInsertService inserter;

    public NotificationService(NotificationRepository notifications, IdentityService identity,
            UserEventService events, NotificationInsertService inserter) {
        this.notifications = notifications;
        this.identity = identity;
        this.events = events;
        this.inserter = inserter;
    }

    @Transactional
    public void notify(String type, String title, String body, String refType, String refId,
            List<String> userIds, List<String> groupKeys) {
        Set<String> recipients = new HashSet<>(userIds == null ? List.of() : userIds);
        if (groupKeys != null && !groupKeys.isEmpty()) {
            recipients.addAll(identity.userIdsInGroups(groupKeys));
        }
        if (recipients.isEmpty()) {
            return;
        }
        for (String userId : recipients) {
            Notification notification = new Notification();
            notification.setUserId(userId);
            notification.setType(type);
            notification.setTitle(title);
            notification.setBody(body == null ? "" : body);
            notification.setRefType(refType);
            notification.setRefId(refId);
            String dedupeKey = String.join("|", userId, type, refType == null ? "" : refType,
                    refId == null ? "" : refId);
            notification.setDedupeKey(dedupeKey);
            if (notifications.existsByDedupeKey(dedupeKey))
                continue;
            if (inserter.insert(notification)) {
                events.publishAfterCommit(userId, "notification");
            }
        }
    }

    public List<Notification> page(String userId, int page, int size) {
        int boundedSize = Math.max(1, Math.min(size, 100));
        return notifications.findByUserIdOrderByCreatedOnDesc(userId,
                PageRequest.of(Math.max(0, page), boundedSize, Sort.by(Sort.Direction.DESC, "createdOn"))).getContent();
    }

    public long unreadCount(String userId) {
        return notifications.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markRead(String userId, String id) {
        notifications.findById(id).ifPresent(n -> {
            if (n.getUserId().equals(userId)) {
                n.setRead(true);
                notifications.save(n);
            }
        });
    }

    @Transactional
    public void markAllRead(String userId) {
        notifications.markAllRead(userId);
    }
}
