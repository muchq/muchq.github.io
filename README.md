# MuchQ

Just some doodles and a pretty chill game.

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
│   ├── ThoughtsNavigation.tsx # Thoughts page navigation
│   ├── GolfGame.tsx     # Golf game component
│   ├── GolfNavigation.tsx     # Golf page navigation
│   ├── GroupsNavigation.tsx   # Groups page navigation
│   ├── PermutationVisualizer.tsx # Interactive permutation tool
│   ├── CycleDecomposer.tsx    # Cycle decomposition calculator
│   ├── PermutationQuiz.tsx    # Interactive quiz component
│   ├── SignCalculator.tsx     # Permutation sign calculator
│   └── __tests__/       # Component tests
├── hooks/               # Custom React hooks
│   ├── useWebGL.ts      # WebGL Julia set logic
│   ├── useThoughtsGame.ts # Thoughts game engine logic
│   └── useGolfGame.ts   # Golf game engine logic
├── pages/               # Page components
│   ├── HomePage.tsx     # Landing page
│   ├── ThoughtsPage.tsx # Thoughts game page
│   ├── GolfPage.tsx     # Golf game page
│   └── GroupsPage.tsx   # Permutation groups learning module
├── types/               # TypeScript type definitions
│   ├── game.ts          # Game-related types
│   └── vite-env.d.ts    # Vite environment types
├── utils/               # Utility functions
│   └── gameUtils.ts     # Game helper functions
└── test/                # Test configuration
    └── setup.ts         # Test setup
```

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

Old time-y implementation is preserved in the `backup/` directory.

## Documentation

- [Thoughts Multiplayer API](THOUGHTS.md) - WebSocket API specification for the multiplayer game environment