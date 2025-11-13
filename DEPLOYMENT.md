# Deployment Guide for Heron Server

## Prerequisites
- Node.js 18+ installed on Heron
- Access to Stork database server
- PM2 for process management (recommended)

## Deployment Steps

### 1. Copy Files to Heron Server
```bash
# From your local machine
scp -r /path/to/pms user@heron:/path/to/deployment/
```

### 2. Setup Environment Variables
```bash
# On Heron server
cd /path/to/deployment/pms

# Copy production environment file
cp .env.production .env

# Update .env with actual values
nano .env
# Change:
# - CORS_ORIGIN to match frontend URL (e.g., http://heron:5173 or http://heron.domain.com)
# - VITE_API_URL to match backend URL (e.g., http://heron:4000 or http://heron.domain.com/api)
# - JWT_SECRET to a strong random string for production
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Build Frontend
```bash
npm run build
# This creates the optimized production build in the dist/ folder
```

### 5. Setup Database
```bash
# Run Prisma migrations (if needed)
cd server
npx prisma migrate deploy
npx prisma generate
cd ..
```

### 6. Start Services

#### Option A: Using PM2 (Recommended for Production)
```bash
# Install PM2 globally
npm install -g pm2

# Start backend
pm2 start npm --name "pms-backend" -- run server:dev

# Serve frontend with a static server
npm install -g serve
pm2 start "serve -s dist -l 5173" --name "pms-frontend"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions shown by the command above

# Monitor processes
pm2 monit
```

#### Option B: Manual Start (Development/Testing)
```bash
# Start backend (in one terminal)
npm run server:dev

# Start frontend (in another terminal)
npm run dev
```

### 7. Verify Deployment
```bash
# Test backend API
curl http://heron:4000/api/ideas

# Test frontend
curl http://heron:5173

# From a browser
# Navigate to: http://heron:5173
```

## Production Nginx Setup (Optional but Recommended)

For better performance and security, use Nginx as a reverse proxy:

### Install Nginx
```bash
sudo apt update
sudo apt install nginx
```

### Configure Nginx
Create file `/etc/nginx/sites-available/pms`:
```nginx
server {
    listen 80;
    server_name heron;

    # Serve frontend static files
    location / {
        root /path/to/deployment/pms/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /auth/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /admin/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /requests {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Serve uploaded files
    location /uploads/ {
        alias /path/to/deployment/pms/uploads/;
    }
}
```

### Enable and Start Nginx
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/pms /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Enable on boot
sudo systemctl enable nginx
```

With Nginx, you only need to run the backend with PM2:
```bash
pm2 start npm --name "pms-backend" -- run server:dev
pm2 save
```

## Environment-Specific Configuration

### Local Development
- `.env`: Uses localhost URLs
- Backend: http://localhost:4000
- Frontend: http://localhost:5173

### Heron Server
- `.env`: Uses heron URLs
- Update CORS_ORIGIN=http://heron or http://heron:5173
- Update VITE_API_URL=http://heron:4000 or http://heron

## Troubleshooting

### Frontend can't connect to backend
- Check CORS_ORIGIN in backend .env matches frontend URL
- Verify backend is running: `curl http://localhost:4000/api/ideas`
- Check PM2 logs: `pm2 logs pms-backend`

### Database connection fails
- Verify Stork server is accessible from Heron
- Test connection: `mysql -h Stork -u database_admin -p db_spinx`
- Check DATABASE_URL in .env

### Port already in use
- Check processes: `lsof -i :4000` or `lsof -i :5173`
- Kill process: `kill -9 <PID>`
- Or change PORT in .env

## Updating the Application

```bash
# Pull latest changes
git pull origin Kyle

# Install any new dependencies
npm install

# Rebuild frontend
npm run build

# Restart services
pm2 restart all

# Or if using Nginx (only restart backend)
pm2 restart pms-backend
```

## Monitoring and Logs

```bash
# View all PM2 processes
pm2 list

# View logs
pm2 logs pms-backend
pm2 logs pms-frontend

# Monitor resources
pm2 monit

# Restart a process
pm2 restart pms-backend
```
