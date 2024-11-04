import './styles/main.css';
import { Game } from './game/Game';
import { LoadingScreen } from './ui/LoadingScreen';

async function initializeGame() {
    try {
        window.loadingScreen = new LoadingScreen();
        window.loadingScreen.show();
        
        const game = new Game();
        await game.init();
        window.game = game;
        
        window.loadingScreen.hide();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        window.loadingScreen?.showError('Failed to initialize game');
    }
}

document.addEventListener('DOMContentLoaded', initializeGame); 