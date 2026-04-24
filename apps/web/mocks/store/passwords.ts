// Mock-хранилище паролей. В FE-0 держим plaintext — это нормально для фикстур
// без реальных пользователей; BE-0 заменит на argon2id в БД.

const passwords = new Map<string, string>([
  ['user_admin', 'admin123'],
  ['user_dispatcher', 'dispatcher123'],
  ['user_leadgen', 'leadgen123'],
]);

export function verifyPassword(userId: string, password: string): boolean {
  const stored = passwords.get(userId);
  return stored !== undefined && stored === password;
}

export function setPassword(userId: string, password: string): void {
  passwords.set(userId, password);
}
