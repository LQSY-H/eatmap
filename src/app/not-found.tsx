import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-1 flex-col justify-center px-4 py-16 text-center">
      <p className="text-sm font-medium text-amber-700">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-amber-950">找不到这一页</h1>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-amber-900/75">
        你访问的页面可能已被移动或删除。可以回到首页继续逛店，或打开室内地图找档口。
      </p>
      <div className="mt-10 flex justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-amber-700/20 transition hover:bg-amber-700"
        >
          返回首页
        </Link>
        <Link
          href="/map"
          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-amber-950 ring-1 ring-amber-900/15 transition hover:bg-amber-50"
        >
          打开地图
        </Link>
      </div>
    </main>
  );
}
