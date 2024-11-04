import './styles/main.css';
import { Game } from './game/Game';
import { LoadingScreen } from './ui/LoadingScreen';

document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
    window.loadingScreen = new LoadingScreen();
}); 