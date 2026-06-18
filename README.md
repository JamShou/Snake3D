[![Build](https://github.com/JamShou/Snake3D/actions/workflows/build.yml/badge.svg)](https://github.com/JamShou/Snake3D/actions/workflows/build.yml)
[![Deploy](https://github.com/JamShou/Snake3D/actions/workflows/deploy.yml/badge.svg)](https://github.com/JamShou/Snake3D/actions/workflows/deploy.yml)

# Snake-3D

Snake-3D is a browser-based 3D Snake game built with Vite, React, Three.js, and React Three Fiber. Instead of moving on a flat grid, the snake travels around the surface of a spherical planet, eating fruit models and growing longer.

## Features

- Snake movement on a spherical planet surface.
- Mouse and touch steering with drag-based turning.
- Keyboard fallback controls.
- Randomized fruit food using `.glb` models.
- Fruit-specific growth and scoring:
  - Banana: `+3`
  - Egg: `+1`
  - Orange: `+5`
- Procedural vibrant planet texture.
- Colorful space background.
- Start menu, game-over state, score display, and speed display.
- Background music and eating sound effect.

## Controls

- Mouse or touch: press and drag left/right to steer.
- `A` or `Left Arrow`: turn left.
- `D` or `Right Arrow`: turn right.
- `Enter` or `Space`: start from the menu.
- `Space`: restart after game over.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173/
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Assets

Fruit models live in:

```text
public/fruits/
```

Current fruit files:

- `Banana.glb`
- `Egg.glb`
- `Orange.glb`

Audio files live in:

```text
public/music/
```

Current audio files:

- `Snake.mp3`
- `eatingnoises.mp3`

For new models, `.glb` is preferred because it can package geometry, materials, and textures into one web-friendly file.

## Project Structure

```text
src/
  App.jsx
  Game.jsx
  SphereSnake.jsx
  main.jsx
  styles.css
  utils/
    sphereMath.js
public/
  fruits/
  music/
```

## Technical Notes

- The snake head position is represented as a normalized 3D vector projected onto a sphere.
- The snake forward direction is kept tangent to the sphere surface.
- Turning rotates the tangent direction around the current surface normal.
- Movement advances the snake by rotating the head around a sphere-relative axis, then re-projecting onto the sphere.
- Body segments follow previous positions on the sphere.
- Self-collision ignores the closest body segments near the head.

## GitHub Pages

This project includes GitHub Actions workflows for CI and deployment:

- `.github/workflows/build.yml`
- `.github/workflows/deploy.yml`

The deploy workflow publishes the Vite `dist` folder to GitHub Pages from the `main` branch.
