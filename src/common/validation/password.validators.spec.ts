import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { IsPasswordPolicy, MatchesProperty } from '@common/validation/password.validators';

class PasswordForm {
  @IsPasswordPolicy()
  newPassword!: string;

  @MatchesProperty('newPassword')
  confirmPassword!: string;
}

function errorsFor(newPassword: string, confirmPassword = newPassword): string[] {
  const form = plainToInstance(PasswordForm, { newPassword, confirmPassword });
  return validateSync(form).map((error) => error.property);
}

describe('password validators', () => {
  it('accepts a password that follows the policy and is confirmed', () => {
    expect(errorsFor('StrongPass123!')).toEqual([]);
  });

  it.each(['Sh0rt', 'nouppercase1', 'NOLOWERCASE1', 'NoDigitsHere', `Aa1${'x'.repeat(70)}`])(
    'rejects "%s"',
    (password) => {
      expect(errorsFor(password)).toContain('newPassword');
    },
  );

  it('rejects a confirmation that does not match', () => {
    expect(errorsFor('StrongPass123!', 'StrongPass124!')).toEqual(['confirmPassword']);
  });
});
