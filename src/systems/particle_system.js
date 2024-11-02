class Particle {
    constructor(config) {
        this.position = { ...config.position };
        this.velocity = {
            x: (Math.random() - 0.5) * config.speed,
            y: (Math.random() - 0.5) * config.speed,
            z: (Math.random() - 0.5) * config.speed
        };
        this.color = config.color;
        this.size = config.size;
        this.life = config.duration;
        this.maxLife = config.duration;
        this.active = true;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
    }
}

class ParticleEmitter {
    constructor(config) {
        this.config = config;
        this.particles = new Set();
        this.active = true;
        this.elapsed = 0;
    }

    update(deltaTime) {
        if (!this.active) return;

        this.elapsed += deltaTime;

        // Emit new particles
        if (this.config.continuous || this.particles.size < this.config.count) {
            this.emit();
        }

        // Update existing particles
        for (const particle of this.particles) {
            particle.update(deltaTime);
            if (!particle.active) {
                this.particles.delete(particle);
            }
        }

        // Check if emitter should deactivate
        if (!this.config.continuous && this.particles.size === 0) {
            this.active = false;
        }
    }

    emit() {
        const particle = new Particle({
            position: this.config.position,
            speed: this.config.speed,
            size: this.config.size * (0.8 + Math.random() * 0.4),
            color: this.config.color,
            duration: this.config.duration * (0.8 + Math.random() * 0.4)
        });
        this.particles.add(particle);
    }
}

class ParticleSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.emitters = new Set();
        this.maxParticles = 10000;
        this.currentParticleCount = 0;
        
        // Initialize buffers and shaders
        this.initializeBuffers();
        this.initializeShaders();
    }

    initializeBuffers() {
        // Create vertex buffer for particles
        this.vertexBuffer = this.renderer.gl.createBuffer();
        this.indexBuffer = this.renderer.gl.createBuffer();
        
        // Create instance buffer for particle positions and properties
        this.instanceBuffer = this.renderer.gl.createBuffer();
    }

    initializeShaders() {
        // Particle shader implementation
        const vertexShader = `
            attribute vec3 position;
            attribute vec3 particlePosition;
            attribute vec4 particleColor;
            attribute float particleSize;
            
            uniform mat4 viewProjection;
            
            varying vec4 vColor;
            
            void main() {
                vec3 worldPosition = position * particleSize + particlePosition;
                gl_Position = viewProjection * vec4(worldPosition, 1.0);
                vColor = particleColor;
            }
        `;

        const fragmentShader = `
            precision mediump float;
            varying vec4 vColor;
            
            void main() {
                gl_FragColor = vColor;
            }
        `;

        this.shader = new ShaderProgram(this.renderer.gl, vertexShader, fragmentShader);
    }

    createEmitter(config) {
        const emitter = new ParticleEmitter(config);
        this.emitters.add(emitter);
        return emitter;
    }

    update(deltaTime) {
        this.currentParticleCount = 0;

        for (const emitter of this.emitters) {
            emitter.update(deltaTime);
            this.currentParticleCount += emitter.particles.size;

            if (!emitter.active) {
                this.emitters.delete(emitter);
            }
        }
    }

    render(camera) {
        const gl = this.renderer.gl;
        
        // Use particle shader
        this.shader.use();
        
        // Set view projection matrix
        this.shader.setMatrix4('viewProjection', camera.viewProjectionMatrix);
        
        // Enable attributes
        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.enableVertexAttribArray(this.shader.attributes.particlePosition);
        gl.enableVertexAttribArray(this.shader.attributes.particleColor);
        gl.enableVertexAttribArray(this.shader.attributes.particleSize);
        
        // Enable blending
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Render each emitter's particles
        for (const emitter of this.emitters) {
            this.renderEmitter(emitter);
        }
        
        // Cleanup
        gl.disable(gl.BLEND);
        gl.disableVertexAttribArray(this.shader.attributes.position);
        gl.disableVertexAttribArray(this.shader.attributes.particlePosition);
        gl.disableVertexAttribArray(this.shader.attributes.particleColor);
        gl.disableVertexAttribArray(this.shader.attributes.particleSize);
    }

    renderEmitter(emitter) {
        // Update instance data for all particles in the emitter
        const instanceData = new Float32Array(emitter.particles.size * 8); // pos(3) + color(4) + size(1)
        let offset = 0;
        
        for (const particle of emitter.particles) {
            // Position
            instanceData[offset++] = particle.position.x;
            instanceData[offset++] = particle.position.y;
            instanceData[offset++] = particle.position.z;
            
            // Color with alpha based on remaining life
            const alpha = particle.life / particle.maxLife;
            instanceData[offset++] = particle.color.r;
            instanceData[offset++] = particle.color.g;
            instanceData[offset++] = particle.color.b;
            instanceData[offset++] = alpha;
            
            // Size
            instanceData[offset++] = particle.size;
        }
        
        // Update instance buffer
        const gl = this.renderer.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);
        
        // Draw particles using instancing
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, emitter.particles.size);
    }
} 