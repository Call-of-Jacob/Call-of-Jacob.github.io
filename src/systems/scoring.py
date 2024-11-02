from enum import Enum
from dataclasses import dataclass
import json
import time

class Achievement(Enum):
    FIRST_BLOOD = "first_blood"
    KILLING_SPREE = "killing_spree"
    HEADSHOT_MASTER = "headshot_master"
    SURVIVOR = "survivor"

@dataclass
class ScoreEvent:
    points: int
    multiplier: float = 1.0
    description: str = ""

class ScoringSystem:
    def __init__(self):
        self.score_values = {
            "kill": 100,
            "headshot": 150,
            "assist": 50,
            "objective_capture": 200,
            "win": 1000,
        }
        
        self.achievements = {
            Achievement.FIRST_BLOOD: {"score": 500, "description": "First kill of the match"},
            Achievement.KILLING_SPREE: {"score": 300, "description": "5 kills without dying"},
            Achievement.HEADSHOT_MASTER: {"score": 400, "description": "3 headshots in a row"},
            Achievement.SURVIVOR: {"score": 600, "description": "Win a match without dying"}
        }
        
        self.current_score = 0
        self.kill_streak = 0
        self.headshot_streak = 0
        self.match_stats = {
            "kills": 0,
            "deaths": 0,
            "headshots": 0,
            "assists": 0,
            "objectives_captured": 0
        }
        
    def add_score(self, event_type: str, details: dict = None) -> ScoreEvent:
        base_score = self.score_values.get(event_type, 0)
        multiplier = 1.0
        description = event_type
        
        if event_type == "kill":
            self.kill_streak += 1
            self.match_stats["kills"] += 1
            
            # Apply kill streak multiplier
            if self.kill_streak >= 5:
                multiplier = 1.5
                
            if details and details.get("headshot"):
                self.headshot_streak += 1
                self.match_stats["headshots"] += 1
                base_score = self.score_values["headshot"]
                
        elif event_type == "death":
            self.kill_streak = 0
            self.headshot_streak = 0
            self.match_stats["deaths"] += 1
            
        score_event = ScoreEvent(
            points=int(base_score * multiplier),
            multiplier=multiplier,
            description=description
        )
        
        self.current_score += score_event.points
        return score_event
        
    def check_achievements(self) -> list[Achievement]:
        earned = []
        
        if self.match_stats["kills"] == 1 and self.match_stats["deaths"] == 0:
            earned.append(Achievement.FIRST_BLOOD)
            
        if self.kill_streak == 5:
            earned.append(Achievement.KILLING_SPREE)
            
        if self.headshot_streak == 3:
            earned.append(Achievement.HEADSHOT_MASTER)
            
        return earned
        
    def save_stats(self, player_id: str):
        stats = {
            "player_id": player_id,
            "timestamp": time.time(),
            "score": self.current_score,
            "stats": self.match_stats
        }
        
        with open(f"stats/{player_id}_stats.json", "a") as f:
            json.dump(stats, f)
            f.write("\n") 