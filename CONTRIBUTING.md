# Contributing to Alexa HA Config

Thank you for your interest in contributing to Alexa HA Config! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

This project follows a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/alexa.git`
3. Add upstream remote: `git remote add upstream https://github.com/ORIGINAL_OWNER/alexa.git`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js 20 or higher
- pnpm 9 or higher
- Docker (optional, for testing the full setup)

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Run linter
pnpm lint
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure the necessary environment variables:

```bash
cp .env.example .env.local
```

## Development Workflow

1. **Create a branch** from `main` for your work:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** following the coding standards

3. **Test your changes**:
   ```bash
   pnpm test
   pnpm lint
   pnpm type-check
   ```

4. **Commit your changes** following the commit message guidelines

5. **Push to your fork**:
   ```bash
   git push origin feature/my-feature
   ```

6. **Open a Pull Request** against the `main` branch

## Pull Request Process

1. Ensure all tests pass and there are no linting errors
2. Update documentation if needed
3. Add or update tests for your changes
4. Fill out the pull request template completely
5. Link any related issues
6. Wait for review from maintainers
7. Address any feedback or requested changes
8. Once approved, your PR will be merged

### PR Checklist

- [ ] Tests pass locally
- [ ] Code follows style guidelines (Biome passes)
- [ ] TypeScript types are correct (type-check passes)
- [ ] Added/updated tests for changes
- [ ] Updated documentation
- [ ] Followed commit message guidelines
- [ ] PR description is clear and complete

## Coding Standards

This project uses [Biome](https://biomejs.dev/) for linting and formatting.

### Key Standards

- **TypeScript**: All code must be properly typed. Avoid using `any`.
- **Formatting**: Run `pnpm format` before committing
- **Linting**: Run `pnpm lint:fix` to auto-fix issues
- **Naming Conventions**:
  - Components: PascalCase (e.g., `MyComponent.tsx`)
  - Hooks: camelCase with `use` prefix (e.g., `useMyHook.ts`)
  - Utilities: camelCase (e.g., `myUtil.ts`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MY_CONSTANT`)

### File Structure

```
src/
├── components/     # React components
├── contexts/       # React contexts
├── hooks/          # Custom React hooks
├── pages/          # Next.js pages and API routes
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── test/           # Test setup files
```

## Testing Guidelines

### Writing Tests

- Write tests for all new features and bug fixes
- Use descriptive test names that explain what is being tested
- Follow the AAA pattern: Arrange, Act, Assert
- Mock external dependencies
- Aim for at least 80% code coverage

### Test Structure

```typescript
describe("ComponentName", () => {
  beforeEach(() => {
    // Setup
  });

  it("should do something specific", () => {
    // Arrange
    const input = "test";

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe("expected");
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run tests with coverage
pnpm test:coverage

# Run tests with UI
pnpm test:ui
```

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates, etc.
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```bash
feat(entities): add filter by entity category

fix(websocket): handle connection timeout properly

docs(readme): update installation instructions

test(hooks): add tests for useEntities hook

chore(deps): update dependencies
```

### Scope

The scope should be the name of the module affected:
- `entities`
- `websocket`
- `api`
- `ui`
- `config`
- `docker`

## Questions?

If you have questions or need help:

1. Check existing issues and discussions
2. Open a new issue with the `question` label
3. Join our community discussions

## License

By contributing to Alexa HA Config, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing! 🎉
