# Agent Builder MVP

A local Agent Builder application built with Next.js, Node.js, Express, and MySQL. Create and manage LLM agents with custom system prompts and test them in an in-browser chat interface.

## Features

- **Provider Management**: Add LLM providers (Google Gemini, OpenAI, Minimax) with encrypted API keys
- **Project Management**: Organize agents into projects
- **Agent Management**: Create agents with custom system prompts and select providers
- **Test Chat UI**: In-browser chat interface to test your agents

## Tech Stack

- **Frontend**: Next.js (React) with TypeScript and Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MySQL
- **Encryption**: AES-256-GCM for API key security

## Prerequisites

1. **Node.js**: v18 or higher
2. **MySQL**: MySQL 8.0 or higher (running locally)
3. **npm** or **yarn**

## Quick Start

### 1. Clone and Install Dependencies

```bash
cd /home/jakins1777/.openclaw/workspace/projects/agent-builder
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and update it with your settings:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your MySQL credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=agent_builder

# Encryption Key (change this for production!)
ENCRYPTION_KEY=your-secure-encryption-key-minimum-32-characters
```

### 3. Create the Database

Create an empty database in MySQL:

```bash
mysql -u root -p -e "CREATE DATABASE agent_builder;"
```

### 4. Run the Application

```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

### 5. Initialize the Database Schema

1. Open http://localhost:3000
2. Click "Run Database Setup" on the home page
3. You should see "Database setup completed successfully"

## Usage Guide

### Step 1: Add a Provider

1. Navigate to **Providers** in the navigation
2. Fill in the provider details:
   - Name: e.g., "My OpenAI Provider"
   - Type: Select OpenAI, Google Gemini, or Minimax
   - API Key: Enter your LLM API key (will be encrypted)
3. Click "Create Provider"

### Step 2: Create a Project

1. Navigate to **Projects**
2. Fill in the project details:
   - Name: e.g., "Customer Support Bot"
   - Description: Optional project description
3. Click "Create Project"

### Step 3: Create an Agent

1. Navigate to **Agents**
2. Fill in the agent details:
   - Name: e.g., "Support Bot v1"
   - Project: Select a project
   - Provider: Select a provider
   - Model: LLM model (default: gpt-3.5-turbo)
   - System Prompt: Define the agent's behavior
3. Click "Create Agent"

### Step 4: Test the Agent

1. Click on an agent in the list
2. Use the chat interface to send messages
3. The agent will respond using the configured LLM

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/setup` | GET | Initialize database schema |
| `/api/providers` | GET/POST | List/Create providers |
| `/api/projects` | GET/POST/DELETE | List/Create/Delete projects |
| `/api/agents` | GET/POST/DELETE | List/Create/Delete agents |
| `/api/chat` | GET/POST | Chat with an agent |

## Database Schema

### providers
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | Primary key (UUID) |
| name | VARCHAR(255) | Provider display name |
| provider_type | ENUM | google, openai, minimax |
| api_key_encrypted | TEXT | Encrypted API key |
| is_active | BOOLEAN | Provider status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

### projects
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | Primary key (UUID) |
| name | VARCHAR(255) | Project name |
| description | TEXT | Project description |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

### agents
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | Primary key (UUID) |
| project_id | VARCHAR(36) | Foreign key to projects |
| provider_id | VARCHAR(36) | Foreign key to providers |
| name | VARCHAR(255) | Agent name |
| system_prompt | TEXT | Agent instructions |
| model | VARCHAR(255) | LLM model name |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

## Security Notes

- API keys are encrypted using AES-256-GCM before storage
- The encryption key is stored in the environment variable `ENCRYPTION_KEY`
- **Important**: Change the `ENCRYPTION_KEY` value for production use
- The application runs locally and does not send data to external servers (except LLM API calls)

## Troubleshooting

### Database Connection Failed

1. Verify MySQL is running: `systemctl status mysql` (Linux) or check Services (Windows)
2. Check credentials in `.env.local`
3. Ensure the database exists: `CREATE DATABASE agent_builder;`

### Port 3000 Already in Use

Change the port by setting the `PORT` environment variable:
```bash
PORT=3001 npm run dev
```

### LLM API Errors

1. Verify your API key is correct in the provider settings
2. Check your LLM account has sufficient credits/usage
3. Ensure the model name is correct for your provider

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

## License

MIT License
