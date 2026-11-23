# Stage 1: Build Spring Boot JAR using Gradle
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY . .
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew
RUN ./gradlew bootJar -x test --no-daemon

# Stage 2: Run lightweight JAR on Render Free Tier (512MB RAM optimized)
FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache tesseract-ocr
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -Xmx384m -Dserver.port=${PORT:-8080} -jar app.jar"]