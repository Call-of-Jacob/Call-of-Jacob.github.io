import math
from OpenGL.GL import *

class Camera:
    def __init__(self):
        self.position = {"x": 0, "y": 1.7, "z": 0}  # Eye height ~1.7m
        self.rotation = {"x": 0, "y": 0, "z": 0}
        self.sensitivity = 0.1
        self.max_pitch = 89
        
    def rotate(self, dx, dy):
        self.rotation["y"] += dx * self.sensitivity
        self.rotation["x"] += dy * self.sensitivity
        
        # Clamp pitch to prevent camera flipping
        self.rotation["x"] = max(-self.max_pitch, min(self.max_pitch, self.rotation["x"]))
        
        # Normalize yaw
        self.rotation["y"] = self.rotation["y"] % 360
        
    def get_direction(self):
        pitch = math.radians(self.rotation["x"])
        yaw = math.radians(self.rotation["y"])
        
        return {
            "x": math.cos(yaw) * math.cos(pitch),
            "y": math.sin(pitch),
            "z": math.sin(yaw) * math.cos(pitch)
        }
        
    def apply(self):
        glRotatef(-self.rotation["x"], 1, 0, 0)
        glRotatef(-self.rotation["y"], 0, 1, 0)
        glTranslatef(-self.position["x"], -self.position["y"], -self.position["z"]) 