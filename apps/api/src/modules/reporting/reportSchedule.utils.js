import parser from "cron-parser";
import { DateTime } from "luxon";

/**
 * Compute the next run time for a schedule
 */
export function computeNextRunAt(schedule) {
  const { cadence, cronExpr, timezone = "Asia/Kolkata", runAt = { hour: 9, minute: 0 } } = schedule;

  const now = DateTime.now().setZone(timezone);

  if (cadence === "CRON" && cronExpr) {
    try {
      const interval = parser.parseExpression(cronExpr, {
        currentDate: now.toJSDate(),
        tz: timezone
      });
      return interval.next().toDate();
    } catch (error) {
      throw new Error(`Invalid cron expression: ${error.message}`);
    }
  }

  let next = now.set({ hour: runAt.hour, minute: runAt.minute, second: 0, millisecond: 0 });

  switch (cadence) {
    case "DAILY":
      if (next <= now) {
        next = next.plus({ days: 1 });
      }
      break;

    case "WEEKLY": {
      const { weekday = 1 } = schedule;
      next = next.set({ weekday });
      if (next <= now) {
        next = next.plus({ weeks: 1 });
      }
      break;
    }

    case "MONTHLY": {
      const { dayOfMonth = 1 } = schedule;
      next = next.set({ day: dayOfMonth });
      if (next <= now) {
        next = next.plus({ months: 1 });
      }
      break;
    }

    case "QUARTERLY": {
      const { quarter = 1, dayOfMonth = 1 } = schedule;
      const quarterStartMonth = (quarter - 1) * 3 + 1;
      next = next.set({ month: quarterStartMonth, day: dayOfMonth });
      if (next <= now) {
        next = next.plus({ months: 3 });
      }
      break;
    }

    case "YEARLY": {
      const { monthOfYear = 1, dayOfMonth = 1 } = schedule;
      next = next.set({ month: monthOfYear, day: dayOfMonth });
      if (next <= now) {
        next = next.plus({ years: 1 });
      }
      break;
    }

    default:
      throw new Error(`Unsupported cadence: ${cadence}`);
  }

  return next.toJSDate();
}
