.PHONY: dev-up dev-down dev-logs migrate test-backend test-edge

dev-up:
	docker compose up --build -d

dev-down:
	docker compose down

dev-logs:
	docker compose logs -f

migrate:
	docker compose exec backend alembic upgrade head

test-backend:
	docker compose exec backend pytest

test-edge:
	cargo test --package greyhook-edge
