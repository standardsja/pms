// module.exports = {
//     apps: [
//         {
//             name: 'pms-backend',
//             script: 'npm',
//             args: 'run server:dev',
//             env: {
//                 NODE_ENV: 'development',
//                 PORT: 4000,
//             },
//             env_production: {
//                 NODE_ENV: 'production',
//                 PORT: 4000,
//             },
//             // Process management
//             max_memory_restart: '1G',
//             autorestart: true,

//             // Logging
//             log_file: './logs/combined.log',
//             out_file: './logs/out.log',
//             error_file: './logs/error.log',
//             log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

//             // Environment-specific settings
//             env_production: {
//                 NODE_ENV: 'production',
//                 PORT: 4000,
//                 LOG_LEVEL: 'info',
//             },

//             env_staging: {
//                 NODE_ENV: 'staging',
//                 PORT: 4001,
//                 LOG_LEVEL: 'debug',
//             },
//         },
//         {
//             name: 'pms-frontend',
//             script: 'npm',
//             args: 'run dev',
//             env: {
//                 NODE_ENV: 'development',
//                 PORT: 5173,
//             },
//             // Process management
//             max_memory_restart: '500M',
//             autorestart: true,
//             // Logging
//             log_file: './logs/frontend-combined.log',
//             out_file: './logs/frontend-out.log',
//             error_file: './logs/frontend-error.log',
//             log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
//         },
//     ],

//     deploy: {
//         heron: {
//             user: 'ict_admin',
//             host: 'heron',
//             ref: 'origin/Kymarley',
//             repo: 'git@github.com:standardsja/pms.git',
//             path: '/var/www/pms',
//             'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
//             env: {
//                 NODE_ENV: 'production',
//             },
//         },
//     },
// };

module.exports = {
    apps: [
        {
            name: 'pms-backend',
            // Run the compiled server output directly. This avoids wrapping via `npm run` and
            // gives PM2 direct control of the node process. Ensure you run `npm run server:build`
            // before starting PM2 so `dist/server/index.js` exists.
            script: 'dist/server/index.js',
            // Explicitly use node as the interpreter; PM2 will pass NODE_OPTIONS and env vars.
            interpreter: 'node',
            env: {
                NODE_ENV: 'development',
                PORT: 4000,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 4000,
                LOG_LEVEL: 'info',
                // NOTE: Do NOT hardcode DATABASE credentials in source. Set `DATABASE_URL`
                // in the deployment environment (e.g., pm2 ecosystem env, or CI/CD secrets).
                // DATABASE_URL: 'mysql://user:password@host:3306/database'
            },
            max_memory_restart: '1G',
            autorestart: true,
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        },
    ],
};
