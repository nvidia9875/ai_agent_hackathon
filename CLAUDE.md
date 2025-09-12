# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript 5 with React 19
- **Styling**: Tailwind CSS v4 with PostCSS
- **Fonts**: Geist Sans & Geist Mono from next/font/google

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production with Turbopack  
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

## Project Structure

```
app/                    # Next.js App Router directory
├── layout.tsx         # Root layout with fonts and metadata
├── page.tsx           # Home page component  
├── globals.css        # Global CSS with Tailwind imports
└── favicon.ico        # Site favicon

tsconfig.json          # TypeScript configuration with @/* path mapping
next.config.ts         # Next.js configuration (currently minimal)
postcss.config.mjs     # PostCSS configuration for Tailwind
```

## Key Conventions

- **Path Mapping**: Use `@/*` for root-level imports (configured in tsconfig.json)
- **Styling**: Tailwind CSS classes with built-in dark mode support
- **Images**: Use `next/image` component with proper optimization
- **Fonts**: Geist font variables are pre-configured in layout.tsx
- **TypeScript**: Strict mode enabled with ES2017 target

## Development Notes

- The app uses Next.js App Router (not Pages Router)
- Turbopack is enabled for faster development builds
- TailwindCSS v4 is configured with PostCSS
- Font variables `--font-geist-sans` and `--font-geist-mono` are available globally
- Standard Next.js project structure with minimal customization