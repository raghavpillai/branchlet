# Test Setup Documentation

This project uses **Bun** as the test runner with comprehensive unit tests covering core functionality.

## Test Structure

### Core Utilities Tests (`src/utils/__tests__/`)
- **`error-handlers.test.ts`**: Tests all error handling classes and git error parsing
- **`git-commands-simple.test.ts`**: Integration tests for git command execution
- **`path-utils-simple.test.ts`**: Tests for path manipulation and validation utilities

### Test Coverage
- ✅ **Error Handling**: All custom error classes and git error parsing
- ✅ **Git Commands**: Command execution and result parsing
- ✅ **Path Utilities**: Template resolution, path validation, branch name validation
- ✅ **Integration**: Real git repository detection and operations

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run complete CI pipeline
bun run ci
```

## CI/CD Pipeline

The project includes a comprehensive GitHub Actions workflow (`.github/workflows/ci.yml`) that:

1. **Tests across multiple Node.js versions** (18, 20, 22)
2. **Runs type checking** with TypeScript
3. **Performs linting** with Biome
4. **Executes all tests** with coverage
5. **Builds the project** and tests CLI installation
6. **Security auditing** of dependencies
7. **Automated releases** to NPM on main branch pushes

## Test Philosophy

The tests are designed to be:
- **Fast**: Simple unit tests without complex mocking
- **Reliable**: Integration tests that work in any git repository
- **Comprehensive**: Cover error cases and edge conditions
- **Maintainable**: Clear structure and minimal dependencies

## Key Features Tested

- Git repository detection and root finding
- Branch name and directory name validation  
- Error handling for all git operations
- Template variable resolution for worktree paths
- Command execution with proper error reporting

The test suite ensures the CLI works reliably across different environments and handles edge cases gracefully.