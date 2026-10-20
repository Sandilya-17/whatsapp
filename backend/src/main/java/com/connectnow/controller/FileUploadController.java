package com.connectnow.controller;

import com.connectnow.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping
public class FileUploadController {

    private final Path uploadDir;

    public FileUploadController(@Value("${connectnow.files.upload-dir:./uploads}") String uploadPath) {
        this.uploadDir = Paths.get(uploadPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    @PostMapping({"/api/upload", "/api/files/upload"})
    public ResponseEntity<Map<String, Object>> uploadFile(
            @AuthenticationPrincipal User currentUser,
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        long maxSize = 25 * 1024 * 1024; // 25MB
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File exceeds maximum size of 25MB");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex);
        }
        String storedName = UUID.randomUUID() + extension;

        Path targetPath = uploadDir.resolve(storedName);
        file.transferTo(targetPath.toFile());

        String fileUrl = "/uploads/" + storedName;

        return ResponseEntity.ok(Map.of(
                "url", fileUrl,
                "fileUrl", fileUrl,
                "fileName", originalFilename,
                "fileSize", file.getSize(),
                "fileType", file.getContentType() != null ? file.getContentType() : "application/octet-stream",
                "contentType", file.getContentType() != null ? file.getContentType() : "application/octet-stream"
        ));
    }
}
