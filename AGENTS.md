# Narvik Frontend - Agents Documentation

## Overview

This is the frontend application of **Narvik**, a comprehensive web application for managing French associations, particularly sporting associations. The application is built using modern Vue.js and Nuxt technologies.

**Official Website:** https://about.narvik.app/
**Backend API:** https://github.com/Narvik-app/backend

## Technology Stack

### Frontend Framework
- **Nuxt** - Modern Vue.js meta-framework
- **Vue** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript

### UI and Styling
- **Nuxt UI** - Modern UI component library
- **Tailwind CSS** - Utility-first CSS framework
- **Heroicons** - Beautiful hand-crafted SVG icons

### State Management & Data
- **Pinia** - Vue.js state management
- **Pinia Plugin Persistedstate** - State persistence
- **nuxt-api-party** - API integration

### Charts and Visualization
- **Chart.js** - Flexible charting library
- **vue-chartjs** - Vue.js wrapper for Chart.js

### Rich Text Editing
- **TipTap** - Extensible rich text editor
- **TipTap Starter Kit** - Basic TipTap extensions

### Additional Features
- **Day.js** - Date manipulation
- **JWT Decode** - JWT token handling
- **Vue QR Code Reader** - QR code scanning
- **V-Calendar** - Date picker component

## Project Structure

### Main Application (`app/`)
```
app/
├── components/         # Vue components organized by feature
│   ├── Chart/         # Chart components (Bar, Doughnut, Line)
│   ├── Club/          # Club management components
│   ├── Generic/       # Reusable generic components
│   ├── Inventory/     # Inventory management
│   ├── MemberSeason/  # Member season components
│   ├── Metric/        # Metrics and analytics
│   ├── Modal/         # Modal dialog components
│   └── User/          # User management components
├── composables/       # Vue composables and utilities
│   ├── api/           # API integration composables
│   │   ├── query/     # Query abstractions
│   │   └── clubDependent/ # Club-specific API queries
│   └── image.ts       # Image handling utilities
├── layouts/           # Application layouts
│   ├── admin.vue      # Admin layout
│   ├── default.vue    # Default layout
│   ├── email.vue      # Email-specific layout
│   ├── empty.vue      # Empty layout
│   ├── member.vue     # Member layout
│   ├── pos.vue        # Point of sale layout
│   └── super-admin.vue # Super admin layout
├── middleware/        # Route middleware
│   └── auth.global.ts # Global authentication middleware
├── pages/             # Application routes
│   ├── admin/         # Admin pages
│   ├── login/         # Authentication pages
│   ├── self.vue       # Self-service page
│   └── super-admin/   # Super admin pages
├── stores/            # Pinia state stores
│   ├── useAppConfig.ts    # Application configuration
│   ├── useMetricStore.ts  # Metrics state
│   └── useSelfUser.ts     # User profile state
├── types/             # TypeScript type definitions
│   ├── api/           # API-related types
│   ├── date.ts        # Date type utilities
│   ├── groupedNavigationLinks.ts # Navigation types
│   ├── jwtTokens.ts   # JWT token types
│   ├── select.ts      # Select component types
│   └── table.ts       # Table component types
└── utils/             # Utility functions
    ├── browser.ts     # Browser utilities
    ├── chart.ts       # Chart utilities
    ├── colors.ts      # Color utilities
    ├── date.ts        # Date manipulation
    ├── error.ts       # Error handling
    ├── file.ts        # File handling
    ├── resource.ts    # Resource management
    ├── string.ts      # String utilities
    └── table.ts       # Table utilities
```

### Configuration Files
```
├── nuxt.config.ts         # Nuxt configuration
├── package.json           # Dependencies and scripts
├── pnpm-lock.yaml         # PNPM lock file
├── pnpm-workspace.yaml    # PNPM workspace config
├── .env.example           # Environment variables template
├── .gitignore            # Git ignore rules
└── .dockerignore         # Docker ignore rules
```

### Build and Deployment
```
├── Dockerfile            # Docker image definition
├── docker/              # Docker configuration
│   └── docker-entrypoint.sh # Container entrypoint
└── Makefile             # Development commands
```

## Agent Context Exclusions

When working with agents, certain files and directories should be excluded from the agent's context to ensure security and performance:

### Sensitive Configuration Files
- **`.env*`** - Environment configuration files containing secrets, API keys, and client credentials
- **`runtimeConfig`** - Runtime configuration containing sensitive data in `nuxt.config.ts`

### Generated and Cache Directories
- **`.output/`** - Nuxt build output directory
- **`.nuxt/`** - Nuxt development cache
- **`.vite/`** - Vite build cache and temp files
- **`node_modules/`** - Node.js dependencies (handled by PNPM)
- **`.pnpm/`** - PNPM cache directory

### Development and Build Artifacts
- **`.git/`** - Git repository data and history
- **`*.log`** - Log files
- **`*.tmp`** - Temporary files
- **`*.bak`** - Backup files
- **`localhost.pem`** & **`localhost-key.pem`** - SSL certificates

### Docker and Container Files
- **`docker/`** - Docker configuration and scripts
- **`Dockerfile`** - Container definition

### Recommended Agent Focus Areas
Agents should primarily focus on:
- **`app/`** - Application source code and components
- **`nuxt.config.ts`** - Core configuration (excluding sensitive parts)
- **`package.json`** - Dependencies and scripts
- **`docs/`** - Documentation
- **`README.md`** - Project overview
- **Project root files** - TypeScript configs, ESLint configs, etc.

This ensures agents work with the actual application code while avoiding sensitive data, generated files, and dependencies that could slow down processing.

## Development Workflow

### Development Setup

1. **Prerequisites:**
   - Docker and Docker Compose installed
   - PNPM package manager

2. **Quick Start:**
   ```bash
   # Development server with SSL
   pnpm dev
   ```

3. **Development Server:**
   - Development URL: https://localhost:3000
   - Uses SSL certificate for local development
   - Auto-reload on file changes

4. **Build and Production:**
   ```bash
   # Build for production
   pnpm build

   # Preview production build
   pnpm preview
   ```

### Package Manager Commands

**CRITICAL REQUIREMENT:** All package manager operations should be run on the host system using PNPM.

#### Correct Command Execution Patterns:

**1. Using PNPM directly on host (Recommended):**
```bash
# ✅ CORRECT - Run on host system
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm lint:fix
```

#### Why This Differs from Backend:

Unlike the backend which requires container execution for PHP commands, the frontend can run package managers and build tools directly on the host system because:
1. **Node.js Availability:** Modern development systems typically have Node.js installed
2. **Development Experience:** Direct host execution provides better development experience with hot reload
3. **Tool Compatibility:** Frontend build tools work reliably across different host environments
4. **Performance:** Direct execution is often faster than containerized development

#### Quick Reference for Common Operations:

| Operation            | Correct Command                   | Notes                                    |
|----------------------|-----------------------------------|------------------------------------------|
| Install dependencies | `pnpm install`                    | Run on host system                       |
| Development server   | `pnpm dev`                        | Runs with SSL on localhost:3000          |
| Build production     | `pnpm build`                      | Generate optimized build                 |
| Preview build        | `pnpm preview`                    | Preview production build locally         |
| Lint code            | `pnpm lint`                       | Check code quality with ESLint           |
| Fix lint issues      | `pnpm lint:fix`                   | Automatically fix ESLint issues          |

## Architecture Principles

### 1. **Component-Based Architecture**
- Modular Vue.js components organized by feature
- Reusable generic components in `components/Generic/`
- Clear separation between presentational and business logic components

### 2. **State Management**
- Pinia stores for centralized state management
- Persistent state for user preferences and cart data
- Club-dependent state management for multi-tenant architecture

### 3. **API Integration**
- nuxt-api-party for type-safe API calls
- Abstract query classes for consistent data fetching
- Real-time updates via Mercure integration

### 4. **Type Safety**
- Comprehensive TypeScript usage throughout the application
- Strict typing for API responses and component props
- Type definitions for all major entities and data structures

### 5. **Responsive Design**
- Mobile-first approach with Tailwind CSS
- Nuxt UI components for consistent design system
- Dark/light mode support via colorMode configuration

### 6. **Security**
- JWT token-based authentication
- CSRF protection and input validation
- Secure API communication with backend

## Component Architecture

### Layout System
The application uses multiple layouts for different user roles:
- **Admin Layout** - Full administrative interface
- **Super Admin Layout** - Elevated administrative privileges
- **Member Layout** - Simplified interface for members
- **POS Layout** - Point of sale specific interface
- **Email Layout** - Email template layout
- **Default Layout** - General purpose layout
- **Empty Layout** - Minimal layout for specific pages

### State Management Pattern
- **Pinia Stores** - Centralized state management
  - `useAppConfig.ts` - Application configuration
  - `useSelfUser.ts` - Current user profile
  - `useCartStore.ts` - Shopping cart functionality
  - `usePresenceStore.ts` - Member presence tracking
  - `useSaleStore.ts` - Sales management
  - `useMetricStore.ts` - Analytics and metrics
  - `useExternalPresence.ts` - External presence tracking

### API Layer Architecture
- **Abstract Query Classes** - Reusable API query logic
- **Club-Dependent Queries** - Multi-tenant data fetching
- **Plugin-Specific Queries** - Modular feature support
  - Emailing plugin queries
  - Presence plugin queries
  - Sale plugin queries

## Key Features

### 1. **Multi-Role Interface**
- Admin, Super Admin, Member, and Badger interfaces
- Role-based navigation and component visibility
- Secure authentication flow

### 2. **Real-Time Features**
- Presence tracking with real-time updates

### 3. **Rich Media Support**
- QR code generation and scanning
- Image upload and management
- Chart visualizations with Chart.js
- Rich text editing with TipTap

### 4. **Data Management**
- Comprehensive CRUD operations
- Advanced filtering and sorting
- Data import/export functionality
- Bulk operations support

### 5. **Email System**
- Template-based email creation
- Dynamic content generation
- Email list management
- Automated email workflows

## Testing Strategy

While not explicitly configured in the current setup, the recommended testing approach would include:

### Recommended Testing Tools
- **Vitest** - Fast unit testing framework
- **Vue Test Utils** - Vue.js testing utilities
- **Playwright** - Modern web testing

### Testing Structure
```
tests/
├── unit/              # Unit tests for components and utilities
├── integration/       # Integration tests for composables and stores
├── e2e/              # End-to-end tests for user workflows
└── fixtures/         # Test data and mocks
```

## Performance Optimizations

### Build Optimizations
- **Code Splitting** - Automatic route-based code splitting
- **Tree Shaking** - Unused code elimination
- **Asset Optimization** - Image and static asset optimization
- **Bundle Analysis** - Regular bundle size monitoring

### Runtime Optimizations
- **Lazy Loading** - Component and route lazy loading
- **Caching Strategy** - Intelligent caching for API responses
- **Real-Time Updates** - Efficient Mercure integration
- **State Persistence** - Smart state management and persistence

## Deployment

### Development
- Local development server with SSL
- Hot reload for immediate feedback
- Docker container for consistent environment

### Production
- Optimized Docker builds with multi-stage builds
- Cloud deployment via Docker registries
- Progressive Web App (PWA) capabilities
- Static asset optimization

### Monitoring
- Error tracking and logging
- Performance monitoring
- User analytics integration (configurable)

## Contributing

For detailed development guidelines, see the project documentation:
- [Development Documentation](docs/0.README.md)
- [User Documentation](https://docs.narvik.app/frontend/)

### Code Quality
- ESLint for code linting and formatting
- TypeScript for type safety
- Conventional commit messages recommended
- Component composition patterns

## License

GNU AGPLv3 License - See [LICENSE](LICENSE) file for details.

---

**Created by:** Benoît VIGNAL
**Version:** 3.12.2
**Last Updated:** 2025-11-22
