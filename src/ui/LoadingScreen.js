class LoadingScreen {
    constructor() {
        this.element = document.getElementById('loading-screen');
        this.progressBar = this.element.querySelector('.progress-bar');
        this.progressText = this.element.querySelector('.progress-text');
        this.statusText = this.element.querySelector('.status-text');
    }

    show() {
        this.element.classList.remove('hidden');
    }

    hide() {
        this.element.classList.add('hidden');
    }

    updateProgress(loaded, total, status = '') {
        const progress = (loaded / total) * 100;
        this.progressBar.style.width = `${progress}%`;
        this.progressText.textContent = `${Math.round(progress)}%`;
        if (status) {
            this.statusText.textContent = status;
        }
    }

    showError(message) {
        this.statusText.textContent = `Error: ${message}`;
        this.statusText.classList.add('error');
    }
} 