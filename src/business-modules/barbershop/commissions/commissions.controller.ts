import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { BusinessModule, RequirePermissions } from '@common/decorators/auth.decorators';
import { BarbershopPermission } from '@modules/barbershop/barbershop.permissions';
import { CommissionsService } from '@modules/barbershop/commissions/commissions.service';
import {
  CommissionResponseDto,
  CommissionRuleResponseDto,
  CreateCommissionRuleDto,
  PaginatedCommissionRulesDto,
  PaginatedCommissionsDto,
  QueryCommissionRulesDto,
  QueryCommissionsDto,
  UpdateCommissionRuleDto,
} from '@modules/barbershop/commissions/dto/commission.dto';

@ApiTags('Barbershop · Commissions')
@ApiBearerAuth()
@BusinessModule(BusinessType.BARBERSHOP)
@Controller('barbershop')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get('commission-rules')
  @RequirePermissions(BarbershopPermission.COMMISSIONS_READ)
  @ApiOkResponse({ type: PaginatedCommissionRulesDto })
  listRules(@Query() query: QueryCommissionRulesDto): Promise<PaginatedCommissionRulesDto> {
    return this.commissionsService.listRules(query);
  }

  @Post('commission-rules')
  @RequirePermissions(BarbershopPermission.COMMISSIONS_MANAGE)
  @ApiCreatedResponse({ type: CommissionRuleResponseDto })
  createRule(@Body() dto: CreateCommissionRuleDto): Promise<CommissionRuleResponseDto> {
    return this.commissionsService.createRule(dto);
  }

  @Patch('commission-rules/:id')
  @RequirePermissions(BarbershopPermission.COMMISSIONS_MANAGE)
  @ApiOkResponse({ type: CommissionRuleResponseDto })
  updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommissionRuleDto,
  ): Promise<CommissionRuleResponseDto> {
    return this.commissionsService.updateRule(id, dto);
  }

  @Get('commissions')
  @RequirePermissions(BarbershopPermission.COMMISSIONS_READ)
  @ApiOkResponse({ type: PaginatedCommissionsDto })
  list(@Query() query: QueryCommissionsDto): Promise<PaginatedCommissionsDto> {
    return this.commissionsService.list(query);
  }

  @Patch('commissions/:id/pay')
  @RequirePermissions(BarbershopPermission.COMMISSIONS_MANAGE)
  @ApiOkResponse({ type: CommissionResponseDto })
  markPaid(@Param('id', ParseUUIDPipe) id: string): Promise<CommissionResponseDto> {
    return this.commissionsService.markPaid(id);
  }

  @Patch('commissions/:id/cancel')
  @RequirePermissions(BarbershopPermission.COMMISSIONS_MANAGE)
  @ApiOkResponse({ type: CommissionResponseDto })
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<CommissionResponseDto> {
    return this.commissionsService.cancel(id);
  }
}
