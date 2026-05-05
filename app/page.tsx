"use client";

import { useEffect, useState } from "react";
import { getSales, SaleRecord } from "@/lib/store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, Scissors, Calendar } from "lucide-react";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("ja-JP") + "円";
}

export default function DashboardPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSales().then((data) => { setSales(data); setLoading(false); });
  }, []);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlySales = sales.filter((s) => s.date.startsWith(thisMonth));
  const totalAmount = monthlySales.reduce((s, r) => s + r.amount, 0);

  const staffMap: Record<string, number> = {};
  monthlySales.forEach((r) => { staffMap[r.staff] = (staffMap[r.staff] ?? 0) + r.amount; });
  const staffData = Object.entries(staffMap).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);

  const monthlyMap: Record<string, number> = {};
  sales.forEach((r) => { const m = r.date.slice(0, 7); monthlyMap[m] = (monthlyMap[m] ?? 0) + r.amount; });
  const monthlyData = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, amount]) => ({ month: month.replace(/^\d{4}-/, ""), amount }));

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
        <p className="text-sm text-gray-500 mt-1">{now.getFullYear()}年{now.getMonth() + 1}月の概況</p>
      </div>

      {sales.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <Scissors size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">まだデータがありません</p>
          <p className="text-sm text-gray-400 mt-1">salonanserからExcelをエクスポートして取り込みましょう</p>
          <Link href="/import" className="mt-4 inline-block bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            データを取込む
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StatCard icon={<TrendingUp size={20} />} label="今月の売上" value={fmt(totalAmount)} color="indigo" />
            <StatCard icon={<Users size={20} />} label="スタッフ数" value={`${Object.keys(staffMap).length}名`} color="emerald" />
            <StatCard icon={<Calendar size={20} />} label="今月の件数" value={`${monthlySales.length}件`} color="amber" />
            <StatCard icon={<Scissors size={20} />} label="総売上件数" value={`${sales.length}件`} color="rose" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">月別売上推移</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
                  <Tooltip formatter={(v: number) => [fmt(v), "売上"]} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">今月のスタッフ別売上</h3>
              {staffData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">今月のデータなし</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={staffData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
                    <Tooltip formatter={(v: number) => [fmt(v), "売上"]} />
                    <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: "indigo" | "emerald" | "amber" | "rose"; }) {
  const colors = { indigo: "bg-indigo-50 text-indigo-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-600" };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className={`inline-flex p-2 rounded-lg ${colors[color]} mb-3`}>{icon}</div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
