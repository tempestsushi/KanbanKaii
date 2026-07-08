import { useEffect, useMemo, useRef, useState } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { cn } from '@/lib/utils';

export type AppDropdownOption<T extends string> = {
  disabled?: boolean;
  label: string;
  value: T;
};

interface AppDropdownProps<T extends string> {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  onChange: (value: T) => void;
  options: AppDropdownOption<T>[];
  placeholder?: string;
  value: T;
}

export function AppDropdown<T extends string>({
  ariaLabel,
  className,
  disabled = false,
  onChange,
  options,
  placeholder = 'Select option',
  value,
}: AppDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={menuRef} className={cn('relative min-w-0', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs font-medium text-slate-700 shadow-sm outline-none transition hover:border-violet-200 hover:text-violet-700 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className={cn('truncate', !selectedOption && 'text-slate-400')}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-10 z-50 max-h-64 w-full min-w-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition disabled:cursor-not-allowed disabled:text-slate-300',
                  selected
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <span className="truncate">{option.label}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
