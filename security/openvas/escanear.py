"""PB-04 — Escaneo de vulnerabilidades del entorno de staging con OpenVAS (Greenbone).

Crea el objetivo, lanza la tarea "Full and fast", espera a que termine y
guarda el reporte (XML + resumen) en security/openvas/reportes/ como evidencia del sprint.

Requisitos:
  pip install python-gvm
  Greenbone Community Edition corriendo (ver README.md de esta carpeta)

Uso:
  python escanear.py --host 192.168.49.2 --puertos 30080 --usuario admin --password admin
"""
import argparse
import time
from datetime import datetime
from pathlib import Path

from gvm.connections import UnixSocketConnection
from gvm.protocols.gmp import Gmp
from gvm.transforms import EtreeCheckCommandTransform

# IDs fijos que trae Greenbone por defecto
CONFIG_FULL_AND_FAST = "daba56c8-73ec-11df-a475-002264764cea"
SCANNER_OPENVAS = "08b69003-5fc2-4037-a479-93b440211c73"

SOCKET = "/tmp/gvm/gvmd/gvmd.sock"  # socket expuesto por el docker-compose oficial


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", required=True, help="IP del nodo de Kubernetes / servidor de staging")
    ap.add_argument("--puertos", default="30080", help="Puertos TCP separados por coma")
    ap.add_argument("--usuario", default="admin")
    ap.add_argument("--password", required=True)
    ap.add_argument("--socket", default=SOCKET)
    args = ap.parse_args()

    sello = datetime.now().strftime("%Y%m%d-%H%M")
    salida = Path(__file__).parent / "reportes"
    salida.mkdir(exist_ok=True)

    conn = UnixSocketConnection(path=args.socket, timeout=600)
    with Gmp(connection=conn, transform=EtreeCheckCommandTransform()) as gmp:
        gmp.authenticate(args.usuario, args.password)

        port_list = gmp.create_port_list(name=f"expediente-{sello}", port_range=f"T:{args.puertos}")
        target = gmp.create_target(name=f"staging-expediente-{sello}", hosts=[args.host],
                                   port_list_id=port_list.get("id"))
        task = gmp.create_task(name=f"Escaneo Sprint {sello}", config_id=CONFIG_FULL_AND_FAST,
                               target_id=target.get("id"), scanner_id=SCANNER_OPENVAS)
        task_id = task.get("id")
        report_id = gmp.start_task(task_id).findtext("report_id")
        print(f"Tarea {task_id} iniciada, reporte {report_id}")

        while True:
            t = gmp.get_task(task_id).find("task")
            estado, progreso = t.findtext("status"), t.findtext("progress")
            print(f"  {estado} {progreso}%")
            if estado in ("Done", "Stopped", "Interrupted"):
                break
            time.sleep(30)

        reporte = gmp.get_report(report_id, details=True, ignore_pagination=True)
        from lxml import etree

        (salida / f"openvas-{sello}.xml").write_bytes(etree.tostring(reporte, pretty_print=True))

        conteo = {"High": 0, "Medium": 0, "Low": 0, "Log": 0}
        lineas = []
        for r in reporte.iter("result"):
            sev = r.findtext("threat") or "Log"
            conteo[sev] = conteo.get(sev, 0) + 1
            if sev in ("High", "Medium"):
                lineas.append(f"- [{sev}] {r.findtext('name')} (puerto {r.findtext('port')})")

        resumen = [f"# Escaneo OpenVAS {sello}", f"Objetivo: {args.host} puertos {args.puertos}", "",
                   *(f"- {k}: {v}" for k, v in conteo.items()), "", "## Hallazgos High/Medium", *(lineas or ["- Ninguno"])]
        (salida / f"openvas-{sello}.md").write_text("\n".join(resumen), encoding="utf-8")
        print("\n".join(resumen))


if __name__ == "__main__":
    main()
