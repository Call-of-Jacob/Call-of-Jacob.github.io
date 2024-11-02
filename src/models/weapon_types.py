from enum import Enum
from dataclasses import dataclass

class WeaponClass(Enum):
    RIFLE = "rifle"
    SMG = "smg"
    PISTOL = "pistol"
    MACHINE_GUN = "machine_gun"

@dataclass
class WeaponStats:
    damage_range: tuple
    fire_rate: float  # rounds per second
    reload_time: float
    mag_size: int
    accuracy: float
    recoil: float
    range: float

class WeaponFactory:
    @staticmethod
    def create_weapon(weapon_name: str) -> tuple[WeaponClass, WeaponStats]:
        weapons = {
            "M1_GARAND": (
                WeaponClass.RIFLE,
                WeaponStats(
                    damage_range=(35, 45),
                    fire_rate=0.5,
                    reload_time=2.5,
                    mag_size=8,
                    accuracy=0.85,
                    recoil=0.3,
                    range=100.0
                )
            ),
            "THOMPSON": (
                WeaponClass.SMG,
                WeaponStats(
                    damage_range=(20, 25),
                    fire_rate=10.0,
                    reload_time=3.0,
                    mag_size=30,
                    accuracy=0.7,
                    recoil=0.4,
                    range=40.0
                )
            ),
            "COLT_1911": (
                WeaponClass.PISTOL,
                WeaponStats(
                    damage_range=(25, 35),
                    fire_rate=2.0,
                    reload_time=1.5,
                    mag_size=7,
                    accuracy=0.75,
                    recoil=0.2,
                    range=25.0
                )
            ),
            "BAR": (
                WeaponClass.MACHINE_GUN,
                WeaponStats(
                    damage_range=(30, 40),
                    fire_rate=7.0,
                    reload_time=4.0,
                    mag_size=20,
                    accuracy=0.65,
                    recoil=0.5,
                    range=75.0
                )
            )
        }
        return weapons.get(weapon_name) 