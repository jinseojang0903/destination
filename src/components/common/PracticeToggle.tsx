"use client";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function PracticeToggle({ checked, onChange }: Props) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-orange-500"
      />
      <span>
        연습 모드
        <span className="block text-xs text-neutral-400">
          결과가 저장되지 않고, 시도 횟수도 차감되지 않아요. 결과는 매번 랜덤이에요.
        </span>
      </span>
    </label>
  );
}
