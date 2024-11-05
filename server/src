class Player:
    def __init__(self, name, health=100, position=None):
        self.name = name
        self.health = health
        self.position = position or {"x": 0, "y": 0, "z": 0}
        self.weapons = []
        self.current_weapon = None
        self.is_crouching = False
        self.is_aiming = False
        self.movement_speed = 5
        self.crouch_speed = 2.5
        self.stamina = 100
        
    def move(self, direction, delta_time):
        speed = self.crouch_speed if self.is_crouching else self.movement_speed
        
        # Apply movement based on direction
        if direction == "forward":
            self.position["z"] += speed * delta_time
        elif direction == "backward":
            self.position["z"] -= speed * delta_time
        elif direction == "left":
            self.position["x"] -= speed * delta_time
        elif direction == "right":
            self.position["x"] += speed * delta_time
            
    def shoot(self):
        if not self.current_weapon:
            return False
            
        return self.current_weapon.shoot()
        
    def reload(self):
        if not self.current_weapon:
            return False
            
        return self.current_weapon.reload()
        
    def switch_weapon(self, index):
        if 0 <= index < len(self.weapons):
            self.current_weapon = self.weapons[index]
            return True
        return False
        
    def take_damage(self, damage):
        self.health -= damage
        if self.health < 0:
            self.health = 0
        return self.health <= 0