package com.neo.backend.service;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class UserEventService {
    private final Map<String, CopyOnWriteArraySet<SseEmitter>> subscribers = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String userId) {
        SseEmitter emitter = new SseEmitter(0L);
        subscribers.computeIfAbsent(userId, ignored -> new CopyOnWriteArraySet<>()).add(emitter);
        Runnable remove = () -> remove(userId, emitter);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(ignored -> remove.run());
        try {
            emitter.send(SseEmitter.event().id(UUID.randomUUID().toString()).name("connected")
                    .data(Map.of("userId", userId)));
        } catch (IOException e) {
            remove.run();
        }
        return emitter;
    }

    public void publishAfterCommit(String userId, String type) {
        if (userId == null || userId.isBlank())
            return;
        Runnable publish = () -> publish(userId, type);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publish.run();
                }
            });
        } else {
            publish.run();
        }
    }

    private void publish(String userId, String type) {
        for (SseEmitter emitter : subscribers.getOrDefault(userId, new CopyOnWriteArraySet<>())) {
            try {
                emitter.send(SseEmitter.event().id(UUID.randomUUID().toString()).name(type).data(Map.of("type", type)));
            } catch (IOException e) {
                remove(userId, emitter);
            }
        }
    }

    private void remove(String userId, SseEmitter emitter) {
        CopyOnWriteArraySet<SseEmitter> active = subscribers.get(userId);
        if (active != null) {
            active.remove(emitter);
            if (active.isEmpty())
                subscribers.remove(userId, active);
        }
    }
}