"use client";

import { useEffect, useState } from "react";
import { getSales, SaleRecord } from "@/lib/store";
import { Search, ChevronDown } from "lucide-react";

function fmt(n: number) { return n.toLocaleString("ja-JP") + "円"; }

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  useEffect(() => {
    getSales().then((data) => { setSales(data); setLoading(false); });
  }, []);

  const staffList = ["all", ...Array.from(new Set(sales.map((s) => s.staff))).sort()];
  const monthList = ["all", ...Array.from(new Set(sales.map((s) => s.date.slice(0, 7)))).sort().reverse()];

  const filtered = sales.filter((s) => {
    if (filterStaff !== "all" && s.staff !== filterStaff) return false;
    if (filterMonth !== "all" && !s.date.startsWith(filterMonth)) return false;
    if (search && !`${s.staff}${s.menu}${s.date}`.includes(search)) return false;
    return true;
  });

  const total = filtered.reduce((s, r) => s + r.amount, 0);

  if (loading) return <div className="p-8 text-gray-400 text-sm">読み込み中...</div>;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">売上一覧</h2>
        <p className="text-sm text-gray-500 mt-1">{filtered.length}件 / 合計 {fmt(total)}</p>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="スタッフ・メニューで検索" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <SelectFilter value={filterMonth} onChange={setFilterMonth} options={monthList} labels={{ all: "全期間" }} />
        <SelectFilter value={filterStaff} onChange={setFilterStaff} options={staffList} labels={{ all: "全スタッフ" }} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">
            {sales.length === 0 ? "データを取込んでください" : "条件に一致するデータがありません"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{["日付", "担当者", "メニュー", "金額", "税区分", "支払"].map((h) => (<th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600">{r.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.staff}</td>
                    <td className="px-4 py-3 text-gray-700">{r.menu}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(r.amount)}</td>
                    <td className="px-4 py-3"><TaxBadge type={r.taxType} /></td>
                    <td className="px-4 py-3 text-gray-500">{r.payment}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-700">合計</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(total)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectFilter({ value, onChange, options, labels }: { value: string; onChange: (v: string) => void; options: string[]; labels: Record<string, string>; }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer">
        {options.map((opt) => <option key={opt} value={opt}>{labels[opt] ?? opt}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

function TaxBadge({ type }: { type: SaleRecord["taxType"] }) {
  const styles = { "10%": "bg-blue-50 text-blue-600", "軽減8%": "bg-amber-50 text-amber-600", "非課税": "bg-gray-100 text-gray-500" };
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${styles[type]}`}>{type}</span>;
}
