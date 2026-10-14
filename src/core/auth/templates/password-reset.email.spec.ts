import { buildPasswordResetEmail } from '@core/auth/templates/password-reset.email';

describe('buildPasswordResetEmail', () => {
  const input = {
    name: 'Maria',
    resetLink: 'https://app.example.com/reset-password?token=abc',
    expiresInMinutes: 30,
  };

  it('includes the link, its validity and the "ignore if not requested" notice', () => {
    const email = buildPasswordResetEmail(input);

    expect(email.subject).toBe('Redefinição de senha');
    for (const content of [email.text, email.html]) {
      expect(content).toContain('https://app.example.com/reset-password?token=abc');
      expect(content).toContain('30 minutos');
      expect(content).toContain('ignore este e-mail');
    }
  });

  it('formats whole hours', () => {
    expect(buildPasswordResetEmail({ ...input, expiresInMinutes: 60 }).text).toContain('1 hora');
    expect(buildPasswordResetEmail({ ...input, expiresInMinutes: 120 }).text).toContain('2 horas');
  });

  it('escapes user-controlled values in the HTML version', () => {
    const email = buildPasswordResetEmail({ ...input, name: '<script>alert(1)</script>' });

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });
});
