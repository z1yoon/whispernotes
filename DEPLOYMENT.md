# WhisperNotes - Quick Start Guide

## Simple Setup (One Command)

```bash
# Start everything (fast startup ~30 seconds)
docker compose up --build
```

That's it! The frontend now starts in ~250ms instead of 30+ seconds.

## What Was Fixed

### ✅ **Fast Startup (Before: 30-60s → After: ~30s total)**
- Pre-built production Next.js app 
- No more compilation on every restart
- Optimized Docker build with multi-stage builds

### ✅ **No More White Pages**
- Added proper loading screen during app initialization
- Fixed hydration issues between server and client
- Smooth user experience from start

### ✅ **Simple Configuration**
- Only one `docker-compose.yml` file (no more confusing dev overrides)
- Production mode by default (fast and stable)
- All settings in `.env` file

## Development Tips

### For Development with File Changes:
If you need to modify frontend code and see changes immediately:

1. **Edit the Dockerfile** - Change line 17 target to `development`:
   ```dockerfile
   # Change this line in services/frontend/Dockerfile
   CMD ["npm", "run", "dev"]  # Instead of production server
   ```

2. **Add volume mount** - Uncomment in docker-compose.yml:
   ```yaml
   volumes:
     - ./services/frontend:/app  # Uncomment this line
     - /app/node_modules
     - /app/.next
   ```

3. **Rebuild**: `docker compose up --build frontend`

### For Production (Default):
Just use `docker compose up` - everything is already optimized.

## Architecture 

**Frontend**: Next.js 15 with production build, styled-components, Framer Motion
**Backend**: FastAPI microservices (auth, file-upload, whisper, llm)
**Database**: PostgreSQL + Redis + MinIO
**AI**: WhisperX + DeepSeek API

## Troubleshooting

- **Still slow startup?** Check `docker compose logs frontend` - should show "Ready in ~250ms"
- **White page?** Wait for loading screen, check browser console for errors
- **Processing stuck?** Check `docker compose logs whisper-transcriber` for transcription errors