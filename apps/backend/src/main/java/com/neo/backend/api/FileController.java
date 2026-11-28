package com.neo.backend.api;

import com.neo.backend.config.NeoProperties;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final NeoProperties properties;

    public FileController(NeoProperties properties) {
        this.properties = properties;
    }

    @GetMapping("/{name:.+}")
    public ResponseEntity<Resource> download(@PathVariable String name) throws java.io.IOException {
        Path dir = Paths.get(properties.storageDir()).toAbsolutePath().normalize();
        String safeName = Paths.get(name).getFileName().toString();
        if (!safeName.equals(name) || safeName.contains("..")) {
            return ResponseEntity.badRequest().build();
        }
        Path file = dir.resolve(safeName).normalize();
        if (!file.startsWith(dir) || !Files.isRegularFile(file)) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = new FileSystemResource(file);
        String contentType = MediaTypeFactory.getMediaType(resource)
                .map(Object::toString)
                .orElse("application/octet-stream");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + safeName + "\"")
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(resource);
    }
}
