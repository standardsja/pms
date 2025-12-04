/**
 * Environment Configuration
 * Production-ready environment variable handling with validation
 */
import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file
dotenvConfig();

export interface LDAPConfig {
    url: string;
    bindDN: string;
    bindPassword: string;
    searchDN: string;
}

export interface EnvironmentConfig {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: number;
    DATABASE_URL: string;
    JWT_SECRET: string;
    REDIS_URL?: string;
    UPLOAD_DIR: string;
    MAX_FILE_SIZE: number;
    CORS_ORIGIN?: string;
    LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
    LDAP?: LDAPConfig;
}

function validateEnvironment(): EnvironmentConfig {
    const env = process.env;

    // Validate required variables
    const requiredVars = ['DATABASE_URL'];
    const missing = requiredVars.filter((key) => !env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate JWT secret in production
    if (env.NODE_ENV === 'production' && (!env.JWT_SECRET || env.JWT_SECRET === 'devsecret-change-me')) {
        throw new Error('JWT_SECRET must be set to a secure value in production');
    }

    // Optional LDAP configuration
    const ldapConfig: LDAPConfig | undefined = env.LDAP_URL
        ? {
              url: env.LDAP_URL,
              bindDN: env.LDAP_BIND_DN || '',
              bindPassword: env.LDAP_BIND_PASSWORD || '',
              searchDN: env.LDAP_SEARCH_DN || '',
          }
        : undefined;

    // Validate LDAP config if URL is provided
    if (ldapConfig && (!ldapConfig.bindDN || !ldapConfig.bindPassword || !ldapConfig.searchDN)) {
        throw new Error('LDAP_URL is set, but LDAP_BIND_DN, LDAP_BIND_PASSWORD, or LDAP_SEARCH_DN is missing');
    }

    return {
        NODE_ENV: (env.NODE_ENV as any) || 'development',
        PORT: parseInt(env.PORT || '4000', 10),
        DATABASE_URL: env.DATABASE_URL!,
        JWT_SECRET: env.JWT_SECRET || 'devsecret-change-me',
        REDIS_URL: env.REDIS_URL,
        UPLOAD_DIR: env.UPLOAD_DIR || './uploads',
        MAX_FILE_SIZE: parseInt(env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
        CORS_ORIGIN: env.CORS_ORIGIN,
        LOG_LEVEL: (env.LOG_LEVEL as any) || 'info',
        LDAP: ldapConfig,
    };
}

export const config = validateEnvironment();
