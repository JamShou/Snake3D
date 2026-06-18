import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import SphereSnake from './SphereSnake.jsx';
import {
  SPHERE_RADIUS,
  makeInitialSnake,
  moveAlongSphere,
  randomPointOnSphere,
  surfaceDistance,
  tangentFromDirection,
  turnTangent,
} from './utils/sphereMath.js';

const START_LENGTH = 8;
const SEGMENT_SPACING = 0.32;
const TURN_ANGLE = 0.42;
const FOOD_COLLISION_RADIUS = 0.35;
const PUBLIC_BASE_URL = import.meta.env.BASE_URL;
const FRUITS = [
  {
    name: 'Banana',
    path: `${PUBLIC_BASE_URL}fruits/Banana.glb`,
    growth: 3,
    scale: 6.8,
  },
  {
    name: 'Orange',
    path: `${PUBLIC_BASE_URL}fruits/Orange.glb`,
    growth: 5,
    scale: 2.24,
  },
  {
    name: 'Egg',
    path: `${PUBLIC_BASE_URL}fruits/Egg.glb`,
    growth: 1,
    scale: 0.3,
  },
];

function randomFruit() {
  return FRUITS[Math.floor(Math.random() * FRUITS.length)];
}

async function loadFruitModels() {
  const loader = new GLTFLoader();
  const entries = await Promise.all(
    FRUITS.map(async (fruit) => {
      const gltf = await loader.loadAsync(fruit.path);
      const scene = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(scene);
      const center = bounds.getCenter(new THREE.Vector3());
      scene.position.sub(center);
      return [fruit.name, scene];
    }),
  );

  return Object.fromEntries(entries);
}

function makePlanetTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#24135f');
  gradient.addColorStop(0.28, '#6d28d9');
  gradient.addColorStop(0.56, '#c026d3');
  gradient.addColorStop(0.78, '#22d3ee');
  gradient.addColorStop(1, '#120a35');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 8 + Math.random() * 34;
    const hue = Math.random();
    ctx.globalAlpha = 0.05 + Math.random() * 0.13;
    ctx.fillStyle = hue > 0.72 ? '#f0abfc' : hue > 0.45 ? '#38bdf8' : '#4c1d95';
    ctx.beginPath();
    ctx.ellipse(x, y, radius * (0.6 + Math.random()), radius * 0.32, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 160; i += 1) {
    ctx.globalAlpha = 0.12 + Math.random() * 0.16;
    ctx.strokeStyle = Math.random() > 0.5 ? '#f9a8d4' : '#67e8f9';
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const y = Math.random() * size;
    ctx.moveTo(-20, y);
    for (let x = 0; x <= size + 20; x += 42) {
      ctx.lineTo(x, y + Math.sin(x * 0.025 + i) * (6 + Math.random() * 10));
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
}

function makeStarPositions(count, radius, band = 1) {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const point = new THREE.Vector3().randomDirection().multiplyScalar(radius * (0.7 + Math.random() * 0.3));
    point.y *= band;
    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
  }

  return positions;
}

function makeOrbPositions(count, radius) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [
    new THREE.Color('#fef3c7'),
    new THREE.Color('#f0abfc'),
    new THREE.Color('#67e8f9'),
    new THREE.Color('#fda4af'),
    new THREE.Color('#bbf7d0'),
  ];

  for (let i = 0; i < count; i += 1) {
    const point = new THREE.Vector3().randomDirection().multiplyScalar(radius * (0.72 + Math.random() * 0.28));
    const color = palette[Math.floor(Math.random() * palette.length)];
    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y * 0.8;
    positions[i * 3 + 2] = point.z;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  return { positions, colors };
}

function spawnFoodAwayFromSnake(body) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const point = randomPointOnSphere(SPHERE_RADIUS);
    const tooClose = body.some((segment) => surfaceDistance(segment, point) < 0.75);

    if (!tooClose) {
      return {
        position: point,
        fruit: randomFruit(),
      };
    }
  }

  return {
    position: randomPointOnSphere(SPHERE_RADIUS),
    fruit: randomFruit(),
  };
}

function Planet() {
  const texture = useMemo(() => makePlanetTexture(), []);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 96, 96]} />
        <meshStandardMaterial
          map={texture}
          color="#f5d0fe"
          roughness={0.86}
          metalness={0.02}
        />
      </mesh>
      <mesh scale={1.025}>
        <sphereGeometry args={[SPHERE_RADIUS, 64, 64]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.16} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function SpaceBackdrop() {
  const nearStars = useMemo(() => makeStarPositions(900, 64), []);
  const farStars = useMemo(() => makeStarPositions(1400, 96, 0.72), []);
  const glowingOrbs = useMemo(() => makeOrbPositions(90, 88), []);

  return (
    <group>
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[110, 48, 48]} />
        <meshBasicMaterial color="#15113f" side={THREE.BackSide} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[farStars, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#f0abfc" size={0.08} sizeAttenuation transparent opacity={0.58} />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nearStars, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#fef9c3" size={0.055} sizeAttenuation transparent opacity={0.86} />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[glowingOrbs.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[glowingOrbs.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.55} sizeAttenuation vertexColors transparent opacity={0.7} depthWrite={false} />
      </points>
      <mesh position={[-28, 11, -38]} rotation={[0.18, -0.58, 0.1]}>
        <planeGeometry args={[50, 18, 1, 1]} />
        <meshBasicMaterial color="#ff4fd8" transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[20, 19, -52]} rotation={[0.62, 0.26, -0.28]}>
        <planeGeometry args={[62, 16, 1, 1]} />
        <meshBasicMaterial color="#fde047" transparent opacity={0.11} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[28, -4, -42]} rotation={[-0.1, 0.62, 0.16]}>
        <planeGeometry args={[46, 20, 1, 1]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[-38, -18, -56]} rotation={[0.78, -0.22, 0.72]}>
        <torusGeometry args={[7.2, 0.08, 8, 96]} />
        <meshBasicMaterial color="#fef3c7" transparent opacity={0.38} depthWrite={false} />
      </mesh>
      <mesh position={[-38, -18, -56]} rotation={[0.78, -0.22, 0.72]}>
        <sphereGeometry args={[2.7, 32, 32]} />
        <meshBasicMaterial color="#fb7185" transparent opacity={0.82} />
      </mesh>
      <mesh position={[42, 22, -62]}>
        <sphereGeometry args={[1.4, 24, 24]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.72} />
      </mesh>
      <mesh position={[45, 24, -59]}>
        <sphereGeometry args={[0.42, 16, 16]} />
        <meshBasicMaterial color="#fef08a" transparent opacity={0.86} />
      </mesh>
    </group>
  );
}

function Food({ food, fruitModels }) {
  const foodRef = useRef();
  const sourceModel = fruitModels?.[food.fruit.name];
  const model = useMemo(() => {
    return sourceModel ? sourceModel.clone(true) : null;
  }, [sourceModel]);
  const surfacePosition = useMemo(
    () => food.position.clone().normalize().multiplyScalar(SPHERE_RADIUS + 0.28),
    [food.position],
  );
  const rotation = useMemo(() => {
    const normal = food.position.clone().normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }, [food.position]);

  useFrame((_, delta) => {
    if (foodRef.current) {
      foodRef.current.rotation.y += delta * 1.6;
    }

  });

  return (
    <group position={surfacePosition} quaternion={rotation}>
      <group ref={foodRef} scale={food.fruit.scale}>
        {model ? (
          <primitive object={model} />
        ) : (
          <mesh>
            <sphereGeometry args={[0.22, 24, 24]} />
            <meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={1.2} />
          </mesh>
        )}
      </group>
      <pointLight color="#facc15" intensity={1.8} distance={4.2} />
    </group>
  );
}

function CameraFollower({ head, forward }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3());
  const cameraRef = useRef(new THREE.Vector3(0, 8, 8));
  const screenUp = useMemo(() => new THREE.Vector3(0, 0, -1), []);
  const fallbackUp = useMemo(() => new THREE.Vector3(1, 0, 0), []);

  useFrame(() => {
    const normal = head.clone().normalize();
    const target = normal.clone().multiplyScalar(SPHERE_RADIUS + 0.6);
    const desiredPosition = normal.clone().multiplyScalar(SPHERE_RADIUS + 8.2);

    targetRef.current.lerp(target, 0.16);
    cameraRef.current.lerp(desiredPosition, 0.1);
    camera.position.copy(cameraRef.current);

    const viewDirection = targetRef.current.clone().sub(camera.position).normalize();
    const stableUp = screenUp.clone().sub(viewDirection.clone().multiplyScalar(screenUp.dot(viewDirection)));

    if (stableUp.lengthSq() < 0.0001) {
      stableUp.copy(fallbackUp).sub(viewDirection.clone().multiplyScalar(fallbackUp.dot(viewDirection)));
    }

    camera.up.copy(stableUp.normalize());
    camera.lookAt(targetRef.current);
  });

  return null;
}

function Scene({ game, fruitModels, snakeColors, onStep }) {
  const accumulator = useRef(0);

  useFrame((_, delta) => {
    if (game.status !== 'playing') {
      return;
    }

    accumulator.current += delta;
    const tickLength = Math.max(0.055, 0.12 - game.score * 0.004);

    while (accumulator.current >= tickLength) {
      onStep();
      accumulator.current -= tickLength;
    }
  });

  return (
    <>
      <color attach="background" args={['#15113f']} />
      <fog attach="fog" args={['#15113f', 24, 92]} />
      <SpaceBackdrop />
      <ambientLight intensity={0.58} />
      <directionalLight position={[6, 9, 5]} intensity={1.85} color="#fff7ad" />
      <directionalLight position={[-4, -2, -5]} intensity={0.55} color="#67e8f9" />
      <Planet />
      <SphereSnake body={game.body} headColor={snakeColors.head} bodyColor={snakeColors.body} />
      <Food food={game.food} fruitModels={fruitModels} />
      <CameraFollower head={game.body[0]} forward={game.forward} />
    </>
  );
}

function makeInitialGame(status = 'playing') {
  const snake = makeInitialSnake(START_LENGTH, SPHERE_RADIUS, SEGMENT_SPACING);

  return {
    body: snake.body,
    forward: snake.forward,
    food: spawnFoodAwayFromSnake(snake.body),
    pendingTurn: 0,
    growBy: 0,
    score: 0,
    status,
  };
}

function getFruitPointerAngle(game) {
  const head = game.body[0];
  const normal = head.clone().normalize();
  const toFood = game.food.position.clone().sub(head);
  const tangentToFood = tangentFromDirection(toFood, normal);
  const screenUp = new THREE.Vector3(0, 0, -1);
  const projectedUp = screenUp.sub(normal.clone().multiplyScalar(screenUp.dot(normal)));

  if (projectedUp.lengthSq() < 0.0001) {
    projectedUp.set(1, 0, 0).sub(normal.clone().multiplyScalar(normal.x));
  }

  projectedUp.normalize();
  const projectedRight = new THREE.Vector3().crossVectors(projectedUp, normal).normalize();

  return Math.atan2(tangentToFood.dot(projectedRight), tangentToFood.dot(projectedUp));
}

export default function Game() {
  const [game, setGame] = useState(() => makeInitialGame('menu'));
  const [fruitModels, setFruitModels] = useState(null);
  const [showColorOptions, setShowColorOptions] = useState(false);
  const [snakeColors, setSnakeColors] = useState({
    head: '#6ee7b7',
    body: '#14b8a6',
  });
  const fruitPointerAngle = getFruitPointerAngle(game);
  const pointerStartX = useRef(0);
  const steeringRef = useRef(0);
  const musicRef = useRef(null);
  const eatSoundRef = useRef(null);
  const eatSoundTimeoutRef = useRef(null);

  const startMusic = useCallback(() => {
    if (!musicRef.current) {
      musicRef.current = new Audio(`${PUBLIC_BASE_URL}music/Snake.mp3`);
      musicRef.current.loop = true;
      musicRef.current.volume = 0.45;
    }

    musicRef.current.play().catch(() => {
      // Browsers can block audio until a direct user gesture; the next start/restart click will retry.
    });
  }, []);

  const playEatSound = useCallback(() => {
    if (!eatSoundRef.current) {
      eatSoundRef.current = new Audio(`${PUBLIC_BASE_URL}music/eatingnoises.mp3`);
      eatSoundRef.current.volume = 0.75;
    }

    window.clearTimeout(eatSoundTimeoutRef.current);
    eatSoundRef.current.pause();
    eatSoundRef.current.currentTime = 0;
    eatSoundRef.current.play().catch(() => {});
    eatSoundTimeoutRef.current = window.setTimeout(() => {
      eatSoundRef.current.pause();
      eatSoundRef.current.currentTime = 0;
    }, 1000);
  }, []);

  const restart = useCallback(() => {
    startMusic();
    setGame(makeInitialGame('playing'));
  }, [startMusic]);

  const startGame = useCallback(() => {
    if (!fruitModels) {
      return;
    }

    startMusic();
    setGame(makeInitialGame('playing'));
  }, [fruitModels, startMusic]);

  useEffect(() => {
    let cancelled = false;

    loadFruitModels()
      .then((models) => {
        if (!cancelled) {
          setFruitModels(models);
        }
      })
      .catch((error) => {
        console.error('Failed to load fruit models', error);
        if (!cancelled) {
          setFruitModels({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const queueTurn = useCallback((direction) => {
    setGame((current) => {
      if (current.status !== 'playing') {
        return current;
      }

      return {
        ...current,
        pendingTurn: THREE.MathUtils.clamp(current.pendingTurn + direction, -1, 1),
      };
    });
  }, []);

  const stepGame = useCallback(() => {
    setGame((current) => {
      if (current.status !== 'playing') {
        return current;
      }

      const normal = current.body[0].clone().normalize();
      const pointerTurn = Math.abs(steeringRef.current) > 0.06 ? steeringRef.current : 0;
      const turnAmount = current.pendingTurn || pointerTurn;
      const turnedForward = turnAmount
        ? turnTangent(current.forward, normal, turnAmount * TURN_ANGLE)
        : tangentFromDirection(current.forward, normal);
      const moved = moveAlongSphere(current.body[0], turnedForward, SEGMENT_SPACING, SPHERE_RADIUS);
      const nextBody = [moved.position, ...current.body];
      const ateFood = surfaceDistance(moved.position, current.food.position) < FOOD_COLLISION_RADIUS;

      if (ateFood) {
        playEatSound();
      }

      const growthQueue = current.growBy + (ateFood ? current.food.fruit.growth : 0);
      const targetLength = current.body.length + (growthQueue > 0 ? 1 : 0);
      const trimmedBody = nextBody.slice(0, targetLength);
      const hitSelf = trimmedBody
        .slice(5)
        .some((segment) => surfaceDistance(moved.position, segment) < SEGMENT_SPACING * 0.72);

      if (hitSelf) {
        return {
          ...current,
          body: trimmedBody,
          forward: moved.forward,
          pendingTurn: 0,
          status: 'gameOver',
        };
      }

      return {
        body: trimmedBody,
        forward: moved.forward,
        food: ateFood ? spawnFoodAwayFromSnake(trimmedBody) : current.food,
        pendingTurn: 0,
        growBy: Math.max(0, growthQueue - 1),
        score: current.score + (ateFood ? current.food.fruit.growth : 0),
        status: 'playing',
      };
    });
  }, [playEatSound]);

  const updatePointerSteering = useCallback((clientX) => {
    const dragDistance = clientX - pointerStartX.current;
    steeringRef.current = THREE.MathUtils.clamp(-dragDistance / 120, -1, 1);
  }, []);

  const handlePointerDown = useCallback((event) => {
    if (game.status !== 'playing') {
      return;
    }

    pointerStartX.current = event.clientX;
    steeringRef.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [game.status]);

  const handlePointerMove = useCallback((event) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    updatePointerSteering(event.clientX);
  }, [updatePointerSteering]);

  const handlePointerUp = useCallback((event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    steeringRef.current = 0;
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        queueTurn(1);
      }

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        queueTurn(-1);
      }

      if (event.code === 'Space' && game.status !== 'playing') {
        restart();
      }

      if ((event.code === 'Enter' || event.code === 'Space') && game.status === 'menu') {
        startGame();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game.status, queueTurn, restart, startGame]);

  useEffect(() => {
    return () => {
      window.clearTimeout(eatSoundTimeoutRef.current);
      musicRef.current?.pause();
      eatSoundRef.current?.pause();
    };
  }, []);

  return (
    <main
      className="game-shell"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Canvas camera={{ position: [0, 8, 9], fov: 48 }} dpr={[1, 2]}>
        <Scene game={game} fruitModels={fruitModels} snakeColors={snakeColors} onStep={stepGame} />
      </Canvas>

      {game.status === 'playing' && (
        <div className="fruit-pointer" aria-label="Direction to fruit">
          <div
            className="fruit-pointer-arrow"
            style={{ transform: `rotate(${fruitPointerAngle}rad)` }}
          />
        </div>
      )}

      {game.status !== 'menu' && (
        <section className="hud" aria-label="Game status">
          <div>
            <span className="label">Score</span>
            <strong>{game.score}</strong>
          </div>
          <div>
            <span className="label">Speed</span>
            <strong>{Math.round((1 / Math.max(0.055, 0.12 - game.score * 0.004)) * 10) / 10}</strong>
          </div>
        </section>
      )}

      {game.status === 'menu' && (
        <div className="overlay menu-overlay" role="dialog" aria-modal="true">
          <div className="menu-panel">
            <h1>Snake3D</h1>
            <button type="button" onClick={startGame} disabled={!fruitModels}>
              {fruitModels ? 'Start' : 'Loading'}
            </button>
            <button
              type="button"
              className="secondary-menu-button"
              onClick={() => setShowColorOptions((isVisible) => !isVisible)}
            >
              Choose Colors
            </button>
            {showColorOptions && (
              <div className="color-options" aria-label="Snake color options">
                  <label>
                    <span>Head</span>
                    <input
                      type="color"
                      value={snakeColors.head}
                      onChange={(event) => setSnakeColors((colors) => ({ ...colors, head: event.target.value }))}
                      aria-label="Snake head color"
                    />
                  </label>
                  <label>
                    <span>Body</span>
                    <input
                      type="color"
                      value={snakeColors.body}
                      onChange={(event) => setSnakeColors((colors) => ({ ...colors, body: event.target.value }))}
                      aria-label="Snake body color"
                    />
                  </label>
              </div>
            )}
          </div>
        </div>
      )}

      {game.status === 'gameOver' && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="dialog">
            <h1>Game Over</h1>
            <p>Score: {game.score}</p>
            <button type="button" onClick={restart}>Restart</button>
          </div>
        </div>
      )}

    </main>
  );
}
