# 🚀 Production Deployment Checklist

## Pre-Deployment Verification

### ✅ Code Quality

-   [ ] All TypeScript errors resolved
-   [ ] ESLint warnings addressed
-   [ ] Production build successful
-   [ ] Tests passing (unit, integration, e2e)
-   [ ] Code review completed
-   [ ] Security audit passed

### ✅ Configuration

-   [ ] Environment variables configured (`.env.production`)
-   [ ] Database connection string verified
-   [ ] JWT secrets generated and secured
-   [ ] CORS origins properly set
-   [ ] File upload limits configured
-   [ ] Rate limiting rules defined

### ✅ Database

-   [ ] Production database created
-   [ ] Migrations applied (`npm run db:migrate`)
-   [ ] Seed data loaded if needed
-   [ ] Database backups configured
-   [ ] Connection pool settings optimized
-   [ ] Database monitoring enabled

### ✅ Infrastructure

-   [ ] Server provisioned (minimum 2GB RAM, 2 CPUs)
-   [ ] Node.js 18+ LTS installed
-   [ ] PM2 globally installed
-   [ ] Nginx configured and tested
-   [ ] SSL certificates installed
-   [ ] Firewall rules configured
-   [ ] Redis server setup (if using cache)

### ✅ Security

-   [ ] HTTPS enforced
-   [ ] Security headers configured
-   [ ] Input validation tested
-   [ ] Authentication flows verified
-   [ ] File upload restrictions tested
-   [ ] SQL injection prevention verified
-   [ ] XSS protection enabled

## Deployment Steps

### 1. Pre-deployment

```bash
# Create deployment user
sudo useradd -m -s /bin/bash pms
sudo usermod -aG sudo pms

# Setup directories
sudo mkdir -p /opt/pms
sudo chown pms:pms /opt/pms

# Install dependencies
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### 2. Application Deployment

```bash
# Clone repository
cd /opt/pms
git clone https://github.com/standardsja/pms.git .

# Install dependencies
npm ci --production

# Build application
npm run build
npm run build:server

# Setup environment
cp .env.production.template .env.production
nano .env.production  # Configure variables

# Database migration
npm run db:migrate:prod

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 3. Nginx Configuration

```bash
# Install Nginx
sudo apt-get install nginx

# Configure site
sudo nano /etc/nginx/sites-available/pms
sudo ln -s /etc/nginx/sites-available/pms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL Certificate

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

## Post-Deployment Verification

### ✅ Application Health

-   [ ] Application starts without errors
-   [ ] All endpoints respond correctly
-   [ ] Database connectivity verified
-   [ ] Authentication working
-   [ ] File uploads functional
-   [ ] WebSocket connections working

### ✅ Performance

-   [ ] Page load times < 3 seconds
-   [ ] API response times < 500ms
-   [ ] Database queries optimized
-   [ ] Memory usage < 80%
-   [ ] CPU usage reasonable
-   [ ] Cache hit rates > 80%

### ✅ Security

-   [ ] HTTPS redirect working
-   [ ] Security headers present
-   [ ] File upload restrictions enforced
-   [ ] Rate limiting functional
-   [ ] CORS properly configured
-   [ ] No sensitive data exposed

### ✅ Monitoring

-   [ ] Application logs captured
-   [ ] Error tracking configured
-   [ ] Performance monitoring active
-   [ ] Uptime monitoring setup
-   [ ] Backup scripts scheduled
-   [ ] Alerts configured

## Rollback Plan

### Quick Rollback

```bash
# Stop current application
pm2 stop all

# Restore from backup
cp -r /opt/pms-backup/* /opt/pms/

# Restart application
pm2 start ecosystem.config.js --env production
```

### Database Rollback

```bash
# Restore database from backup
mysql -u root -p pms < backup_YYYYMMDD.sql

# Run any necessary migrations
npm run db:migrate:prod
```

## Monitoring Commands

### Application Status

```bash
# PM2 status
pm2 status
pm2 logs
pm2 monit

# System resources
htop
df -h
free -h

# Nginx status
sudo systemctl status nginx
sudo nginx -t
```

### Database Status

```bash
# MySQL status
sudo systemctl status mysql

# Connection count
mysql -e "SHOW PROCESSLIST;"

# Database size
mysql -e "SELECT table_schema AS 'Database',
ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables WHERE table_schema = 'pms';"
```

## Maintenance Tasks

### Daily

-   [ ] Check application logs
-   [ ] Monitor error rates
-   [ ] Verify backup completion
-   [ ] Check disk space

### Weekly

-   [ ] Review performance metrics
-   [ ] Update dependencies (if needed)
-   [ ] Clean old log files
-   [ ] Verify SSL certificate status

### Monthly

-   [ ] Security updates
-   [ ] Database optimization
-   [ ] Performance tuning
-   [ ] Backup testing

## Emergency Contacts

-   **System Administrator**: [admin@bsj.gov.jm]
-   **Developer Team**: [dev@bsj.gov.jm]
-   **Infrastructure Team**: [infrastructure@bsj.gov.jm]
-   **Emergency Phone**: +1 (876) 926-3140

## Common Issues & Solutions

### Application Won't Start

1. Check logs: `pm2 logs`
2. Verify environment variables
3. Check database connectivity
4. Restart PM2: `pm2 restart all`

### Database Connection Issues

1. Check MySQL status: `sudo systemctl status mysql`
2. Verify connection string in .env
3. Check network connectivity
4. Review database logs

### High Memory Usage

1. Check PM2 processes: `pm2 monit`
2. Restart application: `pm2 restart all`
3. Check for memory leaks in logs
4. Consider scaling horizontally

### SSL Certificate Issues

1. Check certificate status: `sudo certbot certificates`
2. Renew if needed: `sudo certbot renew`
3. Restart Nginx: `sudo systemctl restart nginx`

---

**Remember**: Always test deployment procedures in a staging environment first!
