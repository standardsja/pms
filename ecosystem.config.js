module.exports = {
    apps: [
        {
            name: 'pms-backend',
            script: 'npm',
            args: 'run server:dev',
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
            autorestart: true,

            // Logging
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

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
            script: './serve-frontend.mjs',
            env: {
                NODE_ENV: 'production',
                PORT: 5173,
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
