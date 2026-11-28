# syntax=docker/dockerfile:1

FROM maven:3.9-eclipse-temurin-25 AS build
LABEL org.opencontainers.image.title="neo-backend"
LABEL org.opencontainers.image.description="NEO Spring Boot + Flowable API (Okta JWT resource server)"
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:25-jre
LABEL org.opencontainers.image.title="neo-backend"
LABEL org.opencontainers.image.description="NEO Spring Boot + Flowable API (Okta JWT resource server)"
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /workspace/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
