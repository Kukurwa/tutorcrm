import type { UpdateUserSettingsRequest, UserSettings } from '@tutorcrm/contracts';

const defaults: UserSettings = {
  theme: 'system',
  notifications: {
    inbox: true,
    responses: true,
    feedback: true,
    invoices: true,
    sla: true,
    system: true,
  },
  quietHours: { enabled: false, from: '22:00', to: '08:00' },
};

const settingsByUser = new Map<string, UserSettings>();

export function getUserSettings(userId: string): UserSettings {
  return settingsByUser.get(userId) ?? defaults;
}

export function setUserSettings(
  userId: string,
  patch: UpdateUserSettingsRequest,
): UserSettings {
  const current = getUserSettings(userId);
  const next: UserSettings = {
    theme: patch.theme ?? current.theme,
    notifications: { ...current.notifications, ...(patch.notifications ?? {}) },
    quietHours: { ...current.quietHours, ...(patch.quietHours ?? {}) },
  };
  settingsByUser.set(userId, next);
  return next;
}
