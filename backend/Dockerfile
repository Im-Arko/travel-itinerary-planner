FROM python:3.12-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    gcc g++ libffi-dev libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-core.txt ./

RUN pip install --upgrade pip

RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install -r requirements.txt

COPY . .

RUN groupadd --system travel && useradd --system --gid travel --home /app travel \
    && mkdir -p /app/model_cache && chown -R travel:travel /app
ENV HF_HOME=/app/model_cache
USER travel

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-proxy-headers", "--limit-concurrency", "100"]
