from jinja2 import Environment, FileSystemLoader
from xhtml2pdf import pisa
import os
import io
from datetime import datetime

class ReportGenerator:
    def __init__(self):
        self.template_dir = os.path.join(os.path.dirname(__file__), "../templates")
        if not os.path.exists(self.template_dir):
            os.makedirs(self.template_dir)
        self.env = Environment(loader=FileSystemLoader(self.template_dir))

    def generate_pdf(self, scan_data: dict, ai_analysis: str) -> io.BytesIO:
        template = self.env.get_template("report_template.html")
        
        # Preparar los datos para el reporte
        report_data = {
            "target_url": scan_data.get("target", {}).get("url_or_ip", "Unknown"),
            "scan_id": scan_data.get("id", "N/A"),
            "start_time": scan_data.get("start_time", datetime.now()).strftime("%Y-%m-%d %H:%M:%S"),
            "end_time": scan_data.get("end_time", datetime.now()).strftime("%Y-%m-%d %H:%M:%S"),
            "status": scan_data.get("status", "Unknown").upper(),
            "findings": scan_data.get("findings", []),
            "ai_analysis": ai_analysis,
            "generation_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        html_content = template.render(report_data)
        
        result = io.BytesIO()
        pdf = pisa.CreatePDF(html_content, dest=result)
        
        if pdf.err:
            raise Exception(f"Error generating PDF: {pdf.err}")
        
        result.seek(0)
        return result

report_generator = ReportGenerator()
