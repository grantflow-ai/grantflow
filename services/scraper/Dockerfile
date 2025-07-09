FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS base
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

FROM base AS install
WORKDIR /app/
ENV UV_LINK_MODE=copy
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    libpq-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
COPY pyproject.toml uv.lock ./
COPY services/scraper/pyproject.toml services/scraper/pyproject.toml
COPY packages packages
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --all-packages --all-extras --no-editable --no-dev --compile-bytecode

FROM base AS app
WORKDIR /app/

# Install scraper-specific dependencies for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
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
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY --chown=appuser:appuser --from=install /app/.venv/ /app/.venv
COPY --chown=appuser:appuser services/scraper/src/ /app/services/scraper/src/
COPY --chown=appuser:appuser packages /app/packages

ENV PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    APP="services.scraper.src.main:app" \
    PLAYWRIGHT_BROWSERS_PATH="/app/.cache/ms-playwright"

# Install Playwright system dependencies first (as root)
RUN /app/.venv/bin/python -m playwright install-deps chromium

# Create cache directory with proper permissions
RUN mkdir -p /app/.cache/ms-playwright && chown -R appuser:appuser /app/.cache

# Switch to appuser for browser installation
USER appuser

# Install Playwright browsers as appuser with explicit path
# Install both chromium and chromium-headless-shell to ensure compatibility
RUN /app/.venv/bin/python -m playwright install chromium chromium-headless-shell

# Verify Playwright installation
RUN /app/.venv/bin/python -c "from playwright.sync_api import sync_playwright; print('Playwright import successful')"

CMD ["sh", "-c", "uvicorn $APP --host 0.0.0.0 --log-level info"]