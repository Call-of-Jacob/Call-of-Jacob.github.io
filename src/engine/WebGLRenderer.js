import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
import Logger from '../utils/Logger';

class WebGLRenderer {
    constructor() {
        this.renderer = null;
        this.composer = null;
        this.scene = null;
        this.camera = null;
        this.stats = null;
        this.quality = 'high';
        this.postProcessing = true;
        this.shadowsEnabled = true;
        this.initialized = false;
    }

    init(canvas) {
        try {
            this.setupRenderer(canvas);
            this.setupScene();
            this.setupPostProcessing();
            this.setupEventListeners();
            this.initialized = true;
        } catch (error) {
            Logger.error('Failed to initialize WebGL renderer:', error);
            throw error;
        }
    }

    setupRenderer(canvas) {
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false, // We'll use SMAA instead
            powerPreference: 'high-performance',
            stencil: false,
            depth: true
        });

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = this.shadowsEnabled;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 50, 150);
        
        // Setup camera
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
    }

    setupPostProcessing() {
        if (!this.postProcessing) return;

        this.composer = new EffectComposer(this.renderer);
        
        // Basic render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom effect
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.5, // Bloom strength
            0.4, // Radius
            0.85 // Threshold
        );
        this.composer.addPass(bloomPass);

        // SMAA anti-aliasing
        const smaaPass = new SMAAPass(
            window.innerWidth * this.renderer.getPixelRatio(),
            window.innerHeight * this.renderer.getPixelRatio()
        );
        this.composer.addPass(smaaPass);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.onHidden();
        } else {
            this.onVisible();
        }
    }

    onHidden() {
        // Reduce resource usage when tab is not visible
        this.renderer.setPixelRatio(1);
        if (this.postProcessing) {
            this.composer.setPixelRatio(1);
        }
    }

    onVisible() {
        // Restore quality when tab becomes visible
        const pixelRatio = window.devicePixelRatio;
        this.renderer.setPixelRatio(pixelRatio);
        if (this.postProcessing) {
            this.composer.setPixelRatio(pixelRatio);
        }
    }

    setQuality(quality) {
        this.quality = quality;
        switch (quality) {
            case 'low':
                this.renderer.setPixelRatio(1);
                this.shadowsEnabled = false;
                this.postProcessing = false;
                break;
            case 'medium':
                this.renderer.setPixelRatio(1);
                this.shadowsEnabled = true;
                this.postProcessing = true;
                break;
            case 'high':
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.shadowsEnabled = true;
                this.postProcessing = true;
                break;
        }

        this.updateQualitySettings();
    }

    updateQualitySettings() {
        this.renderer.shadowMap.enabled = this.shadowsEnabled;
        if (!this.postProcessing) {
            this.composer = null;
        } else if (!this.composer) {
            this.setupPostProcessing();
        }
    }

    render() {
        if (!this.initialized) return;

        try {
            if (this.postProcessing && this.composer) {
                this.composer.render();
            } else {
                this.renderer.render(this.scene, this.camera);
            }
        } catch (error) {
            Logger.error('Render error:', error);
        }
    }

    dispose() {
        if (this.composer) {
            this.composer.dispose();
        }
        this.renderer.dispose();
        this.scene.traverse(object => {
            if (object.material) {
                object.material.dispose();
            }
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.texture) {
                object.texture.dispose();
            }
        });
    }
}

export default new WebGLRenderer(); 