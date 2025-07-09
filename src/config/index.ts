import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';


const NODE_ENV = process.env.NODE_ENV || 'development';

const envFiles = [
    `.env.${NODE_ENV}.local`,
    `.env.${NODE_ENV}`,
    '.env'
];

envFiles.forEach(file => {

    dotenv.config({ path: path.resolve(process.cwd(), file) });
});
const validLogLevels = ['debug', 'error', 'warn', 'log', 'info'] as const;
// configuration schema
const ConfigSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number().default(3000),
    RATE_LIMITING_WINDOW: z.coerce.number().default(60),
    JWT_SECRET: z.string(),
    LOGGING: z.boolean().default(false),
    LOG_TO_FILE: z.coerce.boolean().default(false),
    LOG_LEVELS: z.string()
        .transform((val) => val.split(','))
        .pipe(z.array(z.enum(validLogLevels)))
});

// Validate and parse configuration
const parseConfig = () => {
    try {
        return ConfigSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('❌ Invalid environment variables:');
            error.errors.forEach(err => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
            process.exit(1);
        }
        throw error;
    }
};

// typed config object
const config = parseConfig();

export default config;