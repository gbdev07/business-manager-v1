import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser, Public } from '@common/decorators/auth.decorators';
import { AuthenticatedUser } from '@common/types/authenticated-user';
import {
  AuthService,
  TENANT_ACCESS_DENIED_MESSAGE,
  toPublicAuthUser,
} from '@core/auth/auth.service';
import {
  AccessibleTenantDto,
  AuthResponseDto,
  AuthUserDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  MessageResponseDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SwitchTenantDto,
} from '@core/auth/dto/auth.dto';
import { INVALID_RESET_TOKEN_MESSAGE, PasswordService } from '@core/auth/password.service';
import { RegisterTenantDto } from '@core/tenants/dto/tenant.dto';

export const FORGOT_PASSWORD_MESSAGE =
  'Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.';

const TOO_MANY_REQUESTS = 'Rate limit exceeded for this endpoint; retry after `Retry-After`';

@ApiTags('Core · Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordService: PasswordService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new business (tenant) and its owner' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  register(@Body() dto: RegisterTenantDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() dto: LoginDto, @Ip() ip: string): Promise<AuthResponseDto> {
    return this.authService.login(dto.email, dto.password, ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  @ApiOkResponse({ type: AuthResponseDto })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a refresh token' })
  @ApiOkResponse({ type: MessageResponseDto })
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MessageResponseDto> {
    await this.authService.logout(dto.refreshToken, user);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current authenticated user and active tenant' })
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: AuthenticatedUser): AuthUserDto {
    return toPublicAuthUser(user);
  }

  @Get('tenants')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List tenants the authenticated user can access',
    description:
      'Returns only active memberships on active tenants. The user is taken from the access token. ' +
      'An identity with no usable membership receives an empty list. ' +
      '`isCurrent` marks the tenant bound to this access token.',
  })
  @ApiOkResponse({ type: [AccessibleTenantDto] })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked access token' })
  listTenants(@CurrentUser() user: AuthenticatedUser): Promise<AccessibleTenantDto[]> {
    return this.authService.listAccessibleTenants(user);
  }

  @Post('tenants/switch')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Switch the active tenant of the current session',
    description:
      'Checks that the authenticated user has an active membership on an active destination tenant. ' +
      'On success, replaces only this session: the previous access token stops working and the response ' +
      'carries new access and refresh tokens for the destination role. Other devices are not affected. ' +
      'The same 403 is returned when the tenant does not exist, is inactive, or the user has no access.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'tenantId is missing or not a UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked access token' })
  @ApiForbiddenResponse({ description: TENANT_ACCESS_DENIED_MESSAGE })
  switchTenant(
    @Body() dto: SwitchTenantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ): Promise<AuthResponseDto> {
    return this.authService.switchTenant(user, dto.tenantId, ip);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request a password reset link by e-mail',
    description:
      'Always answers with the same generic message, whether or not the e-mail is registered. ' +
      'When the account exists and is active, a single-use link valid for ' +
      'PASSWORD_RESET_TOKEN_TTL_MINUTES (default 30) is sent to the e-mail address. ' +
      'Requesting a new link invalidates the previous one.',
  })
  @ApiAcceptedResponse({
    type: MessageResponseDto,
    schema: { example: { message: FORGOT_PASSWORD_MESSAGE } },
  })
  @ApiBadRequestResponse({ description: 'Malformed e-mail address' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string): MessageResponseDto {
    this.passwordService.requestPasswordReset(dto.email, ip);
    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a new password using the token received by e-mail',
    description:
      'The token is single-use. On success every session of the user is revoked ' +
      '(refresh and access tokens) and the user must log in again with the new password.',
  })
  @ApiOkResponse({
    type: MessageResponseDto,
    schema: { example: { message: 'Senha redefinida com sucesso. Faça login novamente.' } },
  })
  @ApiBadRequestResponse({
    description: `"${INVALID_RESET_TOKEN_MESSAGE}" for unknown, expired or already used tokens; validation errors for passwords outside the policy or not matching confirmPassword`,
  })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Ip() ip: string,
  ): Promise<MessageResponseDto> {
    await this.passwordService.resetPassword(dto.token, dto.newPassword, ip);
    return { message: 'Senha redefinida com sucesso. Faça login novamente.' };
  }

  @UseGuards(ThrottlerGuard)
  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change the password of the authenticated user',
    description:
      'The account is always the one identified by the access token. ' +
      'On success every session of the user is revoked, including the current one: ' +
      'the client must log in again with the new password.',
  })
  @ApiOkResponse({
    type: MessageResponseDto,
    schema: { example: { message: 'Senha alterada com sucesso. Faça login novamente.' } },
  })
  @ApiBadRequestResponse({
    description:
      'Current password is incorrect, new password equals the current one, ' +
      'violates the password policy or does not match confirmPassword',
  })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked access token' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ): Promise<MessageResponseDto> {
    await this.passwordService.changePassword(user, dto.currentPassword, dto.newPassword, ip);
    return { message: 'Senha alterada com sucesso. Faça login novamente.' };
  }
}
