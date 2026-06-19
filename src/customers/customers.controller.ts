import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { Roles } from '@auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@auth/interfaces/authenticated-user.interface';
import { CUSTOMER_READ_ROLES, CUSTOMER_WRITE_ROLES } from '@customers/constants/customer.constants';
import { CustomersService } from '@customers/customers.service';
import { CustomerHistoryResponseDto } from '@customers/dto/customer-history-response.dto';
import {
  CustomerResponseDto,
  PaginatedCustomersResponseDto,
} from '@customers/dto/customer-response.dto';
import { CreateCustomerDto } from '@customers/dto/create-customer.dto';
import { QueryCustomersDto } from '@customers/dto/query-customers.dto';
import { UpdateCustomerDto } from '@customers/dto/update-customer.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(...CUSTOMER_WRITE_ROLES)
  @ApiOperation({
    summary: 'Register a customer',
    description: 'Creates a customer linked to a barbershop.',
  })
  @ApiCreatedResponse({ type: CustomerResponseDto })
  @ApiConflictResponse({ description: 'Email already registered in this barbershop' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.customersService.create(dto, currentUser);
  }

  @Get()
  @Roles(...CUSTOMER_READ_ROLES)
  @ApiOperation({
    summary: 'List customers with pagination and filters',
    description: 'Filter by name, email, phone and barbershop. Scoped to accessible tenants.',
  })
  @ApiOkResponse({ type: PaginatedCustomersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  findAll(
    @Query() query: QueryCustomersDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PaginatedCustomersResponseDto> {
    return this.customersService.findAll(query, currentUser);
  }

  @Get(':id/history')
  @Roles(...CUSTOMER_READ_ROLES)
  @ApiOperation({
    summary: 'Get customer appointment history',
    description: 'Returns past appointments and upcoming scheduled visits.',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiOkResponse({ type: CustomerHistoryResponseDto })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiForbiddenResponse({ description: 'No access to this barbershop' })
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<CustomerHistoryResponseDto> {
    return this.customersService.getHistory(id, currentUser);
  }

  @Get(':id')
  @Roles(...CUSTOMER_READ_ROLES)
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiForbiddenResponse({ description: 'No access to this barbershop' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.customersService.findById(id, currentUser);
  }

  @Patch(':id')
  @Roles(...CUSTOMER_WRITE_ROLES)
  @ApiOperation({ summary: 'Update customer' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiConflictResponse({ description: 'Email already registered in this barbershop' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.customersService.update(id, dto, currentUser);
  }
}
