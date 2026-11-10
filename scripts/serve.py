"""Static review only. Shared votes require the separate Worker."""
import http.server,pathlib
root=pathlib.Path(__file__).resolve().parents[1]/'site'
handler=lambda *args,**kwargs:http.server.SimpleHTTPRequestHandler(*args,directory=str(root),**kwargs)
http.server.ThreadingHTTPServer(('127.0.0.1',8080),handler).serve_forever()
