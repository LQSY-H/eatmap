/**
 * =============================================================================
 * 数据模型说明（权威类型定义：src/lib/types.ts）
 * =============================================================================
 *
 * 所有运行时数据都在 `data/`（可用 EATMAP_DATA_DIR 指向别的绝对路径）。
 * 该目录既是「种子数据」也是「运行数据」：首次启动后由程序持续读写。
 * 因此仓库里的 data/*.json 只保留最小可用种子（账号/店铺/评论/广告均清空）。
 *
 * 重要约定：
 * 1. 写操作统一走 src/lib/io.ts 的 readJsonFile / writeJsonFile。
 * 2. 读取后必须对旧数据做归一化（normalizeXxx），新增字段一律「可选 + 缺省值」。
 * 3. 时间：评价/提交时间用 ISO 8601 UTC 字符串；营业/投放日期用上海时区 YYYY-MM-DD。
 * 4. 金额单位：人民币元（整数或最多两位小数）。
 * 5. ID：使用 newId(prefix)（如 shop-xxx / rev-xxx / ad-xxx），不要手写自增。
 */

/* ---------------------------------------------------------------------------
 * users.json  -> UserRecord[]
 * ------------------------------------------------------------------------- */

export interface UserRecordExample {
  id: string; // 唯一 id，如 u-xxx / m-xxx / admin-xxx
  nickname: string; // 展示昵称，全局唯一（注册与改昵称时校验）
  role: "super_admin" | "admin" | "merchant" | "user";
  email?: string | null; // 学生注册使用；也参与登录
  phone?: string | null; // 商户注册使用；也参与登录
  username?: string | null; // 唯一登录名（管理员常用）
  passwordHash: string; // scrypt$<saltHex>$<hashHex>，禁止明文
  merchantProfile?: {
    shopName: string;
    location: string;
    shopNumber: string;
    notes?: string;
  };
  favoriteShopIds?: string[]; // 收藏
  wantShopIds?: string[]; // 想吃
  mapEditorPrefs?: { newShopCell?: { w: number; h: number } };
}

/* ---------------------------------------------------------------------------
 * shops.json -> Shop[]
 * ------------------------------------------------------------------------- */

export interface ShopExample {
  id: string;
  name: string;
  buildingId: string; // 关联 buildings.json
  buildingName: string; // 冗余存名，便于展示（建筑改名时由后台同步）
  floorId?: string | null; // 关联 floors.json（可选）
  avgPrice: number; // 商家填写的参考人均（>0 才展示）
  tags: string[]; // 店铺级标签，含运营标签「今日推荐」
  coverImage?: string; // 站内 /api/files/... 或 https 外链
  dishes: Dish[]; // 菜品
  menuImages: ShopGalleryItem[]; // 菜单大图（带审核状态）
  sceneImages: ShopGalleryItem[]; // 实景图（带审核状态）
  description?: string;
  merchantId?: string; // 旧版商户编号（保留兼容）
  ownerUserId?: string | null; // 绑定商户账号 userId
  listingStatus?: "pending" | "approved"; // 新店审核；缺省视为 approved
  publicDisplay?: boolean; // 对外展示开关；缺省 true
  locationNote?: string; // 店内位置说明
  showContact?: boolean;
  contactPhone?: string | null;
  contactNote?: string | null;
}

export interface DishExample {
  name: string;
  price?: number;
  image?: string;
  tags: string[];
}

export interface ShopGalleryItemExample {
  url: string; // /api/files/uploads/xxx.webp 或外链
  status: "pending" | "approved" | "rejected";
  submittedByUserId?: string | null;
  submittedByNickname?: string | null;
}

/* ---------------------------------------------------------------------------
 * reviews.json -> Review[]
 * ------------------------------------------------------------------------- */

export interface ReviewExample {
  id: string;
  shopId: string;
  userId: string; // 登录用户 id；历史游客评价为 "guest"
  userName: string;
  rating: number; // 1-5
  content: string;
  visible: boolean; // 对访客是否可见
  reviewModeration?: "pending" | "approved"; // 先审后发时 pending
  createdAt: string; // ISO UTC
  perPersonSpend?: number; // 本次人均（元）
  images?: string[]; // 评价配图（仅 /api/files/ 路径）
  hideRequestedAt?: string; // 商户申请隐藏的时间（管理员审批后清除并 visible=false）
}

/* ---------------------------------------------------------------------------
 * ads.json -> Ad[]  （当前只有免费「首页推荐」一种 slot）
 * ------------------------------------------------------------------------- */

export interface AdExample {
  id: string;
  merchantId: string;
  shopId: string;
  title: string; // 推广文案（≤14 字）
  status: "pending" | "approved" | "rejected";
  slot: "home_featured"; // 首页瀑布流顶部「今日推荐」横条
  startDate?: string; // YYYY-MM-DD（上海时区）
  endDate?: string;
  submittedAt?: string; // ISO UTC
  promoImage?: string | null; // 顶部展示图；空则用店铺封面
  // 注意：本开源版本已移除 pricePerDay 等计费字段，历史数据即使存在也不会被使用。
}

/* ---------------------------------------------------------------------------
 * buildings.json / floors.json / mapShapes.json
 * ------------------------------------------------------------------------- */

export interface BuildingExample {
  id: string;
  name: string;
  sortOrder?: number; // 越小越靠前
}

export interface FloorExample {
  id: string;
  buildingId: string;
  name: string; // 如「一层」「外部」
  order: number;
  width: number; // 地图画布坐标宽（默认 900）
  height: number; // 地图画布坐标高（默认 600）
  backgroundImage?: string; // 可选楼层平面图
}

export interface MapShapeExample {
  id: string;
  floorId: string;
  shopId: string; // kind=shop 时绑定店铺；stairs/entrance 可为空字符串
  kind?: "shop" | "stairs" | "entrance";
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

/* ---------------------------------------------------------------------------
 * tags.json -> string[]
 * ------------------------------------------------------------------------- */

// [ "小吃", "米饭", "甜品", ... ]
// 菜品标签与店铺运营标签都从这里取；后台可增删（需 super_admin）。

/* ---------------------------------------------------------------------------
 * site-settings.json -> SiteSettings
 * ------------------------------------------------------------------------- */

export interface SiteSettingsExample {
  /** 首页推荐（免费）总开关：开启后商户可见报名入口；关闭后横条随机展示全部菜品 */
  merchantFeedPromoEnabled: boolean;
  /** 瀑布流公告窄条是否展示（条目仍在配置中保留） */
  feedAnnouncementStripEnabled: boolean;
  /** 菜单/实景图审核：pre 先审后发 / post 先发后审 */
  galleryModerationMode: "pre" | "post";
  /** 用户评价审核：pre 先审后发 / post 先发后审 */
  reviewModerationMode: "pre" | "post";
  feedAnnouncementStrip?: {
    stripTitle: string; // ≤12 字
    items: {
      id: string;
      title: string; // ≤48 字
      text: string; // ≤180 字
      shopId: string; // 必须关联一个有效店铺
    }[];
  };
}

/* ---------------------------------------------------------------------------
 * upload-meta.json -> UploadLog[]
 * ------------------------------------------------------------------------- */

export interface UploadLogExample {
  path: string; // /api/files/uploads/xxx.webp
  userId: string;
  shopId?: string;
  kind: "shop-cover" | "shop-menu" | "shop-scene" | "shop-dish" | "ad-promo" | "review";
  createdAt: string;
}

/* ---------------------------------------------------------------------------
 * 常见数据操作示例（伪代码）
 * ------------------------------------------------------------------------- */

// 新增店铺：readJsonFile<Shop[]>("shops.json") -> push -> writeJsonFile
// 审核通过：shops[i].listingStatus = "approved" -> write
// 新评价（先审后发）：visible=false, reviewModeration="pending"
// 备份：整个 data/ 复制到 {EATMAP_BACKUP_DIR}/latest（源码见 src/lib/user-data-backup.ts）
