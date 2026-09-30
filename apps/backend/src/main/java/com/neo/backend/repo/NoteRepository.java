package com.neo.backend.repo;

import com.neo.backend.domain.Note;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteRepository extends JpaRepository<Note, String> {
    List<Note> findByLineIdOrderByCreatedOnAsc(String lineId);
}
