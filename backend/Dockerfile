# ---- Stage 1: Build ----
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# ---- Stage 2: Run ----
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S spring && adduser -S spring -G spring
RUN mkdir -p /app/data /app/uploads && chown -R spring:spring /app
COPY --from=build /app/target/*.jar app.jar
USER spring:spring
EXPOSE 8085
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8085/api/auth/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
