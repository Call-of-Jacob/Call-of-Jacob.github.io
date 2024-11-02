class Physics:
    def __init__(self):
        self.gravity = -9.81
        self.collision_objects = []
        
    def check_collision(self, position, radius):
        for obj in self.collision_objects:
            if self._check_object_collision(position, radius, obj):
                return True
        return False
        
    def _check_object_collision(self, position, radius, obj):
        # Simple circle collision
        distance = ((position['x'] - obj.position['x']) ** 2 + 
                   (position['z'] - obj.position['z']) ** 2) ** 0.5
        return distance < (radius + obj.radius)
        
    def apply_gravity(self, object, delta_time):
        if not object.is_grounded:
            object.position['y'] += self.gravity * delta_time 