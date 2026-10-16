"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { inputClass } from "@/components/ui/controls";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function groupThousands(digits: string) {
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

export function MoneyInput({
  name,
  placeholder,
  required,
  defaultValue = "",
  value: valueProp,
  onValueChange,
  className,
  ariaLabel,
}: {
  name?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
  value?: string | number;
  onValueChange?: (digits: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);
  const [uncontrolled, setUncontrolled] = useState(() => groupThousands(digitsOnly(String(defaultValue))));
  const value = valueProp === undefined ? uncontrolled : groupThousands(digitsOnly(String(valueProp)));

  useLayoutEffect(() => {
    const input = inputRef.current;
    const target = caretDigits.current;
    if (!input || target === null) return;
    let seen = 0;
    let caret = value.length;
    for (let index = 0; index < value.length; index += 1) {
      if (/\d/.test(value[index] ?? "")) seen += 1;
      if (seen === target) {
        caret = index + 1;
        break;
      }
    }
    input.setSelectionRange(caret, caret);
    caretDigits.current = null;
  }, [value]);

  return (
    <input
      ref={inputRef}
      name={name}
      required={required}
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={className ? `${className} tabular-nums` : `${inputClass} tabular-nums`}
      value={value}
      onChange={(event) => {
        const raw = event.target.value;
        const selection = event.target.selectionStart ?? raw.length;
        const digits = digitsOnly(raw);
        caretDigits.current = digitsOnly(raw.slice(0, selection)).length;
        if (valueProp === undefined) setUncontrolled(groupThousands(digits));
        onValueChange?.(digits);
      }}
    />
  );
}
