# PG Management System

A full-stack PG management application with separate frontend and backend projects.

## Project Structure

```text
pg/
├── nestpg-web/    # Frontend application
├── nestpg-api/    # Backend API
└── README.md
```

## Prerequisites

- Node.js and npm installed
- Environment variables configured for both applications

## Setup Instructions

### 1. Frontend Setup

Open a terminal and navigate to the frontend directory:

```bash
cd nestpg-web
```

Create a `.env` file in the `nestpg-web` directory and configure the required environment variables.

Install dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm run dev
```

### 2. Backend Setup

Open a **second terminal** and navigate to the backend directory:

```bash
cd nestpg-api
```

Create a `.env` file in the `nestpg-api` directory and configure the required environment variables.

Install dependencies:

```bash
npm install
```

Start the backend development server:

```bash
npm run dev
```

## Running the Application

Keep both terminals running simultaneously.

| Terminal | Directory | Command |
|---|---|---|
| Terminal 1 | `nestpg-web` | `npm run dev` |
| Terminal 2 | `nestpg-api` | `npm run dev` |

## Environment Configuration

- `nestpg-web/.env` — Frontend environment variables.
- `nestpg-api/.env` — Backend environment variables.

Refer to the project configuration or ask the project maintainer for the required environment variable names and values.

**Important:** Do not commit `.env` files or expose API keys, database credentials, or other secrets in version control.

