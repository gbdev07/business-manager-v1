import { Module } from '@nestjs/common';
import { SystemRolesService } from '@core/users/system-roles.service';
import { UsersController } from '@core/users/users.controller';
import { RolesRepository, UsersRepository } from '@core/users/users.repository';
import { UsersService } from '@core/users/users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, RolesRepository, SystemRolesService],
  exports: [UsersService, SystemRolesService],
})
export class UsersModule {}
