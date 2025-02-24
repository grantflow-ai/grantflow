FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    libpq-dev \
    pandoc \
    tesseract-ocr \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

FROM base AS model-download
WORKDIR /models/
RUN pip install --no-cache-dir "huggingface-hub[cli]"
RUN huggingface-cli download sentence-transformers/all-MiniLM-L12-v2

FROM base AS install
WORKDIR /app/
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    SANIC_NO_UJSON=true

COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --verbose --frozen --no-install-project --no-editable --no-dev

FROM base AS app
WORKDIR /app/

COPY --from=model-download /root/.cache/huggingface/ /root/.cache/huggingface/
COPY --from=install /app/.venv/ /app/.venv
COPY src src

ENV PATH="/app/.venv/bin:$PATH"
RUN playwright install chromium --with-deps
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser && \
    chown -R appuser:appuser /app && \
    chmod -R u+x /app/.venv && \
    chmod -R u+x /app/src
USER appuser
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--log-level", "info"]
