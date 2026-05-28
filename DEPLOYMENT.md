# Travel Itinerary Planner - Docker Deployment Guide

## Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Git (optional)

### 1. Clone and Setup
```bash
cd travel-itinerary-planner
```

### 2. Environment Configuration

The project includes two environment file options:

- `backend/.env` - For local development (non-Docker)
- `backend/.env.docker` - For Docker Compose (recommended for deployment)

**Important**: Update the values in `backend/.env.docker` before deploying:
- `GOOGLE_API_KEY`: Your actual Google AI API key
- `SECRET_KEY`: Generate a strong random secret key for JWT signing

### 3. Deploy with Docker Compose

From the project root directory:

```bash
# Build and start all services
docker-compose -f backend/docker-compose.yml up -d

# View logs
docker-compose -f backend/docker-compose.yml logs -f

# Stop services
docker-compose -f backend/docker-compose.yml down

# Stop and remove volumes (WARNING: deletes data)
docker-compose -f backend/docker-compose.yml down -v
```

### 4. Access Services

- **Backend API**: http://localhost:8000
  - API Docs (Swagger): http://localhost:8000/docs
  - Health Check: http://localhost:8000/health
- **Database**: MariaDB on port 3306
  - Host: localhost
  - Database: travel_app
  - User: travel_user
  - Password: your_secure_password (change in production)

## Architecture

### Services

1. **db** (MariaDB 11.4)
   - Persistent storage for user data, preferences, itineraries
   - Auto-initialized with schema from `backend/app/database/schema.sql`
   - Health-checked before backend starts

2. **backend** (FastAPI)
   - Python 3.11-slim based image
   - Exposes REST API on port 8000
   - Connects to MariaDB via Docker network
   - ChromaDB persisted in Docker volume

### Networking

All services connect to a custom bridge network `travel-network` for secure inter-service communication.

### Volumes

- `db_data`: Persistent MariaDB data
- `chroma_data`: Persistent ChromaDB vector store

## Environment Variables

### Database (MariaDB)
| Variable | Default | Description |
|----------|---------|-------------|
| MYSQL_ROOT_PASSWORD | rootpassword | Root user password |
| MYSQL_DATABASE | travel_app | Database name |
| MYSQL_USER | travel_user | Application user |
| MYSQL_PASSWORD | your_secure_password | Application user password |
| DB_PORT | 3306 | Host port mapping |

### Backend
| Variable | Default | Description |
|----------|---------|-------------|
| BACKEND_PORT | 8000 | Host port mapping |
| DB_HOST | db | Database hostname (Docker service name) |
| DB_PORT | 3306 | Database port |
| DB_NAME | travel_app | Database name |
| DB_USER | travel_user | Database user |
| DB_PASSWORD | your_secure_password | Database password |
| LLM_PROVIDER | google | LLM provider (google, openai, grok, liteapi, mock) |
| USE_MOCK_LLM | true | Use mock LLM for testing |
| GOOGLE_API_KEY | (see .env) | Google AI API key |
| GOOGLE_MODEL | gemini-2.5-flash | Gemini model |
| SECRET_KEY | (change in production) | JWT signing secret |
| CHROMA_PERSIST_DIR | /app/chroma_db | ChromaDB persistence directory |

## Production Considerations

### Security
1. **Change all default passwords** in `.env.docker`
2. **Generate strong SECRET_KEY**: Use `openssl rand -hex 32`
3. **Use HTTPS**: Set up reverse proxy (nginx/Traefik) with SSL
4. **Restrict database port**: Only expose if needed externally

### Performance
1. **Database**: Consider increasing buffer pool size in MariaDB config
2. **Backend**: Increase worker count in production (remove `--reload`)
3. **ChromaDB**: Ensure sufficient volume storage for embeddings

### Monitoring
- Check logs: `docker-compose logs -f [service]`
- Health endpoints: `GET /health` on backend
- Database: Connect to MariaDB and monitor query performance

### Backup Strategy

#### Database Backup
```bash
docker exec travel_db mysqldump -utravel_user -pyour_secure_password travel_app > backup.sql
```

#### ChromaDB Backup
```bash
docker run --rm -v travel-itinerary-planner_chroma_data:/data -v $(pwd):/backup alpine tar czf /backup/chroma_backup.tar.gz -C /data .
```

## Troubleshooting

### Backend can't connect to database
- Check if database is healthy: `docker-compose ps db`
- Verify network: `docker network inspect travel-itinerary-planner_travel-network`
- Check logs: `docker-compose logs db`

### ChromaDB errors
- Ensure `chroma_data` volume exists and has permissions
- Check backend logs for embedding model download issues

### Port conflicts
- Change ports in `.env.docker` (DB_PORT, BACKEND_PORT)
- Or modify docker-compose.yml port mappings

## Frontend Integration

Since the frontend is deployed separately, configure the frontend's environment to point to the backend API:

- Development: `VITE_API_URL=http://localhost:8000`
- Production: `VITE_API_URL=https://your-backend-domain.com`

Update CORS origins in `backend/app/config.py` if needed.

## Development vs Production

### Development (Current)
- Uses mock LLM by default (no API costs)
- Auto-reload enabled
- Verbose SQL logging

### Production
- Set `USE_MOCK_LLM=false` in `.env.docker`
- Disable reload in docker-compose command
- Use stronger passwords and secrets
- Consider adding nginx reverse proxy
- Set up CI/CD pipeline with multi-stage builds

## Updating Dependencies

### Backend
1. Update `backend/requirements.txt`
2. Rebuild: `docker-compose -f backend/docker-compose.yml build --no-cache backend`

### Database Schema Changes
1. Update `backend/app/database/schema.sql`
2. Recreate database: `docker-compose -f backend/docker-compose.yml down -v && docker-compose -f backend/docker-compose.yml up -d`

## Support

For issues or questions, check:
- Backend logs: `docker-compose logs backend`
- Database logs: `docker-compose logs db`
- API documentation: http://localhost:8000/docs when running