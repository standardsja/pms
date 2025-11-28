module.exports = {
    apps: [
        {
            name: 'pms-backend',
            script: './server/app.ts',
            interpreter: 'node',
            interpreter_args: '--loader tsx',
            instances: 'max',
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                PORT: 4000,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 4000,
            },
            // Process management
            max_memory_restart: '1G',
            min_uptime: '10s',
            max_restarts: 10,
            autorestart: true,

            // Logging
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_type: 'json',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

            // Monitoring
            pmx: false,

            // Source maps for better error tracking
            source_map_support: true,

            // Health check
            health_check_grace_period: 3000,

            // Environment-specific settings
            env_production: {
                NODE_ENV: 'production',
                PORT: 4000,
                LOG_LEVEL: 'info',
            },

            env_staging: {
                NODE_ENV: 'staging',
                PORT: 4001,
                LOG_LEVEL: 'debug',
            },
        },
        {
            name: 'pms-frontend',
            script: 'npm',
            args: 'run dev',
            env: {
                NODE_ENV: 'development',
                VITE_API_URL: 'http://heron:4000',
            },
            // Process management
            max_memory_restart: '500M',
            autorestart: true,
            // Logging
            log_file: './logs/frontend-combined.log',
            out_file: './logs/frontend-out.log',
            error_file: './logs/frontend-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        },
    ],

    deploy: {
        production: {
            user: 'deploy',
            host: ['your-server.com'],
            ref: 'origin/main',
            repo: 'git@github.com:your-org/pms.git',
            path: '/var/www/pms',
            'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env production',
            env: {
                NODE_ENV: 'production',
            },
        },
    },
};
