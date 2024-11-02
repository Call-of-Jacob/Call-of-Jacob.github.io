const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 a_position;
in vec2 a_texcoord;
in vec3 a_normal;

uniform mat4 u_worldMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

out vec2 v_texcoord;
out vec3 v_normal;
out vec3 v_fragPos;

void main() {
    v_texcoord = a_texcoord;
    v_normal = mat3(transpose(inverse(u_worldMatrix))) * a_normal;
    v_fragPos = vec3(u_worldMatrix * vec4(a_position, 1.0));
    
    gl_Position = u_projectionMatrix * u_viewMatrix * u_worldMatrix * vec4(a_position, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texcoord;
in vec3 v_normal;
in vec3 v_fragPos;

uniform sampler2D u_texture;
uniform vec3 u_lightPos;
uniform vec3 u_viewPos;
uniform vec3 u_lightColor;
uniform float u_ambientStrength;

out vec4 fragColor;

void main() {
    // Ambient
    vec3 ambient = u_ambientStrength * u_lightColor;
    
    // Diffuse
    vec3 norm = normalize(v_normal);
    vec3 lightDir = normalize(u_lightPos - v_fragPos);
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diff * u_lightColor;
    
    // Specular
    float specularStrength = 0.5;
    vec3 viewDir = normalize(u_viewPos - v_fragPos);
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = specularStrength * spec * u_lightColor;
    
    vec4 texColor = texture(u_texture, v_texcoord);
    vec3 result = (ambient + diffuse + specular) * texColor.rgb;
    fragColor = vec4(result, texColor.a);
}
`;

class ShaderProgram {
    constructor(gl, vertexShaderSource, fragmentShaderSource) {
        this.gl = gl;
        this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
        this.uniforms = this.getUniformLocations();
        this.attributes = this.getAttributeLocations();
    }
    
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createProgram(vertexSource, fragmentSource) {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program link error:', this.gl.getProgramInfoLog(program));
            return null;
        }
        
        return program;
    }
    
    getUniformLocations() {
        return {
            worldMatrix: this.gl.getUniformLocation(this.program, 'u_worldMatrix'),
            viewMatrix: this.gl.getUniformLocation(this.program, 'u_viewMatrix'),
            projectionMatrix: this.gl.getUniformLocation(this.program, 'u_projectionMatrix'),
            texture: this.gl.getUniformLocation(this.program, 'u_texture'),
            lightPos: this.gl.getUniformLocation(this.program, 'u_lightPos'),
            viewPos: this.gl.getUniformLocation(this.program, 'u_viewPos'),
            lightColor: this.gl.getUniformLocation(this.program, 'u_lightColor'),
            ambientStrength: this.gl.getUniformLocation(this.program, 'u_ambientStrength')
        };
    }
    
    getAttributeLocations() {
        return {
            position: this.gl.getAttribLocation(this.program, 'a_position'),
            texcoord: this.gl.getAttribLocation(this.program, 'a_texcoord'),
            normal: this.gl.getAttribLocation(this.program, 'a_normal')
        };
    }
    
    use() {
        this.gl.useProgram(this.program);
    }
} 