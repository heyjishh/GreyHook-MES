FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir kafka-python-ng==2.2.3 opensearch-py==2.7.1 structlog==24.4.0
COPY main.py .
CMD ["python", "-u", "main.py"]
