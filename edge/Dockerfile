FROM rust:1.82-bookworm AS builder

RUN apt-get update && apt-get install -y \
    cmake \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY Cargo.toml Cargo.lock ./

COPY edge/Cargo.toml ./edge/
RUN mkdir -p edge/src && echo 'fn main(){}' > edge/src/main.rs && touch edge/src/lib.rs

COPY telemetry-processor/Cargo.toml ./telemetry-processor/
RUN mkdir -p telemetry-processor/src && echo 'fn main(){}' > telemetry-processor/src/main.rs && touch telemetry-processor/src/lib.rs

RUN cargo build --release --package greyhook-edge && \
    rm -rf edge/src telemetry-processor/src

COPY edge/src ./edge/src

RUN touch edge/src/main.rs edge/src/lib.rs && \
    cargo build --release --package greyhook-edge


FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/release/edge-gateway /usr/local/bin/edge-gateway

ENV MQTT_BROKER_URL=mqtt://mosquitto:1883
ENV KAFKA_BROKERS=redpanda:9092
ENV GATEWAY_ID=edge-gateway-01

ENTRYPOINT ["edge-gateway"]
