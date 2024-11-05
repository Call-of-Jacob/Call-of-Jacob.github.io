import './styles/main.css';
import { Game } from './core/Game';

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    window.game = game; // For debugging
    game.start();
}); 