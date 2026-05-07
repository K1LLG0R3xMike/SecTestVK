# Stage 1: Compilar ffuf y kiterunner (CGO_ENABLED=0 — pure Go, no C deps)
# katana NO va aquí: su dep go-tree-sitter requiere CGO; se instala via binary release
FROM golang:1.22-alpine AS go-builder
ENV CGO_ENABLED=0 GOPATH=/go

RUN apk add --no-cache git

# ffuf: soporta go install correctamente
RUN go install github.com/ffuf/ffuf/v2@latest

# kiterunner: go install falla (módulo no expone cmd/kr) — se compila desde source
RUN git clone --depth 1 https://github.com/assetnote/kiterunner /tmp/kr-src && \
    cd /tmp/kr-src && \
    go build -o /go/bin/kr ./cmd/kiterunner/ && \
    rm -rf /tmp/kr-src

# Stage 2: Imagen final del worker
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    ca-certificates \
    gnupg \
    nmap \
    gobuster \
    git \
    sslscan \
    whatweb \
    unzip \
    perl \
    libjson-perl \
    libxml-writer-perl \
    libnet-ssleay-perl \
    libio-socket-ssl-perl \
    && git clone https://github.com/sullo/nikto.git /opt/nikto \
    && ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update && apt-get install -y docker-ce-cli \
    && mkdir -p /opt/wordlists \
    && curl -L https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/common.txt -o /opt/wordlists/common.txt \
    && curl -L https://github.com/projectdiscovery/nuclei/releases/download/v3.3.0/nuclei_3.3.0_linux_amd64.zip -o nuclei.zip \
    && unzip nuclei.zip && mv nuclei /usr/local/bin/ && rm nuclei.zip \
    && curl -L https://github.com/projectdiscovery/katana/releases/download/v1.1.0/katana_1.1.0_linux_amd64.zip -o katana.zip \
    && unzip katana.zip katana && mv katana /usr/local/bin/ && rm katana.zip \
    && curl -fsSL "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/api/api-endpoints.txt" \
       -o /opt/wordlists/api-endpoints.txt \
    && rm -rf /var/lib/apt/lists/*

# Copiar binarios compilados desde el stage de Go (katana se instala via binary release arriba)
COPY --from=go-builder /go/bin/ffuf  /usr/local/bin/ffuf
COPY --from=go-builder /go/bin/kr    /usr/local/bin/kr

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["celery", "-A", "tasks.celery_app", "worker", "--loglevel=info"]
