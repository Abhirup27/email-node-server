import * as fs from 'fs';
import * as path from 'path';
import config from "../config";

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
};

const levelColors: Record<string, string> = {
    LOG: colors.green,
    DEBUG: colors.blue,
    WARN: colors.yellow,
    ERROR: colors.red,
    FATAL: colors.magenta,
};

type LogLevel = 'LOG' | 'DEBUG' | 'WARN' | 'ERROR' | 'FATAL';
type ContextType = string | undefined;

export class CustomLogger {
    private readonly isLoggingEnabled: boolean;
    private readonly enabledLevels: Set<string>;
    private readonly logToFile: boolean;
    private logStream: fs.WriteStream | null = null;

    constructor() {
        this.isLoggingEnabled = config.LOGGING || false;
        this.enabledLevels = new Set(config.LOG_LEVELS.map(level => level.toLowerCase())  );

        this.logToFile = config.LOG_TO_FILE;

        if (this.logToFile) {
            this.initializeLogFile();
        }

        // Handle graceful shutdown
        process.on('beforeExit', () => this.close() );
    }

    private initializeLogFile(): void {
        try {
            const logDir = 'logs';
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir);
            }
            const datePart = new Date().toISOString().split('T')[0];
            const logFile = path.join(logDir, `app-${datePart}.log`);
            this.logStream = fs.createWriteStream(logFile, { flags: 'a' });

            // Write initialization message
            const initMessage = `\n\n===== Logger initialized at ${new Date().toISOString()} =====\n`;

            this.logStream.write(initMessage);
        } catch (error) {
            console.error('Failed to initialize log file:', error);
        }
    }

    private shouldLog(level: string): boolean {
        if (!level) return false;
        return this.isLoggingEnabled ||
            this.enabledLevels.has(level.toLowerCase());
    }

    private getTimestamp(): string {
        return new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');
    }

    private stripAnsiCodes(str: string): string {
        return str.replace(/\x1b\[[0-9;]*m/g, '');
    }

    private writeToFile(message: string): void {
        if (this.logToFile && this.logStream) {
            try {
                const cleanMessage = this.stripAnsiCodes(message);
                this.logStream.write(`${cleanMessage}\n`);
            } catch (error) {
                console.error('Failed to write to log file:', error);
            }
        }
    }

    private formatMessage(level: LogLevel, message: any, context?: ContextType): string {
        const timestamp = this.getTimestamp();
        const pid = process.pid;
        const ctx = context || 'Application';
        const levelColor = levelColors[level] || colors.reset;

        return `${levelColor}[NodeApp]${colors.reset} ${colors.magenta}${pid}${colors.reset}  - ${timestamp}     ${levelColor}${level.padEnd(6)}${colors.reset} ${levelColor}[${ctx}]${colors.reset} ${levelColor}${message}${colors.reset}`;
    }


    log(message: any, context?: ContextType): void {

        if (this.shouldLog('log')) {
            const formattedMessage = this.formatMessage('LOG', message, context);
            console.log(formattedMessage);
            this.writeToFile(formattedMessage);
        }
    }

    debug(message: any, context?: ContextType): void {
        if (this.shouldLog('debug')) {
            const formattedMessage = this.formatMessage('DEBUG', message, context);
            console.debug(formattedMessage);
            this.writeToFile(formattedMessage);
        }
    }

    warn(message: any, context?: ContextType): void {
        if (this.shouldLog('warn')) {
            const formattedMessage = this.formatMessage('WARN', message, context);
            console.warn(formattedMessage);
            this.writeToFile(formattedMessage);
        }
    }

    error(message: any, stack?: string, context?: ContextType): void {
        if (this.shouldLog('error')) {
            const formattedMessage = this.formatMessage('ERROR', message, context);
            console.error(formattedMessage);
            if (stack) {
                const stackTrace = `${colors.red}${stack}${colors.reset}`;
                console.error(stackTrace);
                this.writeToFile(`${formattedMessage}\n${stack}`);
            } else {
                this.writeToFile(formattedMessage);
            }
        }
    }

    fatal(message: any, context?: ContextType): void {
        if (this.shouldLog('fatal')) {
            const formattedMessage = this.formatMessage('FATAL', message, context);
            console.error(formattedMessage);
            this.writeToFile(formattedMessage);
        }
    }

    close(): void {
        if (this.logStream) {
            try {
                const shutdownMessage = `\n===== Application shutdown at ${new Date().toISOString()} =====\n`;

                this.logStream.write(shutdownMessage);
                this.logStream.end();
            } catch (error) {
                console.error('Failed to close log stream:', error);
            }
        }
    }
}

// Export as singleton instance
export const logger = new CustomLogger();