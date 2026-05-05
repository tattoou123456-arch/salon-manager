"use client";

import { supabase } from "./supabase";

export type SaleRecord = {
  id: string;
  date: string;
  staff: string;
  menu: string;
  amount: number;
  taxType: "10%" | "軽減8%" | "非課税";
  payment: string;
};

export type StaffCommission = {
  staffName: string;
  rate: number;
};

type SaleRow = {
  id: string;
  date: string;
  staff: string;
  menu: string;
  amount: number;
  tax_type: string;
  payment: string;
};

function toSale(row: SaleRow): SaleRecord {
  return {
    id: row.id,
    date: row.date,
    staff: row.staff,
    menu: row.menu ?? "",
    amount: row.amount,
    taxType: row.tax_type as SaleRecord["taxType"],
    payment: row.payment ?? "",
  };
}

export async function getSales(): Promise<SaleRecord[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("date", { ascending: false });
  if (error) { console.error(error); return []; }
  return (data as SaleRow[]).map(toSale);
}

export async function addSales(records: SaleRecord[]): Promise<SaleRecord[]> {
  const rows = records.map((r) => ({
    id: r.id,
    date: r.date,
    staff: r.staff,
    menu: r.menu,
    amount: r.amount,
    tax_type: r.taxType,
    payment: r.payment,
  }));
  const { error } = await supabase.from("sales").upsert(rows);
  if (error) console.error(error);
  return getSales();
}

export async function clearSales(): Promise<void> {
  await supabase.from("sales").delete().neq("id", "");
}

export async function getCommissions(): Promise<StaffCommission[]> {
  const { data, error } = await supabase.from("commissions").select("*");
  if (error) { console.error(error); return []; }
  return (data ?? []).map((r: { staff_name: string; rate: number }) => ({
    staffName: r.staff_name,
    rate: r.rate,
  }));
}

export async function saveCommissions(commissions: StaffCommission[]): Promise<void> {
  const rows = commissions.map((c) => ({ staff_name: c.staffName, rate: c.rate }));
  const { error } = await supabase.from("commissions").upsert(rows);
  if (error) console.error(error);
}
