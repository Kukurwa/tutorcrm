import type { SystemSettings, UpdateSystemSettingsRequest } from '@tutorcrm/contracts';

let settings: SystemSettings = {
  invoiceWeekday: 1, // Monday
  invoiceDueDays: 3,
  currency: 'UAH',
  autoActions: {
    auto_assign_dispatcher_on_new_dialog: true,
    auto_publish_to_channels_on_request_ready: false,
    auto_create_feedback_task_on_assignment: true,
    auto_generate_invoices_weekly: true,
    auto_mark_overdue_invoices: true,
  },
};

export function getSystemSettings(): SystemSettings {
  return settings;
}

export function updateSystemSettings(patch: UpdateSystemSettingsRequest): SystemSettings {
  settings = {
    ...settings,
    ...patch,
    autoActions: { ...settings.autoActions, ...(patch.autoActions ?? {}) },
  };
  return settings;
}
