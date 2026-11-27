// Local reminders on the phone: medicines at their times, and the appointment the day before.
// Nothing is sent to a push server; the text shows only the medicine name the doctor wrote.
import * as Notifications from 'expo-notifications';
import { t, type Lang } from './i18n';
import type { Med, Plan } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function askPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const r = await Notifications.requestPermissionsAsync();
  return r.granted;
}

/** Replace all Aoun reminders with the current medicines and appointment. */
export async function scheduleAll(meds: Med[], plan: Plan | null, lang: Lang): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  let n = 0;
  for (const m of meds.filter((x) => x.active)) {
    const name = lang === 'ar' ? m.name_ar : m.name_en;
    for (const time of m.times) {
      const [hour, minute] = time.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: { title: t(lang, 'medReminderTitle', { name }), body: t(lang, 'medReminderBody', { dose: m.dose, food: m.with_food ? ' · ' + t(lang, 'withFood') : '' }) },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
      n++;
    }
  }
  if (plan?.confirmed && plan.slot) {
    const at = new Date(new Date(plan.slot.iso).getTime() - 24 * 3600 * 1000);
    if (at.getTime() > Date.now()) {
      const place = lang === 'ar' ? plan.slot.center_ar : plan.slot.center_en ?? plan.slot.center_ar;
      const whenTxt = new Date(plan.slot.iso).toLocaleTimeString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' });
      await Notifications.scheduleNotificationAsync({
        content: { title: t(lang, 'apptReminderTitle'), body: t(lang, 'apptReminderBody', { when: whenTxt, place }) },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
      n++;
    }
  }
  return n;
}
