class Router {
    constructor() {
        this.routes = {
            '/': this.showMainMenu.bind(this),
            '/game': this.startGame.bind(this),
            '/loadout': this.showLoadout.bind(this),
            '/profile': this.showProfile.bind(this)
        };
        
        window.addEventListener('popstate', this.handleRoute.bind(this));
    }

    navigate(path) {
        history.pushState(null, '', path);
        this.handleRoute();
    }

    handleRoute() {
        const path = window.location.pathname;
        const handler = this.routes[path] || this.routes['/'];
        handler();
    }

    // Route handlers
    showMainMenu() {
        game.uiManager.showScreen('main-menu');
    }

    startGame() {
        game.uiManager.hideAllScreens();
        game.start();
    }

    showLoadout() {
        game.uiManager.showScreen('loadout');
    }

    showProfile() {
        game.uiManager.showScreen('profile');
    }
} 