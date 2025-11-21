# Celiador Unified Service

A combined API and job processing service that eliminates the need for Redis/BullMQ by processing jobs inline.

## Features

- **Combined Architecture**: API server + job processor in one service
- **No Redis Required**: Simple in-memory job queue
- **Railway Compatible**: Single service deployment
- **Job Processing**: Handles SCAFFOLD and CODEGEN jobs
- **Supabase Integration**: Database operations and authentication

## Environment Variables

**Required for Railway deployment:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database operations
- `NEXT_PUBLIC_SUPABASE_URL` - Public Supabase URL (same as SUPABASE_URL)
- `NODE_ENV=production` - Set environment mode

**Optional:**
- `PORT` - Server port (defaults to 8080)
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude integration

## Endpoints

### Health
- `GET /` - Service status with job queue info
- `GET /health` - Simple health check
- `GET /healthz` - Kubernetes-style health check

### API
- `GET /api/status` - API status and features
- `GET /projects` - List user projects (authenticated)
- `POST /projects` - Create project with auto-scaffold (authenticated)
- `GET /projects/:id` - Get project details (authenticated)
- `DELETE /projects/:id` - Delete project (authenticated)
- `POST /projects/:id/jobs` - Create job (authenticated)

## Job Processing

Jobs are processed in-memory with a simple queue:
- **SCAFFOLD**: Initialize project with template
- **CODEGEN**: AI-powered code generation
- Jobs update status in database: PENDING → RUNNING → COMPLETED/FAILED

## Development

```bash
npm install
npm run dev    # Development with tsx
npm run build  # TypeScript compilation
npm start      # Production server
```

## Deployment

This service is designed for Railway deployment via git subtree from the parent monorepo.