export function splitFullName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { firstName: '', lastName: '' };
  }

  const spaceIndex = trimmed.indexOf(' ');

  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: '' };
  }

  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim(),
  };
}

export function joinFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}
