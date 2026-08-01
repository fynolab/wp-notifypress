import * as React from 'react';
import { Clock } from 'lucide-react';

import { cn } from '../utils';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

type Period = 'AM' | 'PM';

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  placeholder?: string;
};

const hours12 = Array.from({ length: 12 }, (_, i) => i + 1);
const minutes = Array.from({ length: 60 }, (_, i) => i);

function parseTime(value: string) {
  if (!value) {
    return { hour: 9, minute: 0, period: 'AM' as Period };
  }

  const [rawHour, rawMinute] = value.split(':').map(Number);
  const period: Period = rawHour >= 12 ? 'PM' : 'AM';
  let hour = rawHour % 12;
  if (hour === 0) {
    hour = 12;
  }

  return { hour, minute: rawMinute || 0, period };
}

function formatTime24(hour: number, minute: number, period: Period): string {
  let hour24 = hour % 12;
  if (period === 'PM') {
    hour24 += 12;
  }

  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatDisplay(value: string): string {
  const { hour, minute, period } = parseTime(value);
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`;
}

const TimePicker = ({
  value,
  onChange,
  id,
  className,
  placeholder = 'Pick a time',
}: TimePickerProps) => {
  const { hour, minute, period } = parseTime(value);

  const update = (
    next: Partial<{ hour: number; minute: number; period: Period }>,
  ) => {
    onChange(
      formatTime24(
        next.hour ?? hour,
        next.minute ?? minute,
        next.period ?? period,
      ),
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          className={cn(
            'w-[150px] justify-start text-left font-normal border-dashed bg-muted/50 hover:bg-muted',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value ? formatDisplay(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex items-center gap-2">
          <Select
            value={String(hour)}
            onValueChange={val => update({ hour: Number(val) })}
          >
            <SelectTrigger className="w-[68px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {hours12.map(h => (
                <SelectItem key={h} value={String(h)}>
                  {String(h).padStart(2, '0')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">:</span>
          <Select
            value={String(minute)}
            onValueChange={val => update({ minute: Number(val) })}
          >
            <SelectTrigger className="w-[68px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {minutes.map(m => (
                <SelectItem key={m} value={String(m)}>
                  {String(m).padStart(2, '0')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={period}
            onValueChange={val => update({ period: val as Period })}
          >
            <SelectTrigger className="w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export { TimePicker };
