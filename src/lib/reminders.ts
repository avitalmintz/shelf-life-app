import { Capacitor, registerPlugin } from "@capacitor/core";

interface ReminderPayload {
  id: string;
  title: string;
  body?: string;
  date: string;
}

interface ShelfRemindersPlugin {
  schedule(payload: ReminderPayload): Promise<void>;
  cancel(payload: { id: string }): Promise<void>;
}

const ShelfReminders = registerPlugin<ShelfRemindersPlugin>("ShelfReminders");

export async function scheduleReminder(payload: ReminderPayload): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (new Date(payload.date).getTime() <= Date.now()) return;
  await ShelfReminders.schedule(payload);
}

export async function cancelReminder(id: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await ShelfReminders.cancel({ id });
}
