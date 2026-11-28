package com.neo.backend.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.neo.backend.service.ClaimService;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

@SpringBootTest
@AutoConfigureMockMvc
class FileAndIdSecurityTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ClaimService claims;

    @Test
    void filesRequireLogin() throws Exception {
        mvc.perform(MockMvcRequestBuilders.get("/api/files/anything.pdf"))
                .andExpect(MockMvcResultMatchers.status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "tester")
    void concurrentCreatesGetDifferentNumbers() throws Exception {
        try (var pool = Executors.newFixedThreadPool(2)) {
            List<Callable<String>> jobs = List.of(
                    () -> claims.create("tester", Map.of("claimType", "Risk")).getLineId(),
                    () -> claims.create("tester", Map.of("claimType", "Risk")).getLineId());
            List<Future<String>> done = pool.invokeAll(jobs);
            assertThat(done.get(0).get()).isNotEqualTo(done.get(1).get());
        }
    }
}
