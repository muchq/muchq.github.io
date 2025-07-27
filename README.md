# MuchQ Portfolio

A modern portfolio website built with React, TypeScript, and Vite, featuring interactive WebGL backgrounds and a 3D thoughts game.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Building

```bash
# Type check
npm run typecheck

# Lint code
npm run lint

# Run tests
npm run test

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── Navigation.tsx   # Main navigation
│   ├── JuliaSetBackground.tsx # WebGL Julia set renderer
│   ├── MathAnimations.tsx     # Floating math equations
│   ├── ThoughtsGame.tsx       # 3D thoughts game
│   └── __tests__/       # Component tests
├── hooks/               # Custom React hooks
│   ├── useWebGL.ts      # WebGL Julia set logic
│   └── useThoughtsGame.ts # Game engine logic
├── pages/               # Page components
│   ├── HomePage.tsx     # Landing page
│   └── ThoughtsPage.tsx # Thoughts game page
├── types/               # TypeScript type definitions
│   ├── game.ts          # Game-related types
│   └── vite-env.d.ts    # Vite environment types
├── utils/               # Utility functions
│   └── gameUtils.ts     # Game helper functions
└── test/                # Test configuration
    └── setup.ts         # Test setup
```

## 🎮 Features

### Landing Page
- **Interactive Julia Set Background**: WebGL-powered fractal visualization that responds to mouse movement
- **Animated Math Equations**: MathML equations floating with CSS animations
- **Responsive Navigation**: Mobile-friendly navigation with animated dropdowns

### Thoughts Game
- **Real-time 3D Rendering**: WebGL2 ray-traced graphics engine
- **Multiplayer Support**: Network architecture for multiplayer gameplay
- **Mobile Controls**: Touch-friendly virtual joysticks
- **Audio System**: Background music and sound effects
- **Mini-map**: Real-time player tracking

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: CSS Modules
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + TypeScript ESLint
- **Graphics**: WebGL2 + GLSL shaders
- **Deployment**: GitHub Pages via GitHub Actions

## 📦 Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the main branch. The GitHub Actions workflow:

1. ✅ Type checks with TypeScript
2. ✅ Lints code with ESLint
3. ✅ Runs tests with Vitest
4. 🏗️ Builds the production bundle
5. 🚀 Deploys to GitHub Pages

## 🎨 Key Components

### JuliaSetBackground
Interactive WebGL Julia set fractal renderer with:
- Mouse-responsive parameter control
- Retro grid patterns for convergent areas
- Animated star fields and twinkling effects
- Smooth color transitions

### ThoughtsGame
Complete 3D multiplayer game engine featuring:
- **Ray-traced rendering** with reflections, shadows, and dynamic lighting
- **Real-time physics** simulation with bouncing spheres and collision detection
- **Procedural environments** with stormy sky, lightning effects, and animated clouds
- **Multiplayer networking** with WebSocket support and bot simulation
- **Shape morphing** - cycle between spheres, cubes, and pyramids (spacebar)
- **Mobile controls** - virtual joysticks for touch devices
- **Audio system** - background music generation and bounce sound effects
- **Mini-map** with real-time player tracking and world boundaries
- **Advanced graphics** - WebGL2 shaders with 3D noise and atmospheric effects

## 🧪 Testing

```bash
# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test -- --run
```

## 📝 Original Migration

This project was migrated from hand-rolled HTML/CSS/JavaScript to a modern React + TypeScript + Vite setup to enable:

- **Better Code Organization**: Modular components and hooks
- **Type Safety**: Full TypeScript coverage
- **Testing Infrastructure**: Comprehensive test suite
- **Modern Build Pipeline**: Optimized production builds
- **Development Experience**: Hot reloading, type checking, linting

Original files are preserved in the `backup/` directory.

## Documentation

- [Thoughts Multiplayer API](THOUGHTS.md) - WebSocket API specification for the multiplayer sphere environment