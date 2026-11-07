FROM rust:slim-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config libssl-dev cmake perl make build-essential \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY Cargo.toml ./
COPY config/ ./config/
RUN mkdir -p src && printf 'fn main() {}' > src/main.rs
RUN cargo build --release

COPY src/ ./src/
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    libssl3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /build/target/release/simulator ./

CMD ["./simulator"]
