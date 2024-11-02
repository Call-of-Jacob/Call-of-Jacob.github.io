from dataclasses import dataclass
from typing import List, Dict
import time
import random

@dataclass
class QueuedPlayer:
    id: str
    skill_rating: float
    wait_time: float
    preferred_modes: List[str]
    team_preference: str = None

class MatchMaker:
    def __init__(self, config):
        self.config = config
        self.queued_players: Dict[str, QueuedPlayer] = {}
        self.skill_range = 100  # initial skill range to match
        self.max_wait_time = 60  # seconds
        
    def add_to_queue(self, player_id: str, skill_rating: float, preferred_modes: List[str]):
        self.queued_players[player_id] = QueuedPlayer(
            id=player_id,
            skill_rating=skill_rating,
            wait_time=time.time(),
            preferred_modes=preferred_modes
        )
        
    def remove_from_queue(self, player_id: str):
        if player_id in self.queued_players:
            del self.queued_players[player_id]
            
    def find_match(self) -> dict:
        current_time = time.time()
        
        # Group players by mode preference
        mode_groups = {}
        for player in self.queued_players.values():
            for mode in player.preferred_modes:
                if mode not in mode_groups:
                    mode_groups[mode] = []
                mode_groups[mode].append(player)
                
        # Try to make matches for each mode
        for mode, players in mode_groups.items():
            min_players = self.config['room_configs'][mode]['min_players']
            if len(players) >= min_players:
                matched_players = self._match_players(players, mode)
                if matched_players:
                    return {
                        'mode': mode,
                        'players': [p.id for p in matched_players],
                        'teams': self._assign_teams(matched_players, mode)
                    }
                    
        return None
        
    def _match_players(self, players: List[QueuedPlayer], mode: str) -> List[QueuedPlayer]:
        max_players = self.config['room_configs'][mode]['max_players']
        matched = []
        
        # Sort by wait time and skill
        players.sort(key=lambda p: (
            current_time - p.wait_time,  # wait time
            p.skill_rating  # skill rating
        ))
        
        # Take the first max_players that fit our criteria
        for player in players[:max_players]:
            if len(matched) == 0 or self._is_skill_compatible(player, matched):
                matched.append(player)
                
        if len(matched) >= self.config['room_configs'][mode]['min_players']:
            return matched
        return None
        
    def _is_skill_compatible(self, player: QueuedPlayer, group: List[QueuedPlayer]) -> bool:
        avg_skill = sum(p.skill_rating for p in group) / len(group)
        return abs(player.skill_rating - avg_skill) <= self.skill_range
        
    def _assign_teams(self, players: List[QueuedPlayer], mode: str) -> Dict[str, List[str]]:
        if mode == 'ffa':
            return {'ffa': [p.id for p in players]}
            
        team_size = self.config['room_configs'][mode]['team_size']
        teams = {'team1': [], 'team2': []}
        
        # Sort by skill to ensure balanced teams
        players.sort(key=lambda p: p.skill_rating, reverse=True)
        
        # Alternate assignment to teams
        for i, player in enumerate(players):
            team = 'team1' if i % 2 == 0 else 'team2'
            teams[team].append(player.id)
            
        return teams 