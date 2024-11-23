FROM python:3.12-slim-bookworm AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

FROM base AS install
ENV PDM_CHECK_UPDATE=false
WORKDIR /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir pdm
COPY pyproject.toml pdm.lock ./
RUN pdm install --check --prod --no-editable

FROM base AS app
WORKDIR /app/
COPY --from=install /app/.venv/ /app/.venv
COPY echo_veritas echo_veritas
ENV PATH="/app/.venv/bin:$PATH"
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser && \
    chown -R appuser:appuser /app && \
    chmod -R u+x /app/.venv && \
    chmod -R u+x /app/echo_veritas
USER appuser
CMD ["uvicorn", "echo_veritas.main:app", "--host", "0.0.0.0", "--log-level", "info"]
