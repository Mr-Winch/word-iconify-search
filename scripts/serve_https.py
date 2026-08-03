from __future__ import annotations
import argparse
import functools
import http.server
import ssl
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--root", default=".")
parser.add_argument("--cert", default=".certs/localhost.crt")
parser.add_argument("--key", default=".certs/localhost.key")
parser.add_argument("--port", type=int, default=3000)
args = parser.parse_args()

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(Path(args.root).resolve()))
server = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(args.cert, args.key)
server.socket = context.wrap_socket(server.socket, server_side=True)
print(f"Serving https://localhost:{args.port}/", flush=True)
server.serve_forever()
