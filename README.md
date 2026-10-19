# [repoexplorer](https://github.com/UC-USPO-Nework/repoexplorer.git) fork by [Open Source with SLU](https://oss-slu.github.io)
## Open Source Repository Browser
- Building a modern web architecture around the work originally done by the [UC OSPO Network](https://ucospo.net)
- Read UC OSPO's [original about.md file](docs/about.md)

# Tech stack:
**Typescript used throughout**
- ## Frontend
    ### */app*
    - React
    - Vite
    - Nginx
- ## Backend
    ### */api*
    - NodeJS
    - Express
- ## Data collection
    ### */find*
    - [repofinder](https://github.com/UC-OSPO-Network/repofinder) rebuild with Typescript, Postgres, & local LLMs under development

## Project installation/setup
### 1. Download and install [Docker Desktop](https://www.docker.com/get-started/)
### 2. Clone the repository & open project locally
`git clone https://github.com/oss-slu/repoexplorer.git`<br>`cd repoexplorer`
### 3. Create local database credentials
Run `./scripts/setup-env` once to create a private `.env` file with separate PostgreSQL administrator and application credentials. See the [database setup guide](docs/dev/database.md) for configuration and operations.
### 4. Run project with Docker compose
The frontend can be served by nginx via the *app* container (production behavior) or with vite's dev server for developers to take advantage of hot reloading.
- #### Use docker frontend:
    - Start frontend and backend containers:<br>`docker compose up --build -d`
    - ***Frontend should now be accessible in your browser via Nginx at http://localhost:8087***

- #### Run frontend via vite development server:
    - First, ensure [Node JS](https://nodejs.org/en) is installed<br>
    - Run backend container:<br>`docker compose up api --build -d`
    - Run vite dev server:<br>`cd app && npm ci && npm run dev`<br>
    - ***Frontend should now be accessible in your browser via Vite at http://localhost:6284***

### 5. Optionally, download the UC OSPO Network Parquet file locally:
- See instructions in [dev scripts file](docs/dev/setup_scripts.md)

# API Routes
See the [API Route Reference](docs/dev/api_routes.md) for information on every endpoint, parameter, response, etc.

# SBOMs
See the [SBOM guide](docs/dev/sbom.md) for where to download the backend and frontend SBOMs and how to verify them.
