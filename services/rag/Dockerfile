FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS base
ENV HF_HOME="/app/hf-cache" \
    HUGGINGFACE_HUB_CACHE="/app/hf-cache" \
    SENTENCE_TRANSFORMERS_HOME="/app/hf-cache"
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

FROM base AS model-download
RUN mkdir -p "${HF_HOME}"
RUN pip install --no-cache-dir "huggingface-hub[cli]" hf-transfer sentence-transformers keybert && \
    python3 -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L12-v2')" && \
    python3 -c "from keybert import KeyBERT; KeyBERT()"

FROM base AS install
WORKDIR /app/
ENV UV_LINK_MODE=copy
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    libpq-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
COPY pyproject.toml uv.lock ./
COPY services/rag/pyproject.toml services/rag/pyproject.toml
COPY packages packages
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --all-packages --all-extras --no-editable --no-dev --compile-bytecode

FROM base AS app
WORKDIR /app/

COPY --chown=appuser:appuser --from=model-download ${HF_HOME} ${HF_HOME}
COPY --chown=appuser:appuser --from=install /app/.venv/ /app/.venv
COPY --chown=appuser:appuser services/rag/src/ /app/services/rag/src/
COPY --chown=appuser:appuser packages /app/packages

ENV PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    APP="services.rag.src.main:app" \
    TRANSFORMERS_OFFLINE=1 \
    HF_HUB_OFFLINE=1

USER appuser
CMD ["sh", "-c", "uvicorn $APP --host 0.0.0.0 --log-level info"]
