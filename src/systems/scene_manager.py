class Scene:
    def __init__(self):
        self.objects = []
        self.lights = []
        self.active_camera = None
        
    def add_object(self, obj):
        self.objects.append(obj)
        
    def remove_object(self, obj):
        if obj in self.objects:
            self.objects.remove(obj)
            
    def update(self, delta_time):
        for obj in self.objects:
            if hasattr(obj, 'update'):
                obj.update(delta_time)
                
class SceneManager:
    def __init__(self):
        self.scenes = {}
        self.active_scene = None
        
    def create_scene(self, name):
        scene = Scene()
        self.scenes[name] = scene
        return scene
        
    def set_active_scene(self, name):
        if name in self.scenes:
            self.active_scene = self.scenes[name]
            return True
        return False 