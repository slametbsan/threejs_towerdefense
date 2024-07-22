// inisialisasi three js
import * as THREE from "three";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "./node_modules/three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "./node_modules/three/examples/jsm/geometries/TextGeometry.js";

import { EffectComposer } from "./node_modules/three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./node_modules/three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "./node_modules/three/examples/jsm/postprocessing/ShaderPass.js";
import { FilmPass } from "./node_modules/three/examples/jsm/postprocessing/FilmPass.js";

import { LuminosityHighPassShader } from "./node_modules/three/examples/jsm/shaders/LuminosityHighPassShader.js";
import { CopyShader } from "./node_modules/three/examples/jsm/shaders/CopyShader.js";
import { FilmShader } from "./node_modules/three/examples/jsm/shaders/FilmShader.js";


// skrip game
let scene, camera, renderer, player, enemies = [], bullets = [];
let score = 0, lives = 3;
let clock = new THREE.Clock();
const enemySpeed = 0.01;
const bulletSpeed = 0.1;
let playerModel, enemyModel;
let loadedFont;
let scoreText, livesText;
const fontLoader = new FontLoader();

// Post-processing
let composer;

// Scene setup
scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera setup
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 5);  // Set the camera position for 3/4 vertical view from behind
camera.lookAt(0, 0, 0);

// Renderer setup
renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting setup
const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.35);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Load models
const loader = new GLTFLoader();
loader.load('assets/Enemy_Flying_Gun.gltf', function (gltf) {
    playerModel = gltf.scene;
    playerModel.position.set(0, 0.25, 4);  // Slightly above the ground and moved forward
    playerModel.rotation.y = Math.PI;  // Make player face -z direction
    playerModel.scale.set(0.5, 0.5, 0.5);  // Adjust the scale if necessary
    scene.add(playerModel);
    player = playerModel;  // Set player to the loaded model
});

loader.load('assets/pesawat1.gltf', function (gltf) {
    enemyModel = gltf.scene;
    enemyModel.scale.set(0.003, 0.003, 0.003);  // Adjust the scale if necessary 
});

// Starfield background
const starsGeometry = new THREE.BufferGeometry();
const starsMaterial = new THREE.PointsMaterial({ color: 0x888888 });

const starVertices = [];
for (let i = 0; i < 10000; i++) {
    const x = THREE.MathUtils.randFloatSpread(2000);
    const y = THREE.MathUtils.randFloatSpread(2000);
    const z = THREE.MathUtils.randFloatSpread(2000);
    starVertices.push(x, y, z);
}
starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

const starField = new THREE.Points(starsGeometry, starsMaterial);
scene.add(starField);

// Post-processing setup
const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 0.6;
bloomPass.radius = 0;

const filmPass = new FilmPass(0.35, 0.025, 648, false);

composer = new EffectComposer(renderer);
composer.addPass(renderPass);
composer.addPass(bloomPass);
composer.addPass(filmPass);

// Load font and create text
fontLoader.load('./node_modules/three/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    loadedFont = font;

    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const scoreGeometry = new TextGeometry('Score: 0', {
        font: loadedFont,
        size: 0.5,
        height: 0.1,
    });
    scoreText = new THREE.Mesh(scoreGeometry, textMaterial);
    scoreText.position.set(-10, 0, -10);
    scene.add(scoreText);

    const livesGeometry = new TextGeometry('Lives: 3', {
        font: loadedFont,
        size: 0.5,
        height: 0.1,
    });
    livesText = new THREE.Mesh(livesGeometry, textMaterial);
    livesText.position.set(10, 0, -10);
    scene.add(livesText);
});

// Event listeners
window.addEventListener('resize', onWindowResize);
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('click', onMouseClick);

// Start rendering loop
animate();

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    // Update player's rotation to face the pointer
    if (!player) return;  // Return if player model is not loaded

    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    const vector = new THREE.Vector3(mouseX, mouseY, 0.5);
    vector.unproject(camera);
    vector.sub(camera.position).normalize();

    const distance = -camera.position.y / vector.y;
    const pos = camera.position.clone().add(vector.multiplyScalar(distance));

    // Calculate the angle between player and mouse position
    const angle = Math.atan2(player.position.x - pos.x, player.position.z - pos.z);
    const clampedAngle = THREE.MathUtils.clamp(angle, -Math.PI / 2, Math.PI / 2);

    // Set player's rotation to clamped angle
    player.rotation.y = clampedAngle + Math.PI;  // Adjust for facing -z
}

function onMouseClick(event) {
    if (!player) return;  // Return if player model is not loaded

    // Create bullet
    const bulletGeometry = new THREE.SphereGeometry(0.05, 32, 32);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    bullet.position.copy(player.position);
    bullet.position.y = 0.25;  // Set bullet start height
    bullet.direction = new THREE.Vector3(
        Math.sin(player.rotation.y),
        0,
        Math.cos(player.rotation.y)
    );
    bullets.push(bullet);
    scene.add(bullet);
}

function spawnEnemy() {
    if (!enemyModel) return;  // Return if enemy model is not loaded

    const enemy = enemyModel.clone();

    // Enemy spawns at a random position behind the player
    const angle = Math.random() * Math.PI - Math.PI / 2; // Between -90° and 90°
    const distance = 5 + Math.random() * 5;
    enemy.position.set(Math.sin(angle) * distance, 0.25, Math.cos(angle) * distance - 15); // Adjusted for behind view
    enemies.push(enemy);
    scene.add(enemy);
}

function updateTextGeometry(mesh, newText) {
    if (!loadedFont) return;  // Ensure font is loaded before updating

    const textGeometry = new TextGeometry(newText, {
        font: loadedFont,
        size: 0.5,
        height: 0.1,
    });
    mesh.geometry.dispose();
    mesh.geometry = textGeometry;
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.add(bullet.direction.clone().multiplyScalar(bulletSpeed));

        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (bullet.position.distanceTo(enemy.position) < 0.3) {
                // Create particle effect
                createExplosion(enemy.position);
                scene.remove(enemy);
                enemies.splice(j, 1);
                scene.remove(bullet);
                bullets.splice(i, 1);

                score++;
                updateTextGeometry(scoreText, `Score: ${score}`);

                break;
            }
        }

        // Remove bullets that go too far
        if (bullet.position.length() > 20) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const direction = player.position.clone().sub(enemy.position).normalize();
        enemy.position.add(direction.multiplyScalar(enemySpeed));

        // Rotate enemy to face player
        enemy.lookAt(player.position);
        enemy.rotateY(Math.PI); //rotate jika perlu

        // Check collision with player
        if (enemy.position.distanceTo(player.position) < 0.5) {
            lives--;
            updateTextGeometry(livesText, `Lives: ${lives}`);
            scene.remove(enemy);
            enemies.splice(i, 1);

            if (lives <= 0) {
                alert("Game Over! Final Score: " + score);
                window.location.reload();
            }
        }
    }

    // Spawn new enemies
    if (Math.random() < 0.01) spawnEnemy();

    composer.render();
}

function createExplosion(position) {
    const particleCount = 20;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.TetrahedronGeometry(0.1);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50
        );

        particles.push(particle);
        scene.add(particle);
    }

    // Animate the particles
    const explosionDuration = 0.015;
    let explosionElapsedTime = 0;

    function animateParticles(delta) {
        explosionElapsedTime += delta;
        if (explosionElapsedTime > explosionDuration) {
            particles.forEach(particle => scene.remove(particle));
            return;
        }

        particles.forEach(particle => {
            particle.position.add(particle.velocity.clone().multiplyScalar(delta));
        });

        requestAnimationFrame(() => animateParticles(clock.getDelta()));
    }

    animateParticles(clock.getDelta());
}