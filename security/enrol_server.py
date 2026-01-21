#!/usr/bin/env python3
"""
ROS Security Enrollment Server
Handles device enrollment and key management for secure enclaves
"""

import socket
import ssl
import json
import hashlib
import os
import sys
from datetime import datetime
import threading
import time

class EnrollmentServer:
    def __init__(self, host='0.0.0.0', port=8443, cert_file='server.crt', key_file='server.key'):
        self.host = host
        self.port = port
        self.cert_file = cert_file
        self.key_file = key_file
        self.server_socket = None
        self.running = False

        # Create certificates directory if it doesn't exist
        self.cert_dir = os.path.join(os.path.dirname(__file__), 'certs')
        os.makedirs(self.cert_dir, exist_ok=True)

        # Enrollment database (in production, use a proper database)
        self.enrolled_devices = {}

    def generate_device_certificate(self, device_id, public_key):
        """Generate a certificate for an enrolled device"""
        # In a real implementation, this would use a proper CA
        cert_data = {
            'device_id': device_id,
            'public_key': public_key.hex(),
            'issued_at': datetime.now().isoformat(),
            'expires_at': (datetime.now().replace(year=datetime.now().year + 1)).isoformat(),
            'issuer': 'ROS Security CA'
        }

        # Create certificate file
        cert_filename = f"{device_id}.cert"
        cert_path = os.path.join(self.cert_dir, cert_filename)

        with open(cert_path, 'w') as f:
            json.dump(cert_data, f, indent=2)

        return cert_path

    def verify_device_signature(self, device_id, challenge, signature):
        """Verify device signature (placeholder implementation)"""
        # In a real implementation, this would verify the cryptographic signature
        expected_signature = hashlib.sha256(f"{device_id}:{challenge}".encode()).hexdigest()
        return signature == expected_signature

    def handle_enrollment_request(self, client_socket, client_address):
        """Handle a device enrollment request"""
        try:
            # Receive enrollment data
            data = client_socket.recv(4096).decode('utf-8')
            if not data:
                return

            enrollment_data = json.loads(data)

            device_id = enrollment_data.get('device_id')
            public_key = bytes.fromhex(enrollment_data.get('public_key', ''))
            signature = enrollment_data.get('signature')
            challenge = enrollment_data.get('challenge')

            print(f"Enrollment request from {client_address[0]}:{client_address[1]} for device {device_id}")

            # Verify signature
            if not self.verify_device_signature(device_id, challenge, signature):
                response = {'status': 'error', 'message': 'Invalid signature'}
                client_socket.send(json.dumps(response).encode('utf-8'))
                return

            # Generate certificate
            cert_path = self.generate_device_certificate(device_id, public_key)

            # Store enrollment
            self.enrolled_devices[device_id] = {
                'ip': client_address[0],
                'enrolled_at': datetime.now().isoformat(),
                'cert_path': cert_path
            }

            # Send success response
            response = {
                'status': 'success',
                'certificate': cert_path,
                'message': f'Device {device_id} enrolled successfully'
            }

            client_socket.send(json.dumps(response).encode('utf-8'))
            print(f"Device {device_id} enrolled successfully")

        except Exception as e:
            print(f"Error handling enrollment request: {e}")
            try:
                response = {'status': 'error', 'message': str(e)}
                client_socket.send(json.dumps(response).encode('utf-8'))
            except:
                pass

    def handle_client(self, client_socket, client_address):
        """Handle client connection"""
        try:
            self.handle_enrollment_request(client_socket, client_address)
        finally:
            client_socket.close()

    def start(self):
        """Start the enrollment server"""
        # Create SSL context
        context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
        context.load_cert_chain(certfile=self.cert_file, keyfile=self.key_file)

        # Create server socket
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen(5)

        # Wrap with SSL
        self.server_socket = context.wrap_socket(self.server_socket, server_side=True)

        self.running = True
        print(f"ROS Enrollment Server started on {self.host}:{self.port}")

        while self.running:
            try:
                client_socket, client_address = self.server_socket.accept()
                print(f"Accepted connection from {client_address[0]}:{client_address[1]}")

                # Handle client in a separate thread
                client_thread = threading.Thread(
                    target=self.handle_client,
                    args=(client_socket, client_address)
                )
                client_thread.daemon = True
                client_thread.start()

            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error accepting connection: {e}")
                time.sleep(1)

    def stop(self):
        """Stop the enrollment server"""
        self.running = False
        if self.server_socket:
            self.server_socket.close()
        print("ROS Enrollment Server stopped")

def main():
    # Check for certificate files
    cert_file = 'server.crt'
    key_file = 'server.key'

    if not os.path.exists(cert_file) or not os.path.exists(key_file):
        print("Generating self-signed certificate for server...")
        # In production, use proper certificates
        os.system(f"openssl req -x509 -newkey rsa:4096 -keyout {key_file} -out {cert_file} -days 365 -nodes -subj '/C=US/ST=State/L=City/O=ROS/CN=localhost'")

    server = EnrollmentServer(cert_file=cert_file, key_file=key_file)

    try:
        server.start()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.stop()

if __name__ == '__main__':
    main()