import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from '@users/users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('status')
  @ApiOperation({ summary: 'Users module health check' })
  status(): { module: string; status: string } {
    return this.usersService.getStatus();
  }
}
