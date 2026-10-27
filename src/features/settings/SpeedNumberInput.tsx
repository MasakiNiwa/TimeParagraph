import { NumberInput } from '@mantine/core';
import { useEffect, useState } from 'react';
import { speedLimits } from './settingsSchema';

/** 入力途中の空欄・桁を設定へ送らず、確定時に許容範囲へ収める */
export function SpeedNumberInput({
  value,
  onChange,
  isChars,
  width,
}: {
  value: number;
  onChange: (value: number) => void;
  isChars: boolean;
  width?: number;
}) {
  const [draft, setDraft] = useState<string | number>(value);
  const [min, max] = isChars ? speedLimits.chars : speedLimits.moras;
  useEffect(() => setDraft(value), [value]);
  return (
    <NumberInput
      w={width}
      min={min}
      max={max}
      allowDecimal={false}
      suffix={isChars ? ' 字/分' : ' 拍/分'}
      value={draft}
      onChange={setDraft}
      onBlur={() => {
        const numeric = typeof draft === 'number' ? draft : Number(draft);
        const next =
          draft === '' || !Number.isFinite(numeric) ? value : Math.min(max, Math.max(min, numeric));
        setDraft(next);
        onChange(next);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      aria-label="話す速さの数値"
    />
  );
}
