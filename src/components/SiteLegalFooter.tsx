/**
 * 站点底部版权信息。
 * 开源模板默认不写备案号 / 运营主体 / 个人域名；部署方请按当地法规与自身主体信息替换。
 */
export function SiteLegalFooter() {
  return (
    <footer className="border-t border-amber-900/10 bg-gradient-to-b from-transparent to-amber-50/40">
      <div className="mx-auto max-w-6xl px-4 py-10 max-md:py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs tabular-nums text-amber-900/70 max-md:text-[11px]">
            Copyright © {new Date().getFullYear()} eatMap · 食图
          </p>
          <p className="text-[11px] leading-relaxed text-amber-900/55 max-md:text-[10px]">
            本平台为开源校园餐饮信息导引项目。备案号、运营主体与联系方式请部署方自行补充。
          </p>
        </div>
      </div>
    </footer>
  );
}
