package com.neo.backend.workflow;

import com.neo.backend.config.NeoProperties;
import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.xml.parsers.DocumentBuilderFactory;
import org.flowable.engine.RepositoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

@Service
public class GitWorkflowSyncService {

    private static final Logger log = LoggerFactory.getLogger(GitWorkflowSyncService.class);
    private static final String BPMN_NAMESPACE = "http://www.omg.org/spec/BPMN/20100524/MODEL";
    private static final Pattern VERSION_DIRECTORY = Pattern.compile("v(\\d+)");

    private final NeoProperties.Workflow properties;
    private final RepositoryService repositoryService;
    private final WorkflowProcessRegistry registry;

    public GitWorkflowSyncService(
            NeoProperties properties,
            RepositoryService repositoryService,
            WorkflowProcessRegistry registry) {
        this.properties = properties.workflow();
        this.repositoryService = repositoryService;
        this.registry = registry;
    }

    @Scheduled(initialDelayString = "${neo.workflow.sync-interval-ms:30000}", fixedDelayString = "${neo.workflow.sync-interval-ms:30000}")
    public void scheduledSync() {
        if (!properties.syncEnabled()) {
            return;
        }
        try {
            syncClaimWorkflow();
        } catch (Exception exception) {
            log.error("Workflow Git synchronization failed", exception);
        }
    }

    public synchronized boolean syncClaimWorkflow() throws IOException, InterruptedException {
        if (!properties.syncEnabled() || properties.gitUri() == null || properties.gitUri().isBlank()) {
            return false;
        }

        Path repository = Path.of(properties.gitLocalDir()).toAbsolutePath().normalize();
        pull(repository);

        Path source = findClaimBpmn(repository);

        byte[] content = Files.readAllBytes(source);
        String processKey = readProcess(content).id();
        Path processDirectory = Path.of(properties.processDirectory()).toAbsolutePath().normalize();
        Path current = processDirectory.resolve(source.getFileName().toString()).normalize();
        if (Files.exists(current) && sameContent(current, content)) {
            removeStaleActiveFiles(processDirectory, current);
            registry.setClaimProcessKey(processKey);
            return false;
        }

        int version = nextVersion(processDirectory);
        Path versionDirectory = processDirectory.resolve("v" + version);
        Files.createDirectories(versionDirectory);
        Files.createDirectories(processDirectory);
        Path versionedFile = versionDirectory.resolve(source.getFileName().toString());
        Files.copy(source, versionedFile, StandardCopyOption.REPLACE_EXISTING);
        Files.copy(source, current, StandardCopyOption.REPLACE_EXISTING);
        removeStaleActiveFiles(processDirectory, current);
        Files.writeString(
                versionDirectory.resolve("publication.properties"),
                "processKey=" + processKey + System.lineSeparator()
                        + "version=" + version + System.lineSeparator()
                        + "sourceCommit=" + gitRevision(repository) + System.lineSeparator()
                        + "publishedAt=" + Instant.now() + System.lineSeparator()
                        + "sha256=" + sha256(content) + System.lineSeparator());

        repositoryService.createDeployment()
                .name("Git workflow " + processKey + " v" + version)
                .enableDuplicateFiltering()
                .addBytes(source.getFileName().toString(), content)
                .deploy();
        registry.setClaimProcessKey(processKey);
        log.info("Published {} as version {} from Git commit {}", processKey, version, gitRevision(repository));
        return true;
    }

    private void removeStaleActiveFiles(Path processDirectory, Path current) throws IOException {
        if (!Files.isDirectory(processDirectory)) {
            return;
        }
        try (DirectoryStream<Path> files = Files.newDirectoryStream(processDirectory, "*.bpmn20.xml")) {
            for (Path file : files) {
                if (!file.equals(current) && Files.isRegularFile(file)) {
                    Files.deleteIfExists(file);
                }
            }
        }
    }

    private void pull(Path repository) throws IOException, InterruptedException {
        if (!Files.isDirectory(repository.resolve(".git"))) {
            Files.createDirectories(repository.getParent());
            runGit(null, "clone", "--branch", properties.gitBranch(), properties.gitUri(), repository.toString());
            return;
        }
        runGit(repository, "fetch", "origin", properties.gitBranch());
        runGit(repository, "reset", "--hard", "origin/" + properties.gitBranch());
    }

    private String gitRevision(Path repository) throws IOException, InterruptedException {
        return runGit(repository, "rev-parse", "HEAD").trim();
    }

    private Path findClaimBpmn(Path repository) throws IOException, InterruptedException {
        List<Path> matches;
        try (var paths = Files.list(repository)) {
            matches = paths
                    .filter(Files::isRegularFile)
                    .filter(path -> isBpmnFile(path.getFileName().toString()))
                    .sorted(Comparator
                            .comparingLong((Path path) -> latestGitChange(repository, path))
                            .reversed()
                            .thenComparing(path -> path.getFileName().toString()))
                    .toList();
        }

        if (matches.isEmpty()) {
            throw new IOException("No root-level BPMN XML file found in Git repository: " + repository);
        }
        return matches.get(0);
    }

    private boolean isBpmnFile(String fileName) {
        return fileName.endsWith(".bpmn") || fileName.endsWith(".bpmn20.xml");
    }

    private long latestGitChange(Path repository, Path file) {
        try {
            String relativePath = repository.relativize(file).toString().replace('\\', '/');
            String timestamp = runGit(repository, "log", "-1", "--format=%ct", "--", relativePath).trim();
            return timestamp.isBlank() ? 0 : Long.parseLong(timestamp);
        } catch (Exception exception) {
            log.warn("Unable to read Git timestamp for {}", file, exception);
            return 0;
        }
    }

    private String runGit(Path directory, String... arguments) throws IOException, InterruptedException {
        java.util.ArrayList<String> command = new java.util.ArrayList<>();
        command.add("git");
        if (directory != null) {
            command.add("-C");
            command.add(directory.toString());
        }
        command.addAll(java.util.List.of(arguments));
        Process process = new ProcessBuilder(command).redirectErrorStream(true).start();
        String output = new String(process.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        if (process.waitFor() != 0) {
            throw new IOException("Git command failed: " + output);
        }
        return output;
    }

    private BpmnDescriptor readProcess(byte[] content) throws IOException {
        try (java.io.ByteArrayInputStream input = new java.io.ByteArrayInputStream(content)) {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            Document document = factory.newDocumentBuilder().parse(input);
            NodeList processes = document.getElementsByTagNameNS(BPMN_NAMESPACE, "process");
            Node process = processes.item(0);
            Node id = process == null ? null : process.getAttributes().getNamedItem("id");
            if (id == null || id.getNodeValue().isBlank()) {
                throw new IOException("The BPMN file has no process id");
            }
            return new BpmnDescriptor(id.getNodeValue());
        } catch (IOException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IOException("Unable to parse BPMN process id", exception);
        }
    }

    private record BpmnDescriptor(String id) {
    }

    private int nextVersion(Path processDirectory) throws IOException {
        int latest = 0;
        if (!Files.isDirectory(processDirectory)) {
            return 1;
        }
        try (DirectoryStream<Path> versions = Files.newDirectoryStream(processDirectory, "v*")) {
            for (Path version : versions) {
                Matcher matcher = VERSION_DIRECTORY.matcher(version.getFileName().toString());
                if (matcher.matches()) {
                    latest = Math.max(latest, Integer.parseInt(matcher.group(1)));
                }
            }
        }
        return latest + 1;
    }

    private boolean sameContent(Path file, byte[] content) throws IOException {
        return java.util.Arrays.equals(Files.readAllBytes(file), content);
    }

    private String sha256(byte[] content) throws IOException {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IOException("SHA-256 is unavailable", exception);
        }
    }
}