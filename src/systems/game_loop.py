import time

class GameLoop:
    def __init__(self, target_fps=60):
        self.target_fps = target_fps
        self.frame_time = 1.0 / target_fps
        self.is_running = False
        self.last_time = time.time()
        self.accumulated_time = 0
        self.current_fps = 0
        self.frame_count = 0
        self.fps_update_time = 0
        
    def start(self):
        self.is_running = True
        self.last_time = time.time()
        self.run()
        
    def stop(self):
        self.is_running = False
        
    def run(self):
        while self.is_running:
            current_time = time.time()
            delta_time = current_time - self.last_time
            self.last_time = current_time
            
            self.accumulated_time += delta_time
            
            # Update FPS counter
            self.frame_count += 1
            if current_time - self.fps_update_time >= 1.0:
                self.current_fps = self.frame_count
                self.frame_count = 0
                self.fps_update_time = current_time
            
            # Fixed time step updates
            while self.accumulated_time >= self.frame_time:
                self.fixed_update(self.frame_time)
                self.accumulated_time -= self.frame_time
            
            # Render at current FPS
            self.update(delta_time)
            self.render()
            
    def fixed_update(self, delta_time):
        # Physics and AI updates here
        pass
        
    def update(self, delta_time):
        # Game logic updates here
        pass
        
    def render(self):
        # Rendering calls here
        pass 