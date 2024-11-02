from enum import Enum
from dataclasses import dataclass
from typing import Dict, List
import time

class GameMode(Enum):
    TEAM_DEATHMATCH = "tdm"
    CAPTURE_FLAG = "ctf"
    DOMINATION = "dom"
    FREE_FOR_ALL = "ffa"

@dataclass
class GameModeConfig:
    time_limit: int  # seconds
    score_limit: int
    respawn_time: float
    team_based: bool
    objectives: dict = None

class GameModeManager:
    def __init__(self):
        self.current_mode = None
        self.start_time = 0
        self.scores = {}
        self.objectives = {}
        self.mode_configs = self._init_mode_configs()
        
    def _init_mode_configs(self) -> Dict[GameMode, GameModeConfig]:
        return {
            GameMode.TEAM_DEATHMATCH: GameModeConfig(
                time_limit=600,  # 10 minutes
                score_limit=75,  # kills
                respawn_time=5.0,
                team_based=True
            ),
            GameMode.CAPTURE_FLAG: GameModeConfig(
                time_limit=900,  # 15 minutes
                score_limit=3,  # captures
                respawn_time=7.0,
                team_based=True,
                objectives={"flags": 2}
            ),
            GameMode.DOMINATION: GameModeConfig(
                time_limit=900,
                score_limit=200,
                respawn_time=5.0,
                team_based=True,
                objectives={"points": 3}
            ),
            GameMode.FREE_FOR_ALL: GameModeConfig(
                time_limit=600,
                score_limit=30,  # kills
                respawn_time=3.0,
                team_based=False
            )
        }
        
    def start_game(self, mode: GameMode, players: List[str]):
        self.current_mode = mode
        self.start_time = time.time()
        self.scores = {player: 0 for player in players}
        
        if mode == GameMode.CAPTURE_FLAG:
            self._setup_flags()
        elif mode == GameMode.DOMINATION:
            self._setup_control_points()
            
    def update(self) -> dict:
        if not self.current_mode:
            return {}
            
        config = self.mode_configs[self.current_mode]
        elapsed_time = time.time() - self.start_time
        
        game_state = {
            "time_remaining": max(0, config.time_limit - elapsed_time),
            "scores": self.scores,
            "objectives": self.objectives,
            "game_over": self._check_game_over(config)
        }
        
        return game_state
        
    def _check_game_over(self, config: GameModeConfig) -> bool:
        # Check time limit
        if time.time() - self.start_time >= config.time_limit:
            return True
            
        # Check score limit
        max_score = max(self.scores.values())
        if max_score >= config.score_limit:
            return True
            
        return False
        
    def _setup_flags(self):
        self.objectives = {
            "flags": {
                "team1_flag": {"position": {"x": -50, "y": 0, "z": 0}, "carrier": None},
                "team2_flag": {"position": {"x": 50, "y": 0, "z": 0}, "carrier": None}
            }
        }
        
    def _setup_control_points(self):
        self.objectives = {
            "points": {
                "A": {"position": {"x": -40, "y": 0, "z": 0}, "owner": None},
                "B": {"position": {"x": 0, "y": 0, "z": 0}, "owner": None},
                "C": {"position": {"x": 40, "y": 0, "z": 0}, "owner": None}
            }
        } 