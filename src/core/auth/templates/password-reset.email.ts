export interface PasswordResetEmailInput {
  name: string;
  resetLink: string;
  expiresInMinutes: number;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function buildPasswordResetEmail(input: PasswordResetEmailInput): EmailContent {
  const validity = formatValidity(input.expiresInMinutes);

  const text = [
    `Olá, ${input.name}.`,
    '',
    'Recebemos uma solicitação para redefinir a senha da sua conta.',
    'Para criar uma nova senha, acesse o link abaixo:',
    '',
    input.resetLink,
    '',
    `Este link é válido por ${validity} e só pode ser usado uma vez.`,
    '',
    'Se você não solicitou a redefinição, ignore este e-mail: sua senha atual continua válida.',
  ].join('\n');

  const link = escapeHtml(input.resetLink);
  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
    <p>Olá, ${escapeHtml(input.name)}.</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
    <p><a href="${link}" style="display: inline-block; padding: 10px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">Redefinir senha</a></p>
    <p style="font-size: 13px;">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${link}</p>
    <p>Este link é válido por ${validity} e só pode ser usado uma vez.</p>
    <p style="font-size: 13px; color: #6b7280;">Se você não solicitou a redefinição, ignore este e-mail: sua senha atual continua válida.</p>
  </body>
</html>`;

  return { subject: 'Redefinição de senha', text, html };
}

function formatValidity(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }
  return `${minutes} minutos`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
