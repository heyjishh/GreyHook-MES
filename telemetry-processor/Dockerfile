FROM rust:1.82-bookworm AS builder

RUN apt-get update && apt-get install -y \
    cmake \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY Cargo.toml Cargo.lock ./

COPY telemetry-processor/Cargo.toml ./telemetry-processor/
RUN mkdir -p telemetry-processor/src && echo 'fn main(){}' > telemetry-processor/src/main.rs && touch telemetry-processor/src/lib.rs

COPY edge/Cargo.toml ./edge/
RUN mkdir -p edge/src && echo 'fn main(){}' > edge/src/main.rs && touch edge/src/lib.rs

RUN cargo build --release --package greyhook-telemetry-processor && \
    rm -rf telemetry-processor/src edge/src

COPY telemetry-processor/src ./telemetry-processor/src

RUN touch telemetry-processor/src/main.rs telemetry-processor/src/lib.rs && \
    cargo build --release --package greyhook-telemetry-processor


FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/release/telemetry-processor /usr/local/bin/telemetry-processor

ENV KAFKA_BROKERS=redpanda:9092
ENV DATABASE_URL=postgresql://greyhook:devpassword@postgres:5432/greyhook_mes
ENV CONSUMER_GROUP_ID=telemetry-processor

ENTRYPOINT ["telemetry-processor"]
