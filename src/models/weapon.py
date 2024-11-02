from enum import Enum
import random

class WeaponType(Enum):
    RIFLE = "rifle"
    PISTOL = "pistol"
    SMG = "smg"
    SNIPER = "sniper"

class Weapon:
    def __init__(self, weapon_type, damage_range, fire_rate, reload_time, mag_size):
        self.weapon_type = weapon_type
        self.damage_range = damage_range  # tuple (min, max)
        self.fire_rate = fire_rate  # rounds per second
        self.reload_time = reload_time
        self.mag_size = mag_size
        self.current_ammo = mag_size
        self.is_reloading = False
        
    def get_damage(self):
        return random.randint(*self.damage_range)
        
    def shoot(self):
        if self.is_reloading or self.current_ammo <= 0:
            return False
        
        self.current_ammo -= 1
        return True
        
    def reload(self):
        if not self.is_reloading and self.current_ammo < self.mag_size:
            self.is_reloading = True
            return True
        return False
        
    def finish_reload(self):
        self.current_ammo = self.mag_size
        self.is_reloading = False 