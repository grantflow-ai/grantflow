FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    tesseract-ocr \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

FROM base AS model-download
RUN pip install --no-cache-dir "huggingface-hub[cli]" hf-transfer
RUN huggingface-cli download sentence-transformers/all-MiniLM-L12-v2

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
COPY --chown=appuser:appuser --from=model-download /root/.cache/huggingface/ /root/.cache/huggingface/
COPY --chown=appuser:appuser --from=install /app/.venv/ /app/.venv
COPY --chown=appuser:appuser services/${service_name}/src/ /app/services/${service_name}/src/
COPY --chown=appuser:appuser packages /app/packages
ENV PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    APP="services.${service_name}.src.main:app"
CMD ["sh", "-c", "uvicorn $APP --host 0.0.0.0 --log-level info"]
