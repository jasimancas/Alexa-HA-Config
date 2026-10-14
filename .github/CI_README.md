# GitHub Configuration

This directory contains GitHub-specific configuration files for CI/CD, issue templates, and automation.

## Structure

```
.github/
├── workflows/          # GitHub Actions workflows
│   ├── ci.yml         # Main CI pipeline (lint, test, build, docker)
│   └── code-quality.yml # Code quality checks (lint, type-check, security)
├── ISSUE_TEMPLATE/    # Issue templates
│   ├── bug_report.yml
│   └── feature_request.yml
├── dependabot.yml     # Dependabot configuration
├── pull_request_template.md
└── README.md          # This file
```

## Workflows

### CI Pipeline (`ci.yml`)

Runs on push to `main` and `develop` branches, and on all pull requests.

**Jobs:**
- **Lint**: Runs Biome linter
- **Test**: Runs Vitest tests with coverage reporting
- **Build**: TypeScript type checking and Next.js build
- **Docker**: Builds Docker image (only on `main` branch pushes)

**Triggers:**
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### Code Quality (`code-quality.yml`)

Additional quality checks that run on every push and PR.

**Jobs:**
- **Quality**: Biome linting, formatting, type checking, unused dependencies
- **Security**: Security audit with `pnpm audit`
- **Size**: Bundle size analysis

## Dependabot

Automatically creates PRs for dependency updates:

- **npm packages**: Weekly on Mondays at 9 AM
- **GitHub Actions**: Weekly on Mondays at 9 AM
- **Docker**: Weekly on Mondays at 9 AM

PRs are grouped by dependency type (production vs development).

## Issue Templates

### Bug Report (`bug_report.yml`)

Structured form for reporting bugs with fields for:
- Description
- Reproduction steps
- Expected vs actual behavior
- Environment details
- Logs

### Feature Request (`feature_request.yml`)

Structured form for requesting features with fields for:
- Problem statement
- Proposed solution
- Alternatives considered
- Priority level
- Willingness to contribute

## Pull Request Template

Standard template that includes:
- Description and type of change
- Changes made
- Related issues
- Testing checklist
- Code quality checklist

## Setup Requirements

### Repository Secrets

For the CI/CD workflows to work properly, configure these secrets in GitHub:

1. **CODECOV_TOKEN** (optional)
   - For code coverage reporting
   - Get from [codecov.io](https://codecov.io)

### Branch Protection

Recommended branch protection rules for `main`:

1. **Require pull request reviews**: At least 1 approval
2. **Require status checks to pass**:
   - ✓ Lint
   - ✓ Test
   - ✓ Build
   - ✓ Code Quality Checks
3. **Require branches to be up to date**
4. **Include administrators**: Enforce for everyone

### Badges

Add these badges to your README.md:

```markdown
![CI](https://github.com/USERNAME/REPO/workflows/CI/badge.svg)
![Code Quality](https://github.com/USERNAME/REPO/workflows/Code%20Quality/badge.svg)
[![codecov](https://codecov.io/gh/USERNAME/REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/USERNAME/REPO)
```

## Local Testing

Test workflows locally before pushing:

```bash
# Install act
brew install act

# Run CI workflow
act -j lint
act -j test
act -j build
```

## Troubleshooting

### Workflow Fails on Type Check

The project has some existing TypeScript errors. To fix:
```bash
pnpm run type-check
```

### Tests Fail in CI

Ensure all tests pass locally:
```bash
pnpm test -- --run
```

### Docker Build Fails

Test Docker build locally:
```bash
docker build -t alexa:test .
```

## Maintenance

### Updating Node.js Version

Update in all workflow files:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'  # Update this version
```

### Updating Actions

Dependabot automatically updates GitHub Actions weekly. Review and merge PRs.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.
