"use client";

import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { addSales, clearSales, getSales, SaleRecord } from "@/lib/store";
import { Upload, CheckCircle, AlertCircle, Trash2, FileSpreadsheet } from "lucide-react";

type ParseResult = { success: true; records: SaleRecord[] } | { success: false; error: string };

function parseExcel(buffer: ArrayBuffer): ParseResult {
  try {
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (rows.length === 0) return { success: false, error: "シートにデータがありません" };

    const colMap = detectColumns(Object.keys(rows[0]));
    const records: SaleRecord[] = rows
      .filter((row) => row[colMap.amount])
      .map((row, i): SaleRecord => {
        const rawDate = row[colMap.date];
        let dateStr = "";
        if (rawDate instanceof Date) {
          dateStr = rawDate.toISOString().slice(0, 10);
        } else if (typeof rawDate === "string") {
          dateStr = rawDate.replace(/\//g, "-").slice(0, 10);
        } else if (typeof rawDate === "number") {
          const d = XLSX.SSF.parse_date_code(rawDate);
          dateStr = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
        }
        const amountRaw = row[colMap.amount];
        const amount = typeof amountRaw === "number" ? amountRaw : parseInt(String(amountRaw).replace(/[^\d]/g, "")) || 0;
        const taxRaw = String(row[colMap.tax] ?? "");
        const taxType: SaleRecord["taxType"] = taxRaw.includes("8") ? "軽減8%" : taxRaw.includes("非") || taxRaw === "" ? "非課税" : "10%";
        return {
          id: `${Date.now()}-${i}`,
          date: dateStr || new Date().toISOString().slice(0, 10),
          staff: String(row[colMap.staff] ?? "不明"),
          menu: String(row[colMap.menu] ?? ""),
          amount,
          taxType,
          payment: String(row[colMap.payment] ?? ""),
        };
      });
    return { success: true, records };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

function detectColumns(keys: string[]) {
  const find = (...candidates: string[]) => keys.find((k) => candidates.some((c) => k.includes(c))) ?? keys[0];
  return {
    date: find("日付", "日時", "date", "Date", "売上日"),
    staff: find("担当", "スタッフ", "staff", "Staff", "スタイリスト", "氏名"),
    menu: find("メニュー", "施術", "menu", "Menu", "サービス", "項目"),
    amount: find("金額", "売上", "amount", "Amount", "価格", "合計"),
    tax: find("税", "tax", "Tax", "消費税"),
    payment: find("支払", "決済", "payment", "Payment"),
  };
}

export default function ImportPage() {
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [currentCount, setCurrentCount] = useState(0);

  useEffect(() => {
    getSales().then((s) => setCurrentCount(s.length));
  }, []);

  const handleFile = useCallback((file: File) => {
    setImported(false);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const buf = e.target?.result as ArrayBuffer;
      setResult(parseExcel(buf));
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    if (!result?.success) return;
    setImporting(true);
    const all = await addSales(result.records);
    setCurrentCount(all.length);
    setImported(true);
    setImporting(false);
  };

  const handleClear = async () => {
    if (!confirm("全データを削除しますか？")) return;
    await clearSales();
    setCurrentCount(0);
    setResult(null);
    setImported(false);
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">データ取込</h2>
        <p className="text-sm text-gray-500 mt-1">salonanserからエクスポートしたExcelファイルをアップロードしてください</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${dragging ? "border-indigo-400 bg-indigo-50" : "border-gray-300 bg-white hover:border-indigo-300"}`}
      >
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <FileSpreadsheet size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="font-medium text-gray-600">Excelファイルをドラッグ＆ドロップ</p>
        <p className="text-sm text-gray-400 mt-1">または クリックしてファイルを選択</p>
        <p className="text-xs text-gray-400 mt-2">.xlsx / .xls / .csv 対応</p>
      </div>

      {result && (
        <div className="mt-6">
          {result.success ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={20} className="text-emerald-500" />
                <p className="font-semibold text-gray-800">{result.records.length}件のデータを読み込みました</p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>{["日付", "担当者", "メニュー", "金額", "税区分", "支払"].map((h) => (<th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>))}</tr>
                  </thead>
                  <tbody>
                    {result.records.slice(0, 5).map((r) => (
                      <tr key={r.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-700">{r.date}</td>
                        <td className="px-3 py-2 text-gray-700">{r.staff}</td>
                        <td className="px-3 py-2 text-gray-700">{r.menu}</td>
                        <td className="px-3 py-2 text-gray-700 text-right">{r.amount.toLocaleString()}円</td>
                        <td className="px-3 py-2"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{r.taxType}</span></td>
                        <td className="px-3 py-2 text-gray-500">{r.payment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.records.length > 5 && <p className="text-xs text-gray-400 px-3 py-2 border-t border-gray-100">… 他 {result.records.length - 5}件</p>}
              </div>
              {imported ? (
                <div className="mt-4 flex items-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle size={18} />
                  <span>取込完了（累計 {currentCount}件）</span>
                </div>
              ) : (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="mt-4 bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  <Upload size={16} />
                  {importing ? "取込中..." : `${result.records.length}件を取込む`}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">読み込みエラー</p>
                <p className="text-sm text-red-600 mt-1">{result.error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {currentCount > 0 && (
        <div className="mt-6 flex items-center justify-between bg-gray-100 rounded-xl px-5 py-3">
          <p className="text-sm text-gray-600">現在のデータ件数：<span className="font-bold text-gray-900">{currentCount}件</span></p>
          <button onClick={handleClear} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors">
            <Trash2 size={14} />全データ削除
          </button>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-sm font-semibold text-blue-700 mb-2">salonanserからのエクスポート方法</p>
        <ol className="text-sm text-blue-600 space-y-1 list-decimal list-inside">
          <li>salonanser管理画面 → レポート / 売上集計</li>
          <li>対象期間を選択</li>
          <li>「Excel出力」または「CSV出力」をクリック</li>
          <li>ダウンロードしたファイルをここにドロップ</li>
        </ol>
      </div>
    </div>
  );
}
