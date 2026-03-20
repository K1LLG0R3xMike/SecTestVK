import subprocess
from .celery_app import celery_app
import docker

client = docker.from_env()

@celery_app.task(name="tasks.run_nmap_scan")
def run_nmap_scan(target: str):
    """
    Ejecuta un escaneo Nmap en un contenedor Docker para el target dado.
    """
    print(f"Iniciando escaneo Nmap para: {target}")
    
    try:
        # Ejemplo: ejecutar nmap oficial desde docker
        # En una versión real, usaríamos una imagen con nmap instalado
        container = client.containers.run(
            "instrumentisto/nmap",
            f"-sV {target}",
            detach=False,
            remove=True
        )
        
        output = container.decode("utf-8")
        print(f"Escaneo Nmap finalizado para {target}")
        
        # En el futuro, enviaríamos esto al Parser
        return {
            "target": target,
            "tool": "nmap",
            "output": output
        }
        
    except Exception as e:
        print(f"Error en escaneo Nmap: {str(e)}")
        return {
            "target": target,
            "tool": "nmap",
            "error": str(e)
        }
