FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS base
ENV MODEL_DIR="/app/hf"
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

FROM base AS model-download
ARG service_name
RUN mkdir -p "${MODEL_DIR}"
RUN if [ "$service_name" = "indexer" ] || [ "$service_name" = "crawler" ] || [ "$service_name" = "rag" ]; then \
        pip install --no-cache-dir "huggingface-hub[cli]" hf-transfer && \
        huggingface-cli download sentence-transformers/all-MiniLM-L12-v2 --local-dir ${MODEL_DIR}; \
    fi

FROM base AS install
ARG service_name
WORKDIR /app/
ENV UV_LINK_MODE=copy
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    libpq-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
COPY pyproject.toml uv.lock ./
COPY services/${service_name}/pyproject.toml services/${service_name}/pyproject.toml
COPY packages packages
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --all-packages --all-extras --no-editable --no-dev --compile-bytecode

FROM base AS app
ARG service_name
WORKDIR /app/

RUN if [ "$service_name" = "indexer" ]; then \
        apt-get update && apt-get install -y --no-install-recommends \
        pandoc \
        tesseract-ocr \
        && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*; \
    fi

RUN if [ "$service_name" = "scraper" ]; then \
        apt-get update && apt-get install -y --no-install-recommends \
        wget \
        gnupg \
        # Playwright browser dependencies \
        libnss3 \
        libnspr4 \
        libatk-bridge2.0-0 \
        libdrm2 \
        libxkbcommon0 \
        libgtk-3-0 \
        libgbm1 \
        libasound2 \
        && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*; \
    fi

COPY --chown=appuser:appuser --from=model-download ${MODEL_DIR} ${MODEL_DIR}
COPY --chown=appuser:appuser --from=install /app/.venv/ /app/.venv
COPY --chown=appuser:appuser services/${service_name}/src/ /app/services/${service_name}/src/
COPY --chown=appuser:appuser packages /app/packages

ENV PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    APP="services.${service_name}.src.main:app" \
    PLAYWRIGHT_BROWSERS_PATH="/app/.cache/ms-playwright"

RUN if [ "$service_name" = "scraper" ]; then \
        mkdir -p /app/.cache/ms-playwright \
        && chown -R appuser:appuser /app/.cache \
        && export PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright \
        && /app/.venv/bin/python -m playwright install chromium \
        && /app/.venv/bin/python -m playwright install-deps chromium; \
    fi

USER appuser
CMD ["sh", "-c", "uvicorn $APP --host 0.0.0.0 --log-level info"]