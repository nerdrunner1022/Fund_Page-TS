import { useEffect, useState } from 'react';
import type { CampaignCopy } from '../types';

function partsFrom(deadline: string, now: number) {
  const seconds = Math.max(
    Math.floor((new Date(deadline).getTime() - now) / 1000),
    0,
  );
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

export function Countdown({
  deadline,
  copy,
}: {
  deadline: string;
  copy: CampaignCopy;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const { days, hours, minutes, seconds } = partsFrom(deadline, now);

  return (
    <>
      <div className="days" aria-hidden="true">
        <b id="d">{days}</b>
        <span>{copy.daysLeft}</span>
      </div>
      <div className="hms" aria-hidden="true">
        <div>
          <b id="h">{hours}</b>
          <span>{copy.hours}</span>
        </div>
        <div>
          <b id="m">{minutes}</b>
          <span>{copy.minutes}</span>
        </div>
        <div>
          <b id="s">{seconds}</b>
          <span>{copy.seconds}</span>
        </div>
      </div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {days} {copy.daysLeft}
      </span>
    </>
  );
}
