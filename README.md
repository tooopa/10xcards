# 10xCards

A web application that enables automatic flashcard generation using Large Language Models (LLMs). The project streamlines the process of creating high-quality educational flashcards from user-provided text, making learning more efficient through spaced repetition.

## Project Description

10xCards addresses the challenge of manual flashcard creation by leveraging AI to automatically generate flashcards from text input. Users can paste any text (e.g., textbook excerpts) and receive AI-generated flashcard suggestions with questions and answers. The application also supports manual flashcard creation and management, user authentication, and integration with spaced repetition algorithms to optimize learning efficiency.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Tech Stack

**Frontend:**
- [Astro 5](https://astro.build/) - Fast, efficient web framework with minimal JavaScript
- [React 19](https://react.dev/) - Interactive component library
- [TypeScript 5](https://www.typescriptlang.org/) - Static type checking and improved IDE support
- [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first CSS framework
- [Shadcn/ui](https://ui.shadcn.com/) - Re-usable React component library

**Backend:**
- [Supabase](https://supabase.com/) - PostgreSQL database with built-in authentication (Backend-as-a-Service)
- [OpenRouter.ai](https://openrouter.ai/) - AI API service providing access to multiple LLM models (OpenAI, Anthropic, Google, etc.)

**Development & Deployment:**
- [GitHub Actions](https://github.com/features/actions) - CI/CD pipelines
- [DigitalOcean](https://www.digitalocean.com/) - Application hosting via Docker images

## Getting Started Locally

### Prerequisites

- Node.js 22.14.0 (specified in `.nvmrc`)
- npm or yarn package manager
- Supabase account and project (for database and authentication)
- OpenRouter.ai API key (for AI flashcard generation)

### Installation Steps

1. **Clone the repository:**
   ```sh
   git clone https://github.com/przeprogramowani/10x-cards.git
   cd 10x-cards
   ```

2. **Use the correct Node.js version:**
   ```sh
   nvm use
   ```
   This will switch to Node.js version 22.14.0 as specified in `.nvmrc`.

3. **Install dependencies:**
   ```sh
   npm install
   ```

4. **Set up environment variables:**
   Create a `.env` file in the project root with the following variables:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

5. **Run the development server:**
   ```sh
   npm run dev
   ```
   The application will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

- **`npm run dev`** - Starts the Astro development server with hot module replacement
- **`npm run build`** - Builds the project for production deployment
- **`npm run preview`** - Previews the production build locally before deployment
- **`npm run astro`** - Runs Astro CLI commands
- **`npm run lint`** - Runs ESLint to check for code quality and linting issues
- **`npm run lint:fix`** - Automatically fixes linting issues where possible
- **`npm run format`** - Formats code using Prettier

## Project Scope

10xCards is designed as an MVP to significantly reduce the time and effort required for creating educational flashcards. The project includes the following core features:

### In Scope (MVP)

- ✅ **AI-powered flashcard generation** - Automatically generate flashcard suggestions from text input (1000-10,000 characters)
- ✅ **Manual flashcard creation** - Create, edit, and delete flashcards manually
- ✅ **User authentication** - Secure registration, login, and account management via Supabase
- ✅ **Flashcard management** - View, edit, and organize your personal flashcards
- ✅ **Spaced repetition integration** - Ready for integration with spaced repetition algorithms
- ✅ **Usage statistics** - Track generation efficiency and acceptance rates of AI-generated flashcards

### Out of Scope (Future Enhancements)

- Advanced custom spaced repetition algorithms (using open-source solutions instead)
- Gamification features
- Mobile applications (web version only)
- Document import (PDF, DOCX, etc.)
- Public API
- Flashcard sharing between users
- Advanced notification system
- Advanced search functionality with keywords

### Success Metrics

- 75% of AI-generated flashcards are accepted by users
- Users create at least 75% of new flashcards using AI (vs. manual creation)
- 100 active users within the first three months

## Project Status

**Current Status:** MVP - Active Development

The project is currently in the MVP stage and under active development. It is designed to onboard 100 active users within the first three months and will evolve based on user feedback.

### Development Progress

- Core flashcard generation and management features are implemented
- User authentication and data storage via Supabase
- AI integration through OpenRouter.ai
- UI components and flashcard views are functional

Future updates will be based on user feedback and usage analytics.

## License

This project is licensed under the MIT License.
