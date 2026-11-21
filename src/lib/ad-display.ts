import type { Ad, AdSlot } from "@/lib/types";
import { daysInclusiveYMD, isValidYMD, todayYMDShanghai } from "@/lib/date-utils";

/** 按投放日历日相对「今天」分段（无合法起止日则为无排期） */
export type AdScheduleBucket = "none" | "not_started" | "active" | "ended";

export function adScheduleBucket(a: Ad, today = todayYMDShanghai()): AdScheduleBucket {
  if (!a.startDate || !a.endDate || !isValidYMD(a.startDate) || !isValidYMD(a.endDate)) {
    return "none";
  }
  if (today < a.startDate) return "not_started";
  if (today > a.endDate) return "ended";
  return "active";
}

export function adScheduleBucketLabelCn(bucket: AdScheduleBucket): string {
  switch (bucket) {
    case "none":
      return "无排期";
    case "not_started":
      return "未开始";
    case "active":
      return "投放中";
    case "ended":
      return "已结束";
    default:
      return bucket;
  }
}

/**
 * 后台说明：当前主要为「瀑布流今日推荐」展位；
 * 其它 slot 仅概括审核状态（前台规则可能不同）。
 */
export function adFrontDisplayHint(a: Ad, today = todayYMDShanghai()): string {
  if (a.status === "rejected") return "已驳回，前台不展示。";
  if (a.status === "pending") return "待审核，前台不展示。";
  if (a.slot !== "home_featured") {
    return "已通过。该展位在前台的展示规则见站点配置（此处不推算具体时段）。";
  }
  const bucket = adScheduleBucket(a, today);
  if (bucket === "none") return "已通过，但缺少有效投放日期，前台不按「今日推荐」投放。";
  if (bucket === "not_started") return "已通过，未到投放开始日，前台暂不展示。";
  if (bucket === "ended") return "投放期已结束，前台不再展示。";
  return "投放期内且已通过，首页瀑布流「今日推荐」可展示。";
}

export function adSlotLabelCn(slot: AdSlot): string {
  switch (slot) {
    case "home_banner":
      return "首页横幅";
    case "feed_top":
      return "信息流置顶";
    case "home_featured":
      return "瀑布流今日推荐";
    default:
      return slot;
  }
}

export function featuredAdScheduleCn(a: Ad): string | null {
  if (a.slot !== "home_featured" || !a.startDate || !a.endDate) return null;
  const days = daysInclusiveYMD(a.startDate, a.endDate);
  return `${a.startDate} ～ ${a.endDate}（${days} 天）`;
}
