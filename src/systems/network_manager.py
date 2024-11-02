import socket
import json
import threading
import queue

class NetworkManager:
    def __init__(self, host='localhost', port=5000):
        self.host = host
        self.port = port
        self.socket = None
        self.connected = False
        self.message_queue = queue.Queue()
        self.receive_thread = None
        
    def connect(self):
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.host, self.port))
            self.connected = True
            self.receive_thread = threading.Thread(target=self._receive_loop)
            self.receive_thread.daemon = True
            self.receive_thread.start()
            return True
        except Exception as e:
            print(f"Connection failed: {e}")
            return False
            
    def disconnect(self):
        self.connected = False
        if self.socket:
            self.socket.close()
            
    def send(self, message_type, data):
        if not self.connected:
            return False
            
        message = {
            'type': message_type,
            'data': data
        }
        
        try:
            self.socket.send(json.dumps(message).encode())
            return True
        except Exception as e:
            print(f"Send failed: {e}")
            return False
            
    def _receive_loop(self):
        while self.connected:
            try:
                data = self.socket.recv(4096)
                if not data:
                    break
                    
                message = json.loads(data.decode())
                self.message_queue.put(message)
            except Exception as e:
                print(f"Receive error: {e}")
                break
                
        self.connected = False
        
    def get_message(self):
        try:
            return self.message_queue.get_nowait()
        except queue.Empty:
            return None 