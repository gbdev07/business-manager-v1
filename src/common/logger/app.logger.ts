import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppLogger implements LoggerService {
  private context?: string;

  constructor(private readonly configService: ConfigService) {}

  setContext(context: string): void {
    this.context = context;
  }

  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  private write(level: LogLevel, message: unknown, context?: string, trace?: string): void {
    const resolvedContext = context ?? this.context ?? 'Application';
    const timestamp = new Date().toISOString();
    const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);

    const output = `[${timestamp}] [${level.toUpperCase()}] [${resolvedContext}] ${formattedMessage}`;

    switch (level) {
      case 'error':
        console.error(output);
        if (trace) {
          console.error(trace);
        }
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
      case 'verbose':
        if (this.configService.get<string>('nodeEnv') !== 'production') {
          console.debug(output);
        }
        break;
      default:
        console.log(output);
    }
  }
}
