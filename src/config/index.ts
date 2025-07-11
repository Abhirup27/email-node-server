import dotenv from 'dotenv';
import path from 'path';

const NODE_ENV = process.env.NODE_ENV || 'development';

// Load environment files
const envFiles = [
    `.env.${NODE_ENV}.local`,
    `.env.${NODE_ENV}`,
    '.env'
];

if(NODE_ENV !== 'production') {
    envFiles.forEach(file => {
        dotenv.config({path: path.resolve(process.cwd(), file)});
    });
}

type LogLevel = 'debug' | 'error' | 'warn' | 'log' | 'info';

interface Config {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: number;
    RATE_LIMITING_WINDOW: number;
    JWT_SECRET: string;
    LOGGING: boolean;
    LOG_TO_FILE: boolean;
    LOG_LEVELS: LogLevel[];
    REDIS_HOST: string;
    REDIS_PORT: number;
}

// Default values
const DEFAULT_CONFIG = {
    PORT: 3000,
    RATE_LIMITING_WINDOW: 60,
    LOGGING: false,
    LOG_TO_FILE: false,
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
} as const;

// Valid log levels
const VALID_LOG_LEVELS: LogLevel[] = ['debug', 'error', 'warn', 'log', 'info'];

// Parse and validate configuration
const parseConfig = (): Config => {
    const env = process.env;
    const errors: string[] = [];

    // Validate NODE_ENV
    if (!env.NODE_ENV) {
        env.NODE_ENV = 'development';
    } else if (!['development', 'production', 'test'].includes(env.NODE_ENV)) {
        errors.push(`NODE_ENV: Invalid environment '${env.NODE_ENV}'. Must be one of: development, production, test`);
    }



    let port: number = DEFAULT_CONFIG.PORT;
    if (env.PORT) {
        port = parseInt(env.PORT);
        if (isNaN(port)) {
            errors.push(`PORT: '${env.PORT}' is not a valid number`);
        }
    }

    // Parse rate limiting window
    let rateLimitingWindow:number = DEFAULT_CONFIG.RATE_LIMITING_WINDOW;
    if (env.RATE_LIMITING_WINDOW) {
        rateLimitingWindow = parseInt(env.RATE_LIMITING_WINDOW);
        if (isNaN(rateLimitingWindow)) {
            errors.push(`RATE_LIMITING_WINDOW: '${env.RATE_LIMITING_WINDOW}' is not a valid number`);
        }
    }

    // Parse logging flags
    const logging = env.LOGGING ? env.LOGGING === 'true' : DEFAULT_CONFIG.LOGGING;
    const logToFile = env.LOG_TO_FILE ? env.LOG_TO_FILE === 'true' : DEFAULT_CONFIG.LOG_TO_FILE;

    // Parse log levels
    let logLevels: LogLevel[] = [];
    if (env.LOG_LEVELS) {
        const levels = env.LOG_LEVELS.split(',');
        for (const level of levels) {
            if (!VALID_LOG_LEVELS.includes(level as LogLevel)) {
                errors.push(`LOG_LEVELS: '${level}' is not a valid log level. Valid options: ${VALID_LOG_LEVELS.join(', ')}`);
            } else {
                logLevels.push(level as LogLevel);
            }
        }
    }

    let redisPort: number = DEFAULT_CONFIG.REDIS_PORT;
    if (env.REDIS_PORT) {
        redisPort = parseInt(env.REDIS_PORT);
        if (isNaN(redisPort)) {
            errors.push(`REDIS_PORT: '${env.REDIS_PORT}' is not a valid number`);
        }
    }

    if (errors.length > 0) {
        console.error('❌ Invalid environment variables:');
        errors.forEach(err => console.error(`  - ${err}`));
        process.exit(1);
    }

    return {
        NODE_ENV: env.NODE_ENV as 'development' | 'production' | 'test',
        PORT: port,
        RATE_LIMITING_WINDOW: rateLimitingWindow,
        JWT_SECRET: env.JWT_SECRET!,
        LOGGING: logging,
        LOG_TO_FILE: logToFile,
        LOG_LEVELS: logLevels,
        REDIS_HOST: env.REDIS_HOST || DEFAULT_CONFIG.REDIS_HOST,
        REDIS_PORT: redisPort,
    };
};

const config = parseConfig();
export default config;