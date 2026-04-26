import subprocess
import json
import re
from .celery_app import celery_app
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime

# Definición local mínima de modelos para que el worker funcione sin dependencias del backend
Base = declarative_base()

class Scan(Base):
    __tablename__ = "scans"
    id = Column(Integer, primary_key=True, index=True)
    target_id = Column(Integer)
    status = Column(String)
    progress = Column(Integer)
    logs = Column(Text)
    start_time = Column(DateTime)
    end_time = Column(DateTime)

class Finding(Base):
    __tablename__ = "findings"
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"))
    title = Column(String)
    description = Column(Text)
    severity = Column(String)
    tool = Column(String)
    evidence = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

# Configuración de la DB para el worker
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sectest:sectest123@db:5432/sectest_vk")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def update_scan_status(scan_id, status, progress=None):
    session = SessionLocal()
    try:
        scan = session.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.status = status
            if progress is not None:
                scan.progress = progress
            if status == "completed":
                scan.end_time = datetime.utcnow()
                scan.progress = 100
            session.commit()
            print(f"Status updated to {status} for scan {scan_id}")
    except Exception as e:
        print(f"Error updating status: {e}")
    finally:
        session.close()

def append_scan_logs(scan_id, new_log_text):
    session = SessionLocal()
    try:
        scan = session.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            if scan.logs:
                scan.logs += new_log_text
            else:
                scan.logs = new_log_text
            session.commit()
    except Exception as e:
        print(f"Error appending logs: {e}")
    finally:
        session.close()

import subprocess
import json
import re
import concurrent.futures
from .celery_app import celery_app
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime
import requests
import shutil

# ... (definiciones de modelos y DB siguen igual)

def run_tool_safely(scan_id, tool_name, func, *args):
    if not shutil.which(tool_name) and not os.path.exists(tool_name):
        append_scan_logs(scan_id, f"[SYSTEM] Warning: {tool_name} not found in system. Skipping tool...\n")
        return False
    try:
        func(scan_id, *args)
        return True
    except Exception as e:
        append_scan_logs(scan_id, f"[SYSTEM] Error running {tool_name}: {str(e)}\n")
        return False

@celery_app.task(name="tasks.run_combined_scan", bind=True)
def run_combined_scan(self, scan_id, target: str, config: dict):
    update_scan_status(scan_id, "running", progress=5)
    append_scan_logs(scan_id, f"--- Starting Automated Security Pipeline for {target} ---\n")
    append_scan_logs(scan_id, f"[SYSTEM] Configuration: {json.dumps(config, indent=2)}\n")

    # Limpiar el target para herramientas que no aceptan http
    domain_target = target.replace("https://", "").replace("http://", "").split("/")[0]
    
    # Ejecutar herramientas secuencialmente para evitar sobrecarga y conflictos
    if config.get("nmap"):
        update_scan_status(scan_id, "running", progress=10)
        run_tool_safely(scan_id, "nmap", run_nmap_tool, domain_target)
    
    if config.get("gobuster") and target.startswith("http"):
        update_scan_status(scan_id, "running", progress=30)
        run_tool_safely(scan_id, "gobuster", run_gobuster_tool, target)

    if config.get("whatweb") and target.startswith("http"):
        update_scan_status(scan_id, "running", progress=50)
        run_tool_safely(scan_id, "whatweb", run_whatweb_tool, target)

    if config.get("sslscan"):
        update_scan_status(scan_id, "running", progress=60)
        run_tool_safely(scan_id, "sslscan", run_sslscan_tool, domain_target)

    if config.get("nuclei") and target.startswith("http"):
        update_scan_status(scan_id, "running", progress=80)
        run_tool_safely(scan_id, "nuclei", run_nuclei_tool, target)

    if config.get("nikto") and target.startswith("http"):
        update_scan_status(scan_id, "running", progress=90)
        # Nikto puede estar en /usr/local/bin/nikto o nikto.pl
        tool_cmd = "nikto" if shutil.which("nikto") else "/opt/nikto/program/nikto.pl"
        run_tool_safely(scan_id, tool_cmd, run_nikto_tool, target)

    update_scan_status(scan_id, "completed")
    append_scan_logs(scan_id, "--- Pipeline Execution Finished ---\n")
    return {"status": "completed"}

def run_nmap_tool(scan_id, target):
    append_scan_logs(scan_id, f"[NMAP] Starting scan...\n")
    process = subprocess.Popen(
        ["nmap", "-sV", "-T4", "-F", "-v", target],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    output = ""
    for line in process.stdout:
        output += line
        append_scan_logs(scan_id, f"[NMAP] {line}")
    process.wait()
    findings = parse_nmap_output(output)
    save_findings(scan_id, findings, "nmap", output)

def run_gobuster_tool(scan_id, target):
    # Lógica mejorada de wildcard para detectar comportamientos como el de Vercel (403/404 con longitud fija)
    exclude_lengths = set()
    try:
        # Probamos con 2 URLs aleatorias para confirmar longitud constante
        for i in range(2):
            random_url = f"{target.rstrip('/')}/wildcard_probe_{datetime.utcnow().timestamp()}_{i}"
            probe_res = requests.get(random_url, timeout=10, verify=False)
            
            # Si el servidor responde con un código que no sea 404 real (o incluso si es 404 pero Gobuster se queja)
            # capturamos la longitud para excluirla.
            length = str(len(probe_res.content))
            exclude_lengths.add(length)
            append_scan_logs(scan_id, f"[GOBUSTER] Wildcard probe {i+1}: Status {probe_res.status_code}, Length {length}\n")
    except Exception as e:
        append_scan_logs(scan_id, f"[GOBUSTER] Wildcard probe failed: {str(e)}\n")

    cmd = ["gobuster", "dir", "-u", target, "-w", "/opt/wordlists/common.txt", "-t", "50", "-v", "--no-error"]
    
    if exclude_lengths:
        cmd.extend(["--exclude-length", ",".join(exclude_lengths)])
        append_scan_logs(scan_id, f"[GOBUSTER] Excluding lengths: {','.join(exclude_lengths)}\n")

    append_scan_logs(scan_id, f"[GOBUSTER] Starting directory discovery...\n")
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    output = ""
    for line in process.stdout:
        output += line
        append_scan_logs(scan_id, f"[GOBUSTER] {line}")
    process.wait()
    findings = parse_gobuster_output(output)
    save_findings(scan_id, findings, "gobuster", output)

def run_whatweb_tool(scan_id, target):
    append_scan_logs(scan_id, f"[WHATWEB] Identifying technologies...\n")
    result = subprocess.run(["whatweb", "-v", target], capture_output=True, text=True)
    append_scan_logs(scan_id, f"[WHATWEB] Output captured.\n")
    
    findings = []
    output = result.stdout
    # Extraer tecnologías del output verbose de WhatWeb
    tech_pattern = re.compile(r"\[\s*([^\]]+)\s*\]")
    for line in output.split('\n'):
        if "Summary" in line:
            techs = tech_pattern.findall(line)
            if techs:
                findings.append({
                    "title": "Technology Stack Identified",
                    "description": f"Se identificaron las siguientes tecnologías: {', '.join(techs)}",
                    "severity": "info"
                })
    
    if not findings:
        findings.append({
            "title": "WhatWeb Analysis Complete",
            "description": "Se completó el análisis de tecnologías sin hallazgos específicos.",
            "severity": "info"
        })
    save_findings(scan_id, findings, "whatweb", output)

def run_sslscan_tool(scan_id, target):
    append_scan_logs(scan_id, f"[SSLSCAN] Testing SSL/TLS configuration...\n")
    result = subprocess.run(["sslscan", "--no-colour", target], capture_output=True, text=True)
    append_scan_logs(scan_id, f"[SSLSCAN] Output captured.\n")
    
    findings = []
    output = result.stdout
    
    if "TLSv1.0" in output or "TLSv1.1" in output:
        findings.append({
            "title": "Weak TLS Protocol Supported",
            "description": "El servidor soporta TLS 1.0 o 1.1, los cuales son considerados obsoletos e inseguros.",
            "severity": "medium"
        })
    
    if "Heartbleed" in output and "vulnerable" in output.lower():
        findings.append({
            "title": "SSL Heartbleed Vulnerability",
            "description": "El servidor parece ser vulnerable a Heartbleed (CVE-2014-0160).",
            "severity": "critical"
        })

    if "Expired" in output:
        findings.append({
            "title": "SSL Certificate Expired",
            "description": "El certificado SSL del servidor ha expirado.",
            "severity": "high"
        })

    save_findings(scan_id, findings, "sslscan", output)

def run_nuclei_tool(scan_id, target):
    append_scan_logs(scan_id, f"[NUCLEI] Running vulnerability templates...\n")
    # Nuclei necesita actualizar templates al menos una vez
    append_scan_logs(scan_id, f"[NUCLEI] Updating templates...\n")
    update_res = subprocess.run(["nuclei", "-ut"], capture_output=True, text=True)
    if update_res.returncode != 0:
        append_scan_logs(scan_id, f"[NUCLEI] Template update warning (exit {update_res.returncode}).\n")
        if update_res.stdout:
            append_scan_logs(scan_id, f"[NUCLEI] {update_res.stdout}\n")
        if update_res.stderr:
            append_scan_logs(scan_id, f"[NUCLEI] {update_res.stderr}\n")
    
    # Optimizamos Nuclei para evitar el error de "unresponsive" en targets lentos o protegidos
    # -ni: no-interactivity
    # -stats: mostrar estadísticas (ayuda a ver progreso)
    # -retries 2: menos reintentos para no ser bloqueado
    # -mhe 3: max host errors antes de saltar
    # -H: User-Agent personalizado para evitar bloqueos básicos
    # -passive: si el target falla, intentar modo pasivo
    process = subprocess.Popen(
        [
            "nuclei", "-u", target, 
            "-severity", "low,medium,high,critical", 
            "-no-color", "-ni", "-stats", "-timeout", "10", "-retries", "2",
            "-mhe", "10",
            "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1
    )
    
    output = ""
    findings = []
    # Nuclei format: [info] [template-id] target [evidence]
    # Example: [medium] [cors-misconfiguration] https://example.com [Access-Control-Allow-Origin: *]
    
    for line in process.stdout:
        output += line
        append_scan_logs(scan_id, f"[NUCLEI] {line}")
        
        # Parse logic for nuclei
        match = re.search(r"\[(info|low|medium|high|critical)\]\s+\[([^\]]+)\]\s+([^\s]+)", line)
        if match:
            severity, template_id, target_url = match.groups()
            findings.append({
                "title": f"Nuclei: {template_id}",
                "description": f"Se detectó una vulnerabilidad mediante el template '{template_id}' en {target_url}.",
                "severity": severity
            })
            
    process.wait()
    if process.returncode != 0:
        append_scan_logs(scan_id, f"[NUCLEI] Finished with exit code {process.returncode}\n")
    save_findings(scan_id, findings, "nuclei", output)

def run_nikto_tool(scan_id, target):
    # Obtener el comando correcto de nikto
    tool_cmd = "nikto" if shutil.which("nikto") else "/opt/nikto/program/nikto.pl"
    
    append_scan_logs(scan_id, f"[NIKTO] Starting web server vulnerability scan using {tool_cmd}...\n")
    # Nikto a veces tarda mucho, limitamos el escaneo
    # Aseguramos que los logs fluyan correctamente usando -Display V (verbose)
    process = subprocess.Popen(
        [tool_cmd, "-h", target, "-Tuning", "1,2,3,4,5,7,8,9,0", "-nointeractive", "-Display", "V"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1
    )
    
    output = ""
    findings = []
    # Nikto format: + OSVDB-3092: /admin/: This might be interesting...
    
    for line in process.stdout:
        output += line
        # Limpiar caracteres extraños si los hay
        clean_line = line.strip()
        if clean_line:
            append_scan_logs(scan_id, f"[NIKTO] {clean_line}\n")
        
        if line.startswith("+ "):
            content = line[2:].strip()
            severity = "low"
            if any(kw in content.lower() for kw in ["vulnerability", "vulnerable", "exploit", "critical"]):
                severity = "high"
            elif any(kw in content.lower() for kw in ["warning", "outdated", "misconfiguration"]):
                severity = "medium"
                
            findings.append({
                "title": f"Nikto Finding: {content[:50]}...",
                "description": content,
                "severity": severity
            })
            
    process.wait()
    save_findings(scan_id, findings, "nikto", output)

def save_findings(scan_id, findings, tool, evidence):
    session = SessionLocal()
    try:
        for f in findings:
            session.add(Finding(
                scan_id=scan_id, title=f["title"], 
                description=f["description"], severity=f["severity"],
                tool=tool, evidence=evidence
            ))
        session.commit()
    finally:
        session.close()

# ... (los parsers de nmap y gobuster se mantienen)

def parse_nmap_output(output):
    findings = []
    pattern = re.compile(r"(\d+)/(\w+)\s+(open)\s+([^\s]+)\s*(.*)")
    for line in output.split('\n'):
        match = pattern.search(line)
        if match:
            port, proto, status, service, version = match.groups()
            severity = "info"
            if port in ["21", "22", "23", "3389"]:
                severity = "medium"
            if port in ["80", "443"]:
                severity = "low"
            findings.append({
                "title": f"Open Port: {port}/{proto} ({service})",
                "description": f"Se detectó el puerto {port} abierto ejecutando el servicio {service}. {f'Versión: {version}' if version else ''}",
                "severity": severity
            })
    return findings

def parse_gobuster_output(output):
    findings = []
    # Capturar path, status y opcionalmente el tamaño [Size: 1234]
    pattern = re.compile(r"(/[^\s]+)\s+\(Status:\s+(\d+)\)\s+\[Size:\s+(\d+)\]")
    
    # Detectar si hay un patrón de wildcard (muchos resultados con el mismo tamaño)
    size_counts = {}
    lines = output.split('\n')
    
    for line in lines:
        match = pattern.search(line)
        if match:
            _, _, size = match.groups()
            size_counts[size] = size_counts.get(size, 0) + 1

    # Si un tamaño aparece más de 10 veces, probablemente es una página de "Not Found" falsa (200 OK)
    wildcard_sizes = [size for size, count in size_counts.items() if count > 10]

    for line in lines:
        match = pattern.search(line)
        if match:
            path, status, size = match.groups()
            
            # Ignorar si coincide con un tamaño de wildcard detectado
            if size in wildcard_sizes:
                continue
                
            severity = "info"
            if status == "200":
                severity = "low"
            if any(ext in path for ext in [".env", ".git", ".config", "/admin", "/login"]):
                severity = "medium"
                
            findings.append({
                "title": f"Directory Discovered: {path}",
                "description": f"Se detectó un directorio o archivo accesible con código de estado {status} (Tamaño: {size}).",
                "severity": severity
            })
    return findings

@celery_app.task(name="tasks.run_gobuster_scan", bind=True)
def run_gobuster_scan(self, target: str):
    scan_id = self.request.id
    update_scan_status(scan_id, "running")
    # ... lógica similar para gobuster ...
