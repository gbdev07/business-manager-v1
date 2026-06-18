import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @Get('status')
  @ApiOperation({ summary: 'Auth module health check' })
  status(): { module: string; status: string } {
    return { module: 'auth', status: 'ready' };
  }
}
