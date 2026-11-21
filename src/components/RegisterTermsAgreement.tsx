"use client";

import Link from "next/link";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function RegisterTermsAgreement({ checked, onChange }: Props) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug text-amber-900/85 max-md:text-[11px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-amber-900/25 text-amber-600 focus:ring-amber-400/40"
      />
      <span>
        我已认真阅读并同意
        <Link
          href="/legal/user-notice"
          target="_blank"
          rel="noopener noreferrer"
          className="mx-0.5 font-medium text-amber-800 underline underline-offset-2 hover:text-amber-950"
          onClick={(e) => e.stopPropagation()}
        >
          《用户须知》
        </Link>
        的全部内容。
      </span>
    </label>
  );
}
