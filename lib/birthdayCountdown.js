/**
 * Calculates countdown details for a birthday celebration.
 * Implements the rule:
 * - The countdown starts if the link is opened a day before the birthday (within 24 hours / calendar day before).
 * - If opened more than a day before, it remains locked with a notice that countdown begins 1 day before.
 * - On or after the birthday, the celebration is unlocked.
 */

export function getBirthdayTargetInfo(person, referenceNow = null) {
  if (!person) {
    return {
      isLocked: false,
      isCountdownActive: false,
      isTooEarly: false,
      targetDate: null,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const rawDate = (person.dob || person.date || '').toString().trim();
  if (!rawDate) {
    return {
      isLocked: false,
      isCountdownActive: false,
      isTooEarly: false,
      targetDate: null,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  // Extract month and day
  let bYear = null;
  let bMonth = null; // 0-indexed
  let bDay = null;

  const ymdMatch = rawDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    bYear = parseInt(ymdMatch[1], 10);
    bMonth = parseInt(ymdMatch[2], 10) - 1;
    bDay = parseInt(ymdMatch[3], 10);
  } else {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      bYear = parsed.getFullYear();
      bMonth = parsed.getMonth();
      bDay = parsed.getDate();
    }
  }

  if (bMonth === null || isNaN(bMonth) || bDay === null || isNaN(bDay) || bDay < 1 || bDay > 31) {
    return {
      isLocked: false,
      isCountdownActive: false,
      isTooEarly: false,
      targetDate: null,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const now = referenceNow instanceof Date ? referenceNow : new Date();
  const currentYear = now.getFullYear();

  // Midnight of the birthday date in current year (local time)
  let target = new Date(currentYear, bMonth, bDay, 0, 0, 0, 0);

  // If today is the exact birthday day (between 00:00:00 and 23:59:59 of the birthday)
  const isSameDay =
    now.getFullYear() === target.getFullYear() &&
    now.getMonth() === target.getMonth() &&
    now.getDate() === target.getDate();

  if (isSameDay) {
    return {
      isLocked: false,
      isToday: true,
      isCountdownActive: false,
      isTooEarly: false,
      targetDate: target,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formattedDate: target.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      }),
    };
  }

  // If target in current year has already passed
  if (now.getTime() > target.getTime()) {
    const msSinceTarget = now.getTime() - target.getTime();
    const daysSinceTarget = msSinceTarget / (1000 * 60 * 60 * 24);

    let createdDate = null;
    if (person.createdAt) {
      const d = new Date(person.createdAt);
      if (!isNaN(d.getTime())) createdDate = d;
    }

    // If page was created BEFORE this year's birthday and we are within 30 days after:
    // The celebration was already unlocked on the birthday and remains accessible!
    const wasCreatedBeforeBirthday = createdDate && createdDate.getTime() <= target.getTime();
    if (wasCreatedBeforeBirthday && daysSinceTarget <= 30) {
      return {
        isLocked: false,
        isBelated: true,
        isCountdownActive: false,
        isTooEarly: false,
        targetDate: target,
        totalSeconds: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formattedDate: target.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
        }),
      };
    }

    // Otherwise, celebration is aimed at next year's birthday
    target = new Date(currentYear + 1, bMonth, bDay, 0, 0, 0, 0);
  }

  // At this point, target is in the future (now.getTime() < target.getTime())
  const diffMs = target.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

  // 1 hour before the birthday: within 60 minutes (3600 seconds) before midnight
  const isOneHourBefore = diffMs <= 60 * 60 * 1000;
  const oneHourBeforeTarget = new Date(target.getTime() - 60 * 60 * 1000);

  return formatCountdownResult(target, totalSeconds, true, isOneHourBefore, oneHourBeforeTarget);
}

function formatCountdownResult(targetDate, totalSeconds, isLocked, isCountdownActive, oneHourBeforeDate) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedDate = targetDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const countdownStartsDate = oneHourBeforeDate
    ? oneHourBeforeDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return {
    isLocked: isLocked && totalSeconds > 0,
    isCountdownActive: isCountdownActive && totalSeconds > 0,
    isTooEarly: !isCountdownActive && totalSeconds > 0,
    targetDate,
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    formattedDate,
    countdownStartsDate,
    countdownStartsTime: '11:00 PM',
  };
}
