// In your game initialization
game.matchmaking = MatchmakingService;
game.stateReconciliation = StateReconciliation;

// Start matchmaking
game.matchmaking.onMatchFound = (matchId) => {
    game.joinMatch(matchId);
};
game.matchmaking.startMatchmaking({
    gameMode: 'deathmatch',
    region: 'us-east',
    skill: player.skillRating
});

// In your game loop
update(deltaTime) {
    // Handle inputs
    const input = this.getPlayerInput();
    this.stateReconciliation.applyInput(input);

    // Get interpolated state for other players
    const renderTimestamp = Date.now();
    const interpolatedState = this.stateReconciliation.getInterpolatedState(renderTimestamp);
    if (interpolatedState) {
        this.updateOtherPlayers(interpolatedState);
    }
};