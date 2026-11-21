import type { SVGProps } from "react";

/** 食图品牌：碗沿 + 碗身弧线 + 一双筷子（线宽与 Lucide 一致） */
export function EatmapBrandIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      <path d="M17 5.5 11.5 12.5" />
      <path d="M14.5 4 9 11.5" />
      <path d="M5 13h14" />
      <path d="M5 13c0 4 3.15 7 7 7s7-3 7-7" />
    </svg>
  );
}
