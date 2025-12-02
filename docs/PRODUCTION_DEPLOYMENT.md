# Production Deployment Guide

## Prerequisites

### System Requirements

-   Node.js 18+ LTS
-   MySQL 8.0+
-   Redis 6.0+ (recommended for caching)
-   PM2 or similar process manager
-   Nginx (for reverse proxy)
-   SSL certificate

### Environment Setup

1. Copy `.env.production.template` to `.env.production`
2. Update all values with production settings
3. Ensure database is created and accessible
4. Set up Redis instance (optional but recommended)

## Database Setup

```bash
# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npx prisma db seed
```

## Build and Deploy

### 1. Build the Application

```bash
# Install dependencies
npm ci --production=false

# Build frontend
npm run build

# Build server (if using TypeScript compilation)
npm run build:server
```

### 2. Start with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

### 3. Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Serve static files
    location / {
        root /path/to/your/app/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Upload files
    location /uploads/ {
        root /path/to/your/app;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Monitoring

### Health Check

The application exposes a health check endpoint at `/health`:

```bash
curl https://your-domain.com/health
```

### PM2 Monitoring

```bash
# View logs
pm2 logs

# Monitor processes
pm2 monit

# Restart application
pm2 restart all

# Reload without downtime
pm2 reload all
```

### Database Monitoring

-   Monitor connection pool usage
-   Set up slow query logging
-   Regular backup schedule
-   Monitor disk usage

## Security Checklist

### Application Security

-   [ ] Strong JWT secret set
-   [ ] CORS properly configured
-   [ ] Rate limiting enabled
-   [ ] Input validation in place
-   [ ] File upload restrictions
-   [ ] SQL injection protection (Prisma)
-   [ ] XSS protection enabled

### Infrastructure Security

-   [ ] SSL/TLS certificate installed
-   [ ] Firewall configured
-   [ ] Database access restricted
-   [ ] Redis access secured
-   [ ] Regular security updates
-   [ ] Backup encryption
-   [ ] Log monitoring

## Performance Optimization

### Caching

-   Enable Redis for application cache
-   Configure CDN for static assets
-   Browser caching headers set

### Database

-   Proper indexing on query columns
-   Connection pooling configured
-   Query optimization

### Application

-   Gzip compression enabled
-   Asset minification
-   Lazy loading implemented
-   Bundle size optimization

## Backup Strategy

### Database Backup

```bash
# Daily automated backup
mysqldump -u username -p database_name > backup_$(date +%Y%m%d).sql
```

### File Backup

```bash
# Backup uploads directory
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Check DATABASE_URL and network connectivity
2. **High Memory Usage**: Monitor and tune Node.js memory settings
3. **Slow Performance**: Check database queries and enable caching
4. **File Upload Issues**: Verify UPLOAD_DIR permissions and disk space

### Log Locations

-   Application logs: PM2 logs directory
-   Nginx logs: `/var/log/nginx/`
-   System logs: `/var/log/syslog`

### Support

For production support, contact the development team with:

-   Error logs
-   System configuration
-   Performance metrics
-   Steps to reproduce issues
