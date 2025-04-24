FROM python:3.12-slim-bookworm AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    tesseract-ocr \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

FROM base AS model-download
RUN pip install --no-cache-dir "huggingface-hub[cli]" hf-transfer
RUN huggingface-cli download sentence-transformers/all-MiniLM-L12-v2

FROM base AS playwright-download
RUN pip install --no-cache-dir playwright && \
    playwright install chromium --with-deps

FROM base AS install
WORKDIR /app/
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    libpq-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
COPY pyproject.toml uv.lock ./
COPY backend/pyproject.toml backend/pyproject.toml
RUN --mount=from=ghcr.io/astral-sh/uv,source=/uv,target=/bin/uv \
    uv sync --no-cache --locked --no-install-project --no-editable --no-dev --compile-bytecode
RUN find /app/.venv -type d -name '__pycache__' -exec rm -r {} + && \
    find /app/.venv -type f -name '*.pyc' -delete && \
    find /app/.venv -name "*.dist-info" -type d -exec rm -rf {} + && \
    find /app/.venv -type d -name 'tests' -exec rm -rf {} +

FROM base AS app
WORKDIR /app/
ARG PORT=8000

COPY --chown=appuser:appuser --from=model-download /root/.cache/huggingface/ /root/.cache/huggingface/
COPY --chown=appuser:appuser --from=playwright-download /root/.cache/ms-playwright/ /root/.cache/ms-playwright/
COPY --chown=appuser:appuser --from=install /app/.venv/ /app/.venv
COPY --chown=appuser:appuser backend/src/ src/

ENV PORT=$PORT \
    PYTHONPATH=/app/ \
    PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:$PATH"

USER appuser
CMD ["litestar", "--app", "src.api.main:app", "run", "--host", "0.0.0.0", "--port", "$PORT"]
