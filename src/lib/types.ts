export type UserRole = "super_admin" | "admin" | "user" | "merchant";

export type AdStatus = "pending" | "approved" | "rejected";

/** 菜单图 / 实景图：先审后发为 pending，先发后审为 approved；后台可驳回为 rejected */
export type ShopGalleryStatus = "pending" | "approved" | "rejected";

export interface ShopGalleryItem {
  url: string;
  status: ShopGalleryStatus;
  /** 上传者（新数据有；旧数据可能为空） */
  submittedByUserId?: string | null;
  submittedByNickname?: string | null;
}
export type AdSlot = "home_banner" | "feed_top" | "home_featured";

export interface Building {
  id: string;
  name: string;
  /** 全局展示顺序（瀑布流筛选、地图食堂条等）；越小越靠前 */
  sortOrder?: number;
}

export interface Floor {
  id: string;
  buildingId: string;
  name: string;
  order: number;
  width: number;
  height: number;
  backgroundImage?: string;
}

export interface Dish {
  name: string;
  price?: number;
  image?: string;
  /** 美食分类等（平台标签库）；运营向标签仅保留在店铺级 shop.tags */
  tags: string[];
}

export interface Shop {
  id: string;
  name: string;
  buildingId: string;
  buildingName: string;
  /** 后台/商户声明的主楼层（可选；地图铺位另见 mapShapes） */
  floorId?: string | null;
  avgPrice: number;
  tags: string[];
  /** 封面图 URL，可为上传路径或外链；空则用纯色占位 */
  coverImage?: string;
  dishes: Dish[];
  /** 菜单大图（支持审核状态；旧数据纯字符串会在读取时视为已通过） */
  menuImages: ShopGalleryItem[];
  /** 实景照片 */
  sceneImages: ShopGalleryItem[];
  description?: string;
  merchantId?: string;
  /** 绑定商户账号 userId，商户仅能编辑自家店铺 */
  ownerUserId?: string | null;
  /** 新店审核：商户新建为 pending，管理员「新店审核」通过后为 approved；缺省视为已通过 */
  listingStatus?: "pending" | "approved";
  /** 站点对外展示：false 时首页、推荐、地图、详情等对访客全部不可见（须已通过新店审核）；缺省 true */
  publicDisplay?: boolean;
  /** 店内位置说明等，店主与管理员可编辑 */
  locationNote?: string;
  /** 是否在详情页展示联系方式（店主自选） */
  showContact?: boolean;
  /** 对外展示的电话（仅当 showContact 为 true 时下发给访客） */
  contactPhone?: string | null;
  /** 对外展示的补充联系方式，如微信（仅当 showContact 为 true 时下发给访客） */
  contactNote?: string | null;
}

/** 地图上的矩形：店铺或可点击标识（楼梯、入口等） */
export type MapShapeKind = "shop" | "stairs" | "entrance";

export interface MapShape {
  id: string;
  floorId: string;
  /** kind 为 shop（默认）时绑定店铺 id；标识块可为空字符串 */
  shopId: string;
  /** 默认 shop；楼梯、入口等非店铺标识 */
  kind?: MapShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface Review {
  id: string;
  shopId: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  visible: boolean;
  /** 先审后发：新建为 pending，管理员「展示」后为 approved；旧数据无此字段视为已放行 */
  reviewModeration?: "pending" | "approved";
  createdAt: string;
  /** 本次就餐人均（元）；≥3 条带价可见评价后与商家参考价合并，对外展示整数均价 */
  perPersonSpend?: number;
  /** 评价配图（压缩后的 URL） */
  images?: string[];
  /** 商户申请由管理员隐藏评价（ISO 时间）；批准后应清除并设为 visible:false */
  hideRequestedAt?: string;
}

export interface Ad {
  id: string;
  merchantId: string;
  shopId: string;
  title: string;
  status: AdStatus;
  slot: AdSlot;
  /** 「瀑布流今日推荐」投放开始（YYYY-MM-DD，上海日历日） */
  startDate?: string;
  endDate?: string;
  submittedAt?: string;
  /** 瀑布流顶部横条展示图（可选）；未设置则用店铺封面 */
  promoImage?: string | null;
}

/** 存储在 users.json，含密码哈希（勿下发给前端） */
export interface UserRecord {
  id: string;
  nickname: string;
  role: UserRole;
  email?: string | null;
  phone?: string | null;
  /** 唯一登录名（可选；管理员账号常用） */
  username?: string | null;
  passwordHash: string;
  merchantProfile?: {
    shopName: string;
    location: string;
    shopNumber: string;
    notes?: string;
  };
  /** 收藏的店铺 id（服务端持久化） */
  favoriteShopIds?: string[];
  /** 「想吃」标记的店铺 id（服务端持久化） */
  wantShopIds?: string[];
  /** 后台地图编辑器偏好（按账号同步） */
  mapEditorPrefs?: {
    /** 「添加铺位」时使用的默认矩形尺寸 */
    newShopCell?: { w: number; h: number };
  };
}

/** API / 界面展示的公开用户信息 */
export interface PublicUser {
  id: string;
  nickname: string;
  role: UserRole;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  merchantProfile?: UserRecord["merchantProfile"];
}
