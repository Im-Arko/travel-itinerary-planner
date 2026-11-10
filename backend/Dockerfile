FROM python:3.12-slim

WORKDIR /app

# CPU runtime libraries; compilers and development headers are unnecessary.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 libgomp1 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-core.txt ./

RUN pip install --upgrade pip

RUN pip install --only-binary=:all: -r requirements.txt

COPY . .

RUN groupadd --system travel && useradd --system --gid travel --home /app travel \
    && mkdir -p /app/model_cache && chown -R travel:travel /app
ENV HF_HOME=/app/model_cache
ENV HF_HUB_DISABLE_TELEMETRY=1
ENV OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 TOKENIZERS_PARALLELISM=false
RUN python -c "from app.services.embeddings import download_snapshot; download_snapshot('all-MiniLM-L6-v2', '1110a243fdf4706b3f48f1d95db1a4f5529b4d41')" \
    && chown -R travel:travel /app/model_cache
ENV HF_HUB_OFFLINE=1
USER travel

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-proxy-headers", "--limit-concurrency", "100"]
