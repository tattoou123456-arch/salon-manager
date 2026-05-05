"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  List,
  Calculator,
  Receipt,
} from "lucide-react";

const nav = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/import", label: "データ取込", icon: Upload },
  { href: "/sales", label: "売上一覧", icon: List },
  { href: "/commission", label: "歩合計算", icon: Calculator },
  { href: "/tax", label: "税務サマリー", icon: Receipt },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-gray-200">
        <p className="text-xs text-gray-400 font-medium tracking-wider uppercase">Salon</p>
        <h1 className="text-lg font-bold text-gray-900 leading-tight">管理システム</h1>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">salonanser 連携対応</p>
      </div>
    </aside>
  );
}
