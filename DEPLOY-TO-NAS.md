# Deploy Parkinson's Pal Backend to UGREEN NAS

## Prerequisites

- UGREEN NAS with Docker installed
- NAS IP address (e.g., 192.168.0.1 or 192.168.1.x)
- SSH or File Manager access to NAS
- Frontend files accessible via web browser

## Step 1: Upload Backend Files to NAS

### Option A: Using NAS File Manager

1. Open your NAS web interface
2. Navigate to File Manager
3. Create a new folder: `/docker/parkinsons-pal`
4. Upload the entire `backend` folder contents to this location

### Option B: Using SSH/SFTP
```bash
# If your NAS supports SSH, use SCP to copy files
scp -r backend/ your-nas-user@192.168.0.48:/volume1/docker/parkinsons-pal/
```

## Step 2: Prepare Docker Compose

The `backend/docker-compose.yml` file is already configured. Make sure it contains:

```yaml
version: '3.8'

services:
  parkinsons-api:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
```

## Step 3: Deploy on NAS

### Using UGREEN NAS Docker UI

1. Open NAS web interface → Docker
2. Click "Add" → "Create with Docker Compose"
3. Navigate to `/docker/parkinsons-pal`
4. Select `docker-compose.yml`
5. Click "Create" and wait for deployment

### Using Command Line (if SSH enabled)
```bash
# SSH into your NAS
ssh your-nas-user@192.168.0.48

# Navigate to the backend folder
cd /volume1/docker/parkinsons-pal

# Start the containers
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs
```

## Step 4: Configure Firewall (if needed)

Make sure port 3000 is open on your NAS:

1. NAS Settings → Security → Firewall
2. Add rule: Allow TCP port 3000
3. Apply changes

## Step 5: Update Frontend Configuration

Once the backend is running on your NAS, update the frontend to point to it:

**File: `api-client.js`**

Change this line:
```javascript
const API_BASE_URL = 'http://localhost:3000/api';
```

To your NAS IP:
```javascript
const API_BASE_URL = 'http://192.168.0.48:3000/api';
```

## Step 6: Test the Connection

1. Open your frontend in a browser
2. Try logging in
3. Check browser console (F12) for any connection errors
4. If you see CORS errors, the backend needs CORS configuration

## Troubleshooting

### Can't connect to backend

- Verify NAS IP address is correct
- Check if port 3000 is accessible: `http://your-nas-ip:3000/api/health`
- Check NAS firewall settings
- Check Docker container is running

### CORS errors

The backend already has CORS enabled in `server.js`. If you still see errors:

1. Check the CORS configuration in `backend/server.js`
2. Make sure your frontend URL is allowed

### Database issues

- The database file is in `backend/data/parkinsons.db`
- Make sure the volume mount is correct in docker-compose.yml
- Check container logs: `docker-compose logs`

## Important Notes

1. **Backup your data**: Before deploying, backup `backend/data/parkinsons.db`
2. **Network access**: The NAS needs to be accessible from devices running the frontend
3. **HTTPS**: For production, consider setting up HTTPS with a reverse proxy
4. **Updates**: To update the backend:

   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

## What's Your NAS IP Address?

Please provide your NAS IP address so I can update the frontend configuration for you!
