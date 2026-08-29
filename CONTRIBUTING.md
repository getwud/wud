# Contributing to WUD (What's Up Docker?)

Welcome! We are excited that you are interested in contributing to **WUD**. This guide covers everything you need to set up your local development environment, understand the codebase architecture, run linters, and execute unit and end-to-end (E2E) test suites.

---

## 📋 Table of Contents

- [Prerequisites](#-prerequisites)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
- [Development Workflows](#-development-workflows)
  - [Backend Development (`app/`)](#1-backend-development-app)
  - [Frontend Development (`ui/`)](#2-frontend-development-ui)
  - [Documentation Website (`website/`)](#3-documentation-website-website)
  - [Building the Full Docker Image](#4-building-the-full-docker-image)
- [Code Quality & Linting](#-code-quality--linting)
- [Running Tests](#-running-tests)
  - [1. Unit Tests](#1-unit-tests)
  - [2. Backend E2E API Tests (Cucumber)](#2-backend-e2e-api-tests-cucumber)
  - [3. Frontend UI E2E Tests (Playwright)](#3-frontend-ui-e2e-tests-playwright)
- [Pull Request Checklist](#-pull-request-checklist)

---

## 💻 Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: `v24.x` (LTS recommended)
- **npm**: `v10.x` or later
- **Docker & Docker Compose v2**: Docker daemon running locally
- **Git**: For version control

---

## 🏗️ Project Architecture

WUD is organized as a modular repository with dedicated directories for each subsystem:

```text
wud/
├── app/          # Backend Node.js / Express / TypeScript engine
│                 # (Watchers, Registries, Triggers, Store, REST API, Prometheus)
├── ui/           # Frontend Vue 3 / Vuetify / TypeScript SPA dashboard
├── e2e/          # Backend E2E Cucumber test suite with Gherkin feature specs
├── ui-e2e/       # Frontend UI E2E test suite using Playwright
├── website/      # Documentation website built with Docusaurus
├── scripts/      # Automation scripts & Docker Compose definitions for E2E testing
└── Dockerfile    # Multi-stage Dockerfile packaging backend and frontend into release image
```

---

## 🚀 Getting Started

Clone the repository and install dependencies across all workspaces:

```bash
git clone https://github.com/getwud/wud.git
cd wud

# Install backend dependencies
(cd app && npm ci)

# Install frontend dependencies
(cd ui && npm ci)

# Install E2E test dependencies
(cd e2e && npm ci)

# (Optional) Install UI E2E & Documentation dependencies
(cd ui-e2e && npm ci)
(cd website && npm ci)
```

---

## 🛠️ Development Workflows

### 1. Backend Development (`app/`)

The backend engine is written in **TypeScript** using **Express**, **LokiJS**, and **Dockerode**.

```bash
cd app

# Run backend with auto-reload (ts-node + nodemon + bunyan logger)
npm start

# Compile TypeScript to JavaScript (dist/)
npm run build
```

By default, WUD connects to `/var/run/docker.sock` and listens on port `3000`. You can pass environment variables as needed:

```bash
WUD_SERVER_PORT=3000 WUD_LOG_LEVEL=debug npm start
```

### 2. Frontend Development (`ui/`)

The web dashboard is a Single-Page Application (SPA) built with **Vue 3**, **Vuetify**, and **TypeScript**.

```bash
cd ui

# Start the development server with Hot Module Replacement (HMR)
npm run serve
```

The frontend dev server typically starts at `http://localhost:8080` and proxies API requests to `http://localhost:3000`.

To build the production frontend bundle (which outputs to `ui/dist`):

```bash
npm run build
```

### 3. Documentation Website (`website/`)

The official documentation at [https://getwud.github.io/wud/](https://getwud.github.io/wud/) is built with **Docusaurus**.

```bash
cd website

# Start local preview server with live reload
npm start

# Build production static website
npm run build
```

### 4. Building the Full Docker Image

To build the release container image locally:

```bash
# Using the helper script
./scripts/build-wud.sh

# Or directly via Docker BuildKit
DOCKER_BUILDKIT=1 docker build -t wud --build-arg WUD_VERSION=local .
```

---

## 🧹 Code Quality & Linting

All packages use **ESLint** and **Prettier** to enforce consistent style and quality.

```bash
# Lint the backend
cd app && npm run lint
# Auto-fix backend formatting & lints
cd app && npm run lint:fix

# Lint the frontend
cd ui && npm run lint

# Lint the E2E test suite
cd e2e && npm run lint
```

---

## 🧪 Running Tests

### 1. Unit Tests

Unit tests are implemented with **Jest** and cover registries, watchers, triggers, stores, models, and UI components.

#### Backend Unit Tests
```bash
cd app
npm test
```

#### Frontend Unit Tests
```bash
cd ui
npm run test:unit

# Watch mode during development
npm run test:unit:watch
```

---

### 2. Backend E2E API Tests (Cucumber)

WUD includes an automated E2E test suite that runs Cucumber/Gherkin scenarios against a live Docker environment with multiple container registries, watchers, and triggers.

#### Quick Local Run (Recommended for development)
Local mode skips tests tagged `@ci-only` (which require private registry secrets such as AWS ECR and GitLab tokens) while validating all public registries and core features:

```bash
cd e2e
npm run test:local
```

Or run the script directly from the project root:
```bash
LOCAL_MODE=true ./scripts/run-e2e-tests.sh
```

#### What `run-e2e-tests.sh` does:
1. Spins down any lingering test containers (`docker compose -f scripts/docker-compose.e2e.yml down -v`).
2. Pulls lightweight base images (`alpine`, `nginx`) and creates local spoofed registry tags (`setup-test-containers.sh`).
3. Launches WUD and test containers via Docker Compose.
4. Waits dynamically until WUD has completed its startup registry scans (`~5s`).
5. Executes Cucumber scenarios (`cucumber-js`).
6. Tears down all test containers automatically upon completion.

#### Full CI Suite Run
If you have private registry credentials configured in your `.env`:
```bash
cd e2e
npm run test:ci
```

---

### 3. Frontend UI E2E Tests (Playwright)

To test the web interface using **Playwright**:

```bash
# Automated headless run (builds UI, starts containers, runs tests)
./scripts/run-ui-tests.sh
```

Or interactively from `ui-e2e/` (requires WUD running on port 3000, e.g. via `docker compose -f scripts/docker-compose.e2e.yml up -d`):
```bash
cd ui-e2e
npx playwright install  # First time only

# Run headless
npm test

# Run in headed browser mode
npm run test:headed
```

---

## 📥 Pull Request Checklist

Before submitting a pull request, ensure your branch passes all checks:

- [ ] Backend unit tests pass: `cd app && npm test`
- [ ] Frontend unit tests pass: `cd ui && npm run test:unit`
- [ ] Code is linted without errors: `cd app && npm run lint` and `cd ui && npm run lint`
- [ ] E2E tests pass locally: `cd e2e && npm run test:local`
- [ ] UI E2E tests pass locally: `./scripts/run-ui-tests.sh`
- [ ] If documentation was updated, site builds cleanly: `cd website && npm run build`
- [ ] Commit messages are concise and descriptive.

Thank you for helping make **WUD** even better! 🚀
