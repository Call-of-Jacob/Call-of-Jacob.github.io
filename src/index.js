import './styles/main.css';
import { Game } from './core/Game';

document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) {
        console.error('Game container not found!');
        return;
    }

    const game = new Game();
    window.game = game; // For debugging
    game.start();
}); 