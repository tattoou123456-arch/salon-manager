"use client";

import { useEffect, useState } from "react";
import { getSales, getCommissions, saveCommissions, StaffCommission } from "@/lib/store";
import { Save, ChevronDown } from "lucide-react";

function fmt(n: number) { return n.toLocaleString("ja-JP") + "円"; }

export default function CommissionPage() {
  const [commissions, setCommissions] = useState<StaffCommission[]>([]);
  const [staffSales, setStaffSales] = useState<Record<string, number>>({});
  const [filterMonth, setFilterMonth] = useState("all");
  const [monthList, setMonthList] = useState<string[]>(["all"]);
  const [allSales, setAllSales] = useState<{ staff: string; date: string; amount: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSales(), getCommissions()]).then(([sales, savedCommissions]) => {
      setAllSales(sales);
      const months = ["all", ...Array.from(new Set(sales.map((s) => s.date.slice(0, 7)))).sort().reverse()];
      setMonthList(months);
      const staffSet = Array.from(new Set(sales.map((s) => s.staff)));
      const merged = staffSet.map((name) => savedCommissions.find((c) => c.staffName === name) ?? { staffName: name, rate: 40 });
      setCommissions(merged);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const filtered = filterMonth === "all" ? allSales : allSales.filter((s) => s.date.startsWith(filterMonth));
    const map: Record<string, number> = {};
    filtered.forEach((s) => { map[s.staff] = (map[s.staff] ?? 0) + s.amount; });
    setStaffSales(map);
  }, [filterMonth, allSales]);

  const rows = commissions.map((c) => {
    const saleAmount = staffSales[c.staffName] ?? 0;
    return { ...c, saleAmount, commissionAmount: Math.floor(saleAmount * (c.rate / 100)) };
  });

  const handleSave = async () => {
    setSaving(true);
    await saveCommissions(commissions);
    setSaving(false);
    alert("歩合率を保存しました");
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">読み込み中...</div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">歩合計算</h2>
          <p className="text-sm text-gray-500 mt-1">スタッフごとの歩合率を設定して給与を計算します</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60">
          <Save size={16} />{saving ? "保存中..." : "歩合率を保存"}
        </button>
      </div>

      <div className="mb-5">
        <div className="relative inline-block">
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer">
            {monthList.map((m) => <option key={m} value={m}>{m === "all" ? "全期間" : m}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <p className="text-gray-400 text-sm">売上データを取込むとスタッフ一覧が表示されます</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{["スタッフ", "売上合計", "歩合率", "歩合額"].map((h) => (<th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.staffName} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-900">{row.staffName}</td>
                    <td className="px-5 py-4 text-gray-700">{fmt(row.saleAmount)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} max={100} value={row.rate} onChange={(e) => setCommissions((prev) => prev.map((c) => c.staffName === row.staffName ? { ...c, rate: Number(e.target.value) } : c))} className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                        <span className="text-gray-500 text-sm">%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-indigo-700">{fmt(row.commissionAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-700">合計</td>
                  <td className="px-5 py-3 font-semibold text-gray-900">{fmt(rows.reduce((s, r) => s + r.saleAmount, 0))}</td>
                  <td />
                  <td className="px-5 py-3 font-bold text-indigo-700">{fmt(rows.reduce((s, r) => s + r.commissionAmount, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {rows.map((row) => (
              <div key={row.staffName} className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-sm font-semibold text-gray-700">{row.staffName}</p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">売上</span><span className="font-medium">{fmt(row.saleAmount)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">歩合率</span><span className="font-medium">{row.rate}%</span></div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between text-sm"><span className="text-gray-700 font-medium">歩合額</span><span className="font-bold text-indigo-700">{fmt(row.commissionAmount)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
