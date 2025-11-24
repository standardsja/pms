/**
 * Production Logger
 * Structured logging with appropriate levels for production
 */
import { config } from './environment';

export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
}

const logLevelMap: Record<string, LogLevel> = {
    error: LogLevel.ERROR,
    warn: LogLevel.WARN,
    info: LogLevel.INFO,
    debug: LogLevel.DEBUG,
};

class Logger {
    private currentLevel: LogLevel;

    constructor() {
        this.currentLevel = logLevelMap[config.LOG_LEVEL] ?? LogLevel.INFO;
    }

    private log(level: LogLevel, message: string, ...args: any[]) {
        if (level <= this.currentLevel) {
            const timestamp = new Date().toISOString();
            const levelName = Object.keys(logLevelMap)[level] || 'INFO';

            if (config.NODE_ENV === 'production') {
                // Structured JSON logging for production
                console.log(
                    JSON.stringify({
                        timestamp,
                        level: levelName,
                        message,
                        data: args.length > 0 ? args : undefined,
                    })
                );
            } else {
                // Human-readable logging for development
                console.log(`[${timestamp}] ${levelName}: ${message}`, ...args);
            }
        }
    }

    error(message: string, ...args: any[]) {
        this.log(LogLevel.ERROR, message, ...args);
    }

    warn(message: string, ...args: any[]) {
        this.log(LogLevel.WARN, message, ...args);
    }

    info(message: string, ...args: any[]) {
        this.log(LogLevel.INFO, message, ...args);
    }

    debug(message: string, ...args: any[]) {
        this.log(LogLevel.DEBUG, message, ...args);
    }
}

export const logger = new Logger();
