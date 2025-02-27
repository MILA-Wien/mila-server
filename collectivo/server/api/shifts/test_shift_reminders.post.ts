import { sendShiftReminders } from "../../utils/shiftsReminder";

export default defineEventHandler(async (event) => {
  verifyCollectivoApiToken(event);
  console.log("Running test shift reminders");
  try {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 0);
    await sendShiftReminders(date);
  } catch (e) {
    console.error("Error in test shift reminders", e);
  }
});
