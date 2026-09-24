import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

interface CountdownTimerProps {
  initialSeconds?: number;
  onExpire?: () => void;
}

export function CountdownTimer({ initialSeconds = 60, onExpire }: CountdownTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      onExpire?.();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, onExpire]);

  const percentage = Math.max(0, Math.min(100, (secondsRemaining / initialSeconds) * 100));

  // Circular ring calculations
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const isLowTime = secondsRemaining <= 10;

  return (
    <div className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#262626] rounded-xl">
      <div className="flex items-center gap-3">
        {/* Circular Progress Ring */}
        <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
          <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r={radius}
              className="text-[#262626] stroke-current"
              strokeWidth="3.5"
              fill="transparent"
            />
            <circle
              cx="24"
              cy="24"
              r={radius}
              className={`transition-all duration-1000 ease-linear stroke-current ${
                isLowTime ? 'text-[#ef4444]' : secondsRemaining < 25 ? 'text-amber-400' : 'text-[#6366f1]'
              }`}
              strokeWidth="3.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <Timer className={`absolute w-4 h-4 ${isLowTime ? 'text-[#ef4444] animate-ping' : 'text-[#a1a1a1]'}`} />
        </div>

        <div>
          <p className="text-xs font-semibold text-[#fafafa]">
            Auto-hiding in <span className="font-mono tabular-nums text-indigo-400">{secondsRemaining}s</span>
          </p>
          <p className="text-[11px] text-[#a1a1a1]">
            Content will be blurred automatically to protect privacy
          </p>
        </div>
      </div>

      <span className="text-xs font-mono tabular-nums text-[#a1a1a1] px-2 py-1 bg-[#1a1a1a] rounded">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}
