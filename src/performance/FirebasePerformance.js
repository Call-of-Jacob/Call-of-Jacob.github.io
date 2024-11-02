import { getPerformance, trace } from 'firebase/performance';

class PerformanceMonitor {
    constructor() {
        this.performance = getPerformance();
        this.traces = new Map();
        this.metrics = new Map();
        
        this.initializeMetrics();
    }

    initializeMetrics() {
        // Frame rate monitoring
        this.lastFrameTime = performance.now();
        this.frameRates = [];
        
        // Network latency monitoring
        this.pingTimes = [];
        
        // Asset loading times
        this.assetLoadTimes = new Map();
        
        // Start monitoring
        this.startMonitoring();
    }

    startMonitoring() {
        // Monitor frame rate
        const frameTrace = trace(this.performance, 'frame_rate');
        frameTrace.start();
        
        requestAnimationFrame(() => this.measureFrameRate(frameTrace));
    }

    measureFrameRate(frameTrace) {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        const fps = 1000 / deltaTime;
        this.frameRates.push(fps);

        if (this.frameRates.length > 60) {
            const averageFps = this.frameRates.reduce((a, b) => a + b) / this.frameRates.length;
            frameTrace.putMetric('average_fps', averageFps);
            this.frameRates = [];
        }

        requestAnimationFrame(() => this.measureFrameRate(frameTrace));
    }

    startAssetLoadTrace(assetId) {
        const trace = this.performance.trace(`asset_load_${assetId}`);
        trace.start();
        this.traces.set(assetId, trace);
    }

    endAssetLoadTrace(assetId) {
        const trace = this.traces.get(assetId);
        if (trace) {
            trace.stop();
            this.traces.delete(assetId);
        }
    }

    recordNetworkLatency(latency) {
        this.pingTimes.push(latency);
        
        if (this.pingTimes.length >= 10) {
            const averageLatency = this.pingTimes.reduce((a, b) => a + b) / this.pingTimes.length;
            const trace = this.performance.trace('network_latency');
            trace.putMetric('average_latency', averageLatency);
            trace.stop();
            
            this.pingTimes = [];
        }
    }

    startGameLoadTrace() {
        const trace = this.performance.trace('game_load');
        trace.start();
        return trace;
    }

    recordCustomMetric(name, value) {
        const trace = this.performance.trace(name);
        trace.putMetric('value', value);
        trace.stop();
    }

    recordError(error) {
        const trace = this.performance.trace('error');
        trace.putMetric('error_count', 1);
        trace.putAttribute('error_type', error.name);
        trace.stop();
    }
}

export default new PerformanceMonitor(); 