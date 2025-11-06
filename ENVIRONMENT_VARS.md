# Environment Variables for Production Deployment

## Required Environment Variables

### Supabase Configuration
```
SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Server Configuration
```
NODE_ENV=production
PORT=8080  # Railway will set this automatically
```

### WebSocket Configuration
- **Development**: WebSocket runs on separate port 8081
- **Production**: WebSocket shares the same port as HTTP server (automatically configured)

### Optional Services
```
# AI Services
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Deployment Services
VERCEL_API_TOKEN=your-vercel-token
VERCEL_TEAM_ID=your-team-id
```

## WebSocket Deployment Notes

### Development Mode
- WebSocket runs on port 8081 (WS_PORT)
- Frontend connects to `ws://localhost:8081`

### Production Mode
- WebSocket shares HTTP server port (Railway assigns this)
- Frontend auto-detects and connects to `wss://your-domain.com`
- SSL termination handled by Railway

## Railway Deployment
1. WebSocket service automatically attaches to HTTP server in production
2. No additional port configuration needed
3. SSL/WSS handled automatically by Railway's infrastructure