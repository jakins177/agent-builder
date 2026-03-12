# Agent Builder API Documentation (v1)

This document explains how AI agents and developers can interact with the Agent Builder programmatically using the REST API. This allows for autonomous agent creation, modification, and management.

## Authentication
All API requests require a Bearer token in the `Authorization` header.
- **Header:** `Authorization: Bearer <API_SECRET_KEY>`
- *Note: Ask the system administrator (Josh) for the current production or local secret key.*

## Base URL
- **Production:** `https://agentbuilder.palmtreesai.com/api/v1`
- **Local Dev:** `http://localhost:3000/api/v1` (Port may vary, e.g., 3005, 3007)

---

## 1. Providers (`/providers`)

**Get all LLM Providers:**
\`\`\`bash
curl -H "Authorization: Bearer <KEY>" https://agentbuilder.palmtreesai.com/api/v1/providers
\`\`\`
*Use this to find the `provider_id` needed for agent creation.*

---

## 2. Projects (`/projects`)

**Get all Projects:**
\`\`\`bash
curl -H "Authorization: Bearer <KEY>" https://agentbuilder.palmtreesai.com/api/v1/projects
\`\`\`

**Create a new Project:**
\`\`\`bash
curl -X POST https://agentbuilder.palmtreesai.com/api/v1/projects \
  -H "Authorization: Bearer <KEY>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My New Project", "description": "Project description"}'
\`\`\`

---

## 3. Agents (`/agents`)

### Create an Agent (POST)
To create an agent, you need a `project_id` and a `provider_id`.

\`\`\`bash
curl -X POST https://agentbuilder.palmtreesai.com/api/v1/agents \
  -H "Authorization: Bearer <KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "<PROJECT_UUID>",
    "provider_id": "<PROVIDER_UUID>",
    "name": "Lead Gen Bot",
    "system_prompt": "You are a helpful assistant...",
    "model": "gpt-4-turbo",
    "primary_color": "#1E3A8A"
  }'
\`\`\`

**Payload Schema:**
- `project_id` (String, Required) - UUID of the parent project.
- `provider_id` (String, Required) - UUID of the LLM provider.
- `name` (String, Required) - Display name of the agent.
- `system_prompt` (String, Required) - The core instruction set for the agent.
- `model` (String, Optional) - Model name (e.g., `gpt-3.5-turbo`, `gemini-2.5-flash`). Defaults to `gpt-3.5-turbo`.
- `primary_color` (String, Optional) - Hex color code. Defaults to `#2563EB`.
- `rate_limit_enabled` (Boolean, Optional) - Defaults to `true`.
- `is_active` (Boolean, Optional) - Defaults to `true`.

### Update an Agent (PUT)
\`\`\`bash
curl -X PUT https://agentbuilder.palmtreesai.com/api/v1/agents/<AGENT_ID> \
  -H "Authorization: Bearer <KEY>" \
  -H "Content-Type: application/json" \
  -d '{"system_prompt": "Updated prompt...", "primary_color": "#FF0000"}'
\`\`\`

### Delete an Agent (DELETE)
\`\`\`bash
curl -X DELETE https://agentbuilder.palmtreesai.com/api/v1/agents/<AGENT_ID> \
  -H "Authorization: Bearer <KEY>"
\`\`\`

---

## AI Agent Workflow (How an AI builds another AI)
1. **Fetch Provider:** GET `/providers` and parse JSON to extract the target `id`.
2. **Fetch/Create Project:** GET `/projects`. If the desired project doesn't exist, POST `/projects` to create it and extract the `id`.
3. **Build Payload:** Construct the JSON payload with `project_id`, `provider_id`, `name`, `system_prompt`, `model`, and `primary_color`.
4. **Deploy Agent:** POST `/agents` with the payload.
5. **Get Embed Link:** The new agent is immediately live at `/chat?agentId=<NEW_AGENT_ID>`.
