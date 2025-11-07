#!/usr/bin/env python3
"""
HTTPS Server for ArUco Quiz Game
Required for camera access on mobile devices over LAN
"""

import http.server
import ssl
import socket

# Server configuration
PORT = 8000
CERTFILE = 'cert.pem'
KEYFILE = 'key.pem'

def get_local_ip():
    """Get the local IP address"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except:
        return "127.0.0.1"

# Create HTTP server
server_address = ('0.0.0.0', PORT)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

# Wrap with SSL
ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain(certfile=CERTFILE, keyfile=KEYFILE)
httpd.socket = ssl_context.wrap_socket(httpd.socket, server_side=True)

# Get and display connection info
local_ip = get_local_ip()

print("=" * 70)
print("🔒 HTTPS Server Started Successfully!")
print("=" * 70)
print(f"\n📱 Access from THIS device:")
print(f"   https://localhost:{PORT}")
print(f"\n📱 Access from OTHER devices on same network:")
print(f"   https://{local_ip}:{PORT}")
print("\n⚠️  IMPORTANT for mobile devices:")
print("   1. Your browser will show a security warning (self-signed certificate)")
print("   2. Click 'Advanced' or 'Details'")
print("   3. Click 'Proceed' or 'Accept Risk and Continue'")
print("   4. This is normal for local development!")
print("\n💡 The camera will now work on mobile devices!")
print("\n🛑 Press Ctrl+C to stop the server")
print("=" * 70)
print()

# Start serving
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\n\n✅ Server stopped gracefully")
    httpd.shutdown()
