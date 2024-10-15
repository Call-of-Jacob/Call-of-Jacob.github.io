import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AmmoPhysics } from './physics.js';
import { AIController } from './ai.js';

// Create scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);

// Load models
const loader = new GLTFLoader();
loader.load('assets/models/soldier.glb', (gltf) => {
  const soldier = gltf.scene;
  scene.add(soldier);
});

// Physics initialization
const physics = new AmmoPhysics(scene);

// Game Loop
function animate() {
  requestAnimationFrame(animate);
  physics.update();
  renderer.render(scene, camera);
}
animate();
