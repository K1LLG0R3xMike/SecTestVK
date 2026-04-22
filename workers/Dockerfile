FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema, Docker CLI y herramientas de seguridad
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
    && rm -rf /var/lib/apt/lists/*

# Copiar requerimientos e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del worker
COPY . .

# Comando por defecto (sobrescrito en docker-compose)
CMD ["celery", "-A", "tasks.celery_app", "worker", "--loglevel=info"]
