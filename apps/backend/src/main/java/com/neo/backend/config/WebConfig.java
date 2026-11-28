package com.neo.backend.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WebConfig {

    private static final Logger log = LoggerFactory.getLogger(WebConfig.class);

    public WebConfig(NeoProperties properties) {
        Path dir = Paths.get(properties.storageDir()).toAbsolutePath().normalize();
        log.info("Uploaded documents are stored at {} and served via /api/files/** (authenticated)", dir);
    }
}
