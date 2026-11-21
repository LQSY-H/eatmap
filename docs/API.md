# API 参考

所有接口位于 `src/app/api/**/route.ts`（Next.js App Router Route Handlers）。
除特别注明外，请求/响应均为 JSON；鉴权使用 Cookie 会话 `eatmap_session`（HttpOnly，7 天）。

- 成功：`200` / `201`，返回业务对象。
- 失败：`4xx`，返回 `{ "error": "<code>" }`；常见 code 见各接口说明。
- 浏览器端调用时必须使用 `eatmapUrl("/api/...")` 以兼容 `basePath`。
- 服务端代码直接调用 `src/lib/*`，不必绕 HTTP。

---

## 认证 `/api/auth`

| 方法 | 路径 | 权限 | 请求体 | 说明 |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | 公开 | `{ login, password }` | `login` 可为邮箱、手机号或登录名。错误：`invalid_body`、`invalid_credentials` |
| POST | `/api/auth/logout` | 登录 | — | 清除会话 Cookie |
| GET | `/api/auth/me` | 公开 | — | `{ user: PublicUser \| null, impersonator: PublicUser \| null }` |
| PATCH | `/api/auth/me` | 登录 | `{ nickname }` | 修改昵称；`nickname_taken`、`nickname_too_long` |
| POST | `/api/auth/register-student` | 公开 | `{ email, nickname, password, confirm }` | 邮箱注册普通用户；`email_taken`、`nickname_taken`、`password_short`、`invalid_email` |
| POST | `/api/auth/register-merchant` | 公开 | `{ phone, nickname, password, confirm }` | 手机号注册商户；`phone_taken`、`invalid_phone` |
| POST | `/api/auth/impersonate` | super_admin | `{ userId }` | 以目标账号身份预览（JWT 写入 `imp`）；目标不能是超管 |
| POST | `/api/auth/stop-impersonating` | 登录 | — | 结束身份预览，回到真实账号 |

## 店铺 `/api/shops`

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/shops` | 公开 | 管理员/超管返回全部（含未上架）；访客仅返回已上架店铺（`publicShopView`） |
| POST | `/api/shops` | 登录 | 商户：每家仅能创建 1 家，`listingStatus="pending"`；超管可创建并可指定 owner。错误：`invalid_body`、`bad_building`、`bad_floor`、`invalid_avg_price`、`already_has_shop` |
| GET | `/api/shops/mine` | 商户 | 我绑定的店铺 |
| GET | `/api/shops/{id}` | 公开/店主/管理 | 未上架店铺仅店主与管理员可见 |
| PATCH | `/api/shops/{id}` | 店主/管理 | 局部更新：名称、人均、简介、位置、联系方式、封面、菜品；管理员可改标签/图库/审核状态/对外展示；超管可改 `ownerUserId`。图库字段仅管理员可改（走 gallery 接口） |
| DELETE | `/api/shops/{id}` | 管理 | 级联删除该店评价、广告、地图铺位 |

## 图库 `/api/shops/{id}/gallery`

| 方法 | 权限 | 请求体 | 说明 |
| --- | --- | --- | --- |
| POST | 店主/管理 | `{ kind: "menu"\|"scene", url }` | 追加图片。审核模式 `pre` 时商户提交为 `pending`；管理员/超管直接 `approved` |
| PATCH | 管理 | `{ kind, url, status }` | 修改单张图状态：`pending` / `approved` / `rejected` |
| DELETE | 管理 | `{ kind, url }` | 删除单张图记录 |

> 图片需先经 `POST /api/upload` 上传拿到 `url`。

## 评价 `/api/reviews`

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/reviews?shopId=` | 公开 | 店铺评价（仅 visible）；店主可看本店全部 |
| GET | `/api/reviews?mine=1` | 登录 | 我的评价 |
| GET | `/api/reviews?forMerchant=1` | 商户 | 本店全部评价 |
| GET | `/api/reviews?admin=1` | 管理 | 全部评价（含隐藏/待审） |
| POST | `/api/reviews` | 公开（游客可评，见下） | `{ shopId, userName, rating, content, userId?, images?, perPersonSpend? }`。先审后发模式下 `visible=false, reviewModeration="pending"`；返回 `{ review, reviewModerationMode, requiresReviewApproval }` |
| PATCH | `/api/reviews/{id}` | 商户/管理 | `{ action:"request_hide" }` 商户申请隐藏；`{ action:"reject_hide_request" }` 管理员拒绝；`{ visible: boolean }` 管理员显示/隐藏 |
| DELETE | `/api/reviews/{id}` | 本人/管理 | 删除评价 |

> 评价接口对游客开放（`userId` 缺省为 `guest`），这是原产品行为；若公开运营，建议改为强制登录（修改 `POST` 中的 `userId` 逻辑即可）。

## 建筑 / 楼层 / 地图

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET/POST | `/api/buildings` | 读公开 / 管理 | POST `{ name }`：按名称复用或新建（`sortOrder` 自动递增） |
| PATCH/DELETE | `/api/buildings/{id}` | 管理 | 改名/排序/删除（注意关联数据由前端处理） |
| POST | `/api/buildings/reorder` | 管理 | 批量调整顺序，body 见路由文件 |
| GET/POST | `/api/floors` | 读公开 / 管理 | POST 新建楼层 `{ buildingId, name, width, height, ... }` |
| PATCH/DELETE | `/api/floors/{id}` | 管理 | 更新/删除楼层 |
| GET | `/api/map-shapes` | 公开 | 全部铺位 |
| POST | `/api/map-shapes` | 管理 | `{ floorId, shapes: MapShape[] }` 整体替换该楼层铺位 |

## 广告 / 首页推荐（免费）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/ads` | 登录 | 管理员全部；商户仅本店；其他 403 |
| POST | `/api/ads` | 商户 | `{ shopId, title(≤14字), slot:"home_featured", startDate, endDate, promoImage? }`；日期为上海时区 `YYYY-MM-DD`，开始日不得早于今天，跨度 ≤90 天；新条目 `status="pending"`。**无任何价格字段** |
| DELETE | `/api/ads?id=` | 商户 | 撤回自己店铺「待审核」的申请 |
| PATCH | `/api/ads` | 管理 | `{ id, status }` 审核（`approved` / `rejected` / `pending`） |

## 站点配置 `/api/site-settings`

| 方法 | 权限 | 说明 |
| --- | --- | --- |
| GET | 公开 | 返回 `merchantFeedPromoEnabled, feedAnnouncementStripEnabled, galleryModerationMode, reviewModerationMode, feedAnnouncementStrip` |
| PATCH | 管理 | 局部更新上述字段；公告条目需关联有效店铺（`invalid_announcement_shop`） |

## 标签 `/api/tags`

| 方法 | 权限 | 说明 |
| --- | --- | --- |
| GET | 公开 | 标签字符串数组 |
| PUT | super_admin | `{ tags: string[] }` 去重后整体覆盖 |

## 上传与文件

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/upload` | 登录 | `multipart/form-data`：`file`（≤12MB）、`purpose`、`shopId`。返回 `{ url }`。purpose：`shop-cover/shop-menu/shop-scene/shop-dish/ad-promo/review` |
| GET | `/api/files/uploads/{name}.webp` | 公开 | 图片内容，`Cache-Control: immutable`，带路径穿越保护 |

## 用户管理

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/users?q=` | 管理 | 搜索用户（昵称/邮箱/手机号/登录名） |
| PATCH | `/api/users/{id}` | super_admin | `{ role }`，仅允许 `admin/user/merchant`，不能修改超管 |
| DELETE | `/api/users/{id}` | super_admin | 删除账号（不能删自己/超管），并解绑其店铺 |
| POST/PATCH | `/api/users/{id}/password` | super_admin | 重置指定用户密码 |

## 我的标记

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET/PATCH/POST | `/api/me/shop-marks` | 登录 | 收藏 / 想吃 标记的读写 |
| GET/PATCH | `/api/me/map-editor-prefs` | 管理 | 地图编辑器个人偏好（默认铺位尺寸） |

## 备份

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/admin/user-data-backup` | 管理 | 立即把 `data/` 备份到 `{EATMAP_BACKUP_DIR}/latest/` |

---

## 错误码速查

| code | HTTP | 含义 |
| --- | --- | --- |
| `unauthorized` | 401 | 未登录 |
| `forbidden` | 403 | 角色/归属不足 |
| `invalid_body` | 400 | 必填缺失或类型错误 |
| `not_found` | 404 | 目标不存在 |
| `nickname_taken` / `email_taken` / `phone_taken` | 409 | 唯一性冲突 |
| `invalid_credentials` | 401 | 登录失败 |
| `password_short` / `password_mismatch` | 400 | 注册密码问题 |
| `shop_not_listed` | 403 | 店铺未上架，禁止评价 |
| `immutable` | 400 | 不能修改/删除超管 |
| `cannot_delete_self` | 400 | 不能删除自己 |
| `too_large` | 400 | 上传超过 12MB |
| `invalid_price` | — | 已随付费广告一并移除 |
