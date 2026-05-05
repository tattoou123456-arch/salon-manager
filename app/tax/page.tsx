"use client";

import { useEffect, useState } from "react";
import { getSales, SaleRecord } from "@/lib/store";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChevronDown, Download } from "lucide-react";

function fmt(n: number) { return n.toLocaleString("ja-JP") + "円"; }

const TAX_RATES: Record<SaleRecord["taxType"], number> = { "10%": 0.1, "軽減8%": 0.08, "非課税": 0 };
const TAX_COLORS: Record<SaleRecord["taxType"], string> = { "10%": "#6366f1", "軽減8%": "#f59e0b", "非課税": "#9ca3af" };

type TaxSummary = { type: SaleRecord["taxType"]; netAmount: number; taxAmount: number; total: number; count: number };

export default function TaxPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  useEffect(() => {
    getSales().then((data) => { setSales(data); setLoading(false); });
  }, []);

  const years = ["all", ...Array.from(new Set(sales.map((s) => s.date.slice(0, 4)))).sort().reverse()];
  const months = ["all", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

  const filtered = sales.filter((s) => {
    if (filterYear !== "all" && !s.date.startsWith(filterYear)) return false;
    if (filterMonth !== "all" && s.date.slice(5, 7) !== filterMonth) return false;
    return true;
  });

  const summaryMap: Record<string, TaxSummary> = {
    "10%": { type: "10%", netAmount: 0, taxAmount: 0, total: 0, count: 0 },
    "軽減8%": { type: "軽減8%", netAmount: 0, taxAmount: 0, total: 0, count: 0 },
    "非課税": { type: "非課税", netAmount: 0, taxAmount: 0, total: 0, count: 0 },
  };

  filtered.forEach((s) => {
    const rate = TAX_RATES[s.taxType];
    const net = Math.round(s.amount / (1 + rate));
    summaryMap[s.taxType].netAmount += net;
    summaryMap[s.taxType].taxAmount += s.amount - net;
    summaryMap[s.taxType].total += s.amount;
    summaryMap[s.taxType].count += 1;
  });

  const summaries = Object.values(summaryMap);
  const grandTotal = summaries.reduce((s, r) => s + r.total, 0);
  const grandTax = summaries.reduce((s, r) => s + r.taxAmount, 0);
  const grandNet = summaries.reduce((s, r) => s + r.netAmount, 0);

  const monthlyTax: Record<string, number> = {};
  filtered.forEach((s) => {
    const m = s.date.slice(0, 7);
    const rate = TAX_RATES[s.taxType];
    const net = Math.round(s.amount / (1 + rate));
    monthlyTax[m] = (monthlyTax[m] ?? 0) + (s.amount - net);
  });
  const chartData = Object.entries(monthlyTax).sort(([a], [b]) => a.localeCompare(b)).map(([month, tax]) => ({ month: month.replace(/^\d{4}-/, ""), tax }));

  const handleCSV = () => {
    const rows = [
      ["税区分", "件数", "税込合計", "税抜合計", "消費税額"],
      ...summaries.map((s) => [s.type, s.count, s.total, s.netAmount, s.taxAmount]),
      ["合計", filtered.length, grandTotal, grandNet, grandTax],
    ];
    const blob = new Blob(["﻿" + rows.map((r) => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `税務サマリー_${filterYear}_${filterMonth}.csv`;
    a.click();
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">読み込み中...</div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">税務サマリー</h2>
          <p className="text-sm text-gray-500 mt-1">消費税区分別の集計・申告用データ</p>
        </div>
        <button onClick={handleCSV} className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <Download size={16} />CSVエクスポート
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <FilterSelect value={filterYear} onChange={setFilterYear} options={years} labels={{ all: "全年度" }} suffix="" />
        <FilterSelect value={filterMonth} onChange={setFilterMonth} options={months} labels={{ all: "全月" }} suffix="月" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <p className="text-gray-400 text-sm">売上データを取込むと税務サマリーが表示されます</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <SummaryCard label="税込売上合計" value={fmt(grandTotal)} sub={`${filtered.length}件`} accent />
            <SummaryCard label="税抜売上合計" value={fmt(grandNet)} />
            <SummaryCard label="消費税合計" value={fmt(grandTax)} highlight />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{["税区分", "件数", "税込合計", "税抜合計", "消費税額", "割合"].map((h) => (<th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summaries.map((s) => (
                  <tr key={s.type} className="hover:bg-gray-50">
                    <td className="px-5 py-4"><span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: TAX_COLORS[s.type] + "20", color: TAX_COLORS[s.type] }}>{s.type}</span></td>
                    <td className="px-5 py-4 text-gray-600">{s.count}件</td>
                    <td className="px-5 py-4 font-medium text-gray-900">{fmt(s.total)}</td>
                    <td className="px-5 py-4 text-gray-700">{fmt(s.netAmount)}</td>
                    <td className="px-5 py-4 font-medium text-red-600">{fmt(s.taxAmount)}</td>
                    <td className="px-5 py-4 text-gray-500">{grandTotal > 0 ? ((s.total / grandTotal) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="px-5 py-3 font-bold text-gray-900">合計</td>
                  <td className="px-5 py-3 font-semibold">{filtered.length}件</td>
                  <td className="px-5 py-3 font-bold">{fmt(grandTotal)}</td>
                  <td className="px-5 py-3 font-bold">{fmt(grandNet)}</td>
                  <td className="px-5 py-3 font-bold text-red-600">{fmt(grandTax)}</td>
                  <td className="px-5 py-3">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {chartData.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">月別消費税額推移</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
                  <Tooltip formatter={(v) => [fmt(Number(v)), "消費税"]} />
                  <Bar dataKey="tax" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill="#6366f1" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options, labels, suffix }: { value: string; onChange: (v: string) => void; options: string[]; labels: Record<string, string>; suffix: string }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer">
        {options.map((opt) => <option key={opt} value={opt}>{labels[opt] ?? opt + suffix}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

function SummaryCard({ label, value, sub, accent, highlight }: { label: string; value: string; sub?: string; accent?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200"}`}>
      <p className={`text-xs font-medium ${accent ? "text-indigo-200" : "text-gray-500"}`}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? "text-red-600" : accent ? "text-white" : "text-gray-900"}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? "text-indigo-200" : "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}
