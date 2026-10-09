package com.neo.backend.service;

import com.neo.backend.domain.Notification;
import com.neo.backend.repo.NotificationRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationInsertService {
    private final NotificationRepository notifications;

    public NotificationInsertService(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean insert(Notification notification) {
        try {
            notifications.saveAndFlush(notification);
            return true;
        } catch (DataIntegrityViolationException duplicate) {
            return false;
        }
    }
}