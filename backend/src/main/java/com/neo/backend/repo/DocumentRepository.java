package com.neo.backend.repo;

import com.neo.backend.domain.Document;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<Document, String> {
    List<Document> findByLineIdOrderByCreatedOnAsc(String lineId);
}
