FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

FROM base AS model-download
RUN pip install --no-cache-dir "huggingface-hub[cli]" hf-transfer
RUN huggingface-cli download sentence-transformers/all-MiniLM-L12-v2

FROM base AS install
WORKDIR /app/
ENV UV_LINK_MODE=copy
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    libpq-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
COPY pyproject.toml uv.lock ./
COPY services/indexer/pyproject.toml services/indexer/pyproject.toml
COPY packages packages
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --all-packages --all-extras --no-editable --no-dev --compile-bytecode

FROM base AS app
WORKDIR /app/
COPY --chown=appuser:appuser --from=model-download /root/.cache/huggingface/ /root/.cache/huggingface/
COPY --chown=appuser:appuser --from=install /app/.venv/ /app/.venv
COPY --chown=appuser:appuser services/indexer/src/ src/
ENV PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--log-level", "info"]
