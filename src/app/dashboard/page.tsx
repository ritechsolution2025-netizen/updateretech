"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Eye, EyeOff, Plus, Users, FileText, IndianRupee, 
  PieChart, CheckCircle2, TrendingUp, AlertTriangle, 
  Clock, Check, Calendar, ArrowRight, Package
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Investment { id: string; description: string; amount: number; date: string; }

interface Invoice {
  id: string;
  invoice_no: string;
  customer: string;
  mobile: string;
  gender: string;
  service: string;
  price: number;
  discount: number;
  final: number;
  payment_mode: string;
  payment_status: string;
  date: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  reorder_level: number;
  unit: string;
}

export default function Dashboard() {
  const [showValues, setShowValues] = useState(false);

  const [invoices, setInvoices, invoicesLoaded] = useLocalStorage<Invoice[]>("ritech_invoices", []);
  const [expenses, , expensesLoaded]     = useLocalStorage<any[]>("ritech_expenses", []);
  const [notes, setNotes, notesLoaded]   = useLocalStorage<any[]>("ritech_notes", []);
  const [investments, , investLoaded]    = useLocalStorage<Investment[]>("ritech_investments", []);
  const [inventory, , inventoryLoaded]   = useLocalStorage<InventoryItem[]>("ritech_inventory", []);

  // Standard profit/loss stats
  const totalRevenue   = useMemo(() => invoices.reduce((s, i) => s + (Number(i.final) || 0), 0), [invoices]);
  const totalExpenses  = useMemo(() => expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0), [expenses]);
  const totalInvested  = useMemo(() => investments.reduce((s, i) => s + (Number(i.amount) || 0), 0), [investments]);
  const netProfit      = totalRevenue - totalExpenses;

  // Chart data
  const chartData = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; expenses: number }> = {};
    invoices.forEach(inv => {
      if (!inv.date) return;
      const key = (inv.date.split("T")[0] || inv.date.split(" ")[0]).substring(0, 7);
      if (!map[key]) map[key] = { name: key, revenue: 0, expenses: 0 };
      map[key].revenue += Number(inv.final) || 0;
    });
    expenses.forEach(exp => {
      if (!exp.date) return;
      const key = exp.date.substring(0, 7);
      if (!map[key]) map[key] = { name: key, revenue: 0, expenses: 0 };
      map[key].expenses += Number(exp.amount) || 0;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name)).slice(-6);
  }, [invoices, expenses]);

  // 💰 Daily Cash Summary (Today's metrics)
  const dailySummary = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD local

    const todayInvoices = invoices.filter(inv => inv.date && inv.date.startsWith(todayStr));
    const todayExpenses = expenses.filter(exp => exp.date && exp.date.startsWith(todayStr));

    const cashReceived = todayInvoices
      .filter(inv => inv.payment_mode === "Cash" && inv.payment_status === "Paid")
      .reduce((s, inv) => s + (inv.final || 0), 0);

    const upiReceived = todayInvoices
      .filter(inv => inv.payment_mode === "UPI" && inv.payment_status === "Paid")
      .reduce((s, inv) => s + (inv.final || 0), 0);

    const onlineReceived = todayInvoices
      .filter(inv => inv.payment_mode === "Online" && inv.payment_status === "Paid")
      .reduce((s, inv) => s + (inv.final || 0), 0);

    const expensesToday = todayExpenses.reduce((s, exp) => s + (Number(exp.amount) || 0), 0);

    const totalCollectedToday = cashReceived + upiReceived + onlineReceived;
    const closingBalance = totalCollectedToday - expensesToday;

    return {
      cashReceived,
      upiReceived,
      onlineReceived,
      totalCollectedToday,
      expensesToday,
      closingBalance
    };
  }, [invoices, expenses]);

  // ⏰ Pending Payments
  const pendingInvoices = useMemo(() => {
    return invoices.filter(inv => inv.payment_status === "Pending");
  }, [invoices]);

  const totalPendingAmount = useMemo(() => {
    return pendingInvoices.reduce((s, inv) => s + (inv.final || 0), 0);
  }, [pendingInvoices]);

  // 🔔 Overdue Invoices Alert (Pending & > 3 days old)
  const overdueInvoices = useMemo(() => {
    const todayMs = new Date().getTime();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return invoices.filter(inv => {
      if (inv.payment_status !== "Pending" || !inv.date) return false;
      const invDateMs = new Date(inv.date).getTime();
      return (todayMs - invDateMs) > threeDaysMs;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [invoices]);

  // 📦 Low Stock Inventory Items Alert
  const lowStockItems = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter(item => item.quantity <= item.reorder_level);
  }, [inventory]);

  const fmt = (v: number) => showValues ? `₹ ${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹ ***";
  const fmtRaw = (v: number) => `₹ ${v.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

  const pendingNotes      = notes.filter(n => n.status === "Pending");
  const highPriorityNotes = pendingNotes.filter(n => n.priority === "High");

  const completeNote = (id: string | number) =>
    setNotes(prev => (prev as any[]).map(n => n.id === id ? { ...n, status: "Completed", completed_date: new Date().toISOString() } : n));

  const handleMarkAsPaid = (invId: string) => {
    if (confirm("Mark this invoice as Paid?")) {
      setInvoices(prev => (prev as Invoice[]).map(inv => inv.id === invId ? { ...inv, payment_status: "Paid" } : inv));
    }
  };

  if (!invoicesLoaded || !expensesLoaded || !notesLoaded || !investLoaded || !inventoryLoaded) {
    return <div className="flex h-full items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">📊 Dashboard Overview</h1>
        <button
          onClick={() => setShowValues(!showValues)}
          className="bg-[#2a2a3b] border border-[var(--panel-border)] text-gray-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          {showValues ? <EyeOff size={14} /> : <Eye size={14} />} {showValues ? "Hide Prices" : "Show Prices"}
        </button>
      </div>

      {/* ── Low Stock Alert Banner ── */}
      {lowStockItems.length > 0 && (
        <div className="bg-[#2e1a00] border border-[var(--warning)] rounded-2xl p-4 text-[var(--warning)] flex items-start gap-3">
          <AlertTriangle className="shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-bold text-sm">📦 कमी स्टॉक अलर्ट (Low Stock Warning)</p>
            <p className="text-xs text-gray-400 mt-1">
              खालील वस्तूंचा साठा कमी झाला आहे:{" "}
              <span className="text-white font-semibold">
                {lowStockItems.map(i => `${i.name} (${i.quantity} ${i.unit} शिल्लक)`).join(", ")}
              </span>
            </p>
            <Link href="/dashboard/inventory" className="text-xs text-[var(--accent)] font-semibold mt-2 inline-flex items-center gap-1 hover:underline">
              Inventory वर जा <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}

      {/* ── Overdue Alerts Section ── */}
      {overdueInvoices.length > 0 && (
        <div className="bg-[#3d1c1c] border border-[var(--error)] rounded-2xl p-4 text-[#ff8888]">
          <div className="flex items-center gap-2 font-bold mb-2">
            <AlertTriangle className="text-[var(--error)]" size={20} />
            <span>Overdue Payment Alerts ({overdueInvoices.length} Invoices Pending &gt; 3 Days)</span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {overdueInvoices.map(inv => {
              const days = Math.floor((new Date().getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-black/35 border border-red-950 p-3 rounded-xl gap-2">
                  <div className="text-xs">
                    <span className="font-mono text-[var(--accent)] font-semibold">{inv.invoice_no}</span>
                    <span className="text-white font-medium ml-2">{inv.customer}</span>
                    <span className="text-gray-400 ml-2">({inv.service})</span>
                    <span className="text-red-400 ml-2 font-semibold">• Unpaid for {days} days</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[var(--error)] font-mono">{fmtRaw(inv.final)}</span>
                    <button
                      onClick={() => handleMarkAsPaid(inv.id)}
                      className="bg-[#1a3a1a] hover:bg-[#225022] text-[var(--success)] font-bold text-[10px] py-1 px-3 rounded-lg flex items-center gap-1 border border-green-900/50 transition-colors"
                    >
                      <Check size={10} /> Mark Paid
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left col ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* 4 Stat Cards */}
          <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-5 relative">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
              <div className="bg-[#1a2e1a] border border-green-900/40 p-4 rounded-xl text-center">
                <p className="text-xs text-gray-400 mb-1">💰 Revenue</p>
                <p className="text-lg font-bold text-[var(--success)]">{fmt(totalRevenue)}</p>
              </div>
              <div className="bg-[#2e1a1a] border border-red-900/40 p-4 rounded-xl text-center">
                <p className="text-xs text-gray-400 mb-1">💸 Expenses</p>
                <p className="text-lg font-bold text-[var(--error)]">{fmt(totalExpenses)}</p>
              </div>
              <div className={`p-4 rounded-xl text-center border ${netProfit >= 0 ? "bg-[#1a2e1a] border-green-900/40" : "bg-[#2e1a1a] border-red-900/40"}`}>
                <p className="text-xs text-gray-400 mb-1">📈 Profit</p>
                <p className={`text-lg font-bold ${netProfit >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>{fmt(netProfit)}</p>
              </div>
              <div className="bg-[#1a1a2e] border border-blue-900/40 p-4 rounded-xl text-center">
                <p className="text-xs text-gray-400 mb-1">💎 Investment</p>
                <p className="text-lg font-bold text-[#60a5fa]">{fmt(totalInvested)}</p>
              </div>
            </div>
          </div>

          {/* Today's Cash Summary + Pending Payments Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Daily Cash Summary */}
            <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-2.5">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  💵 Today&apos;s Summary
                </h3>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-800/40">
                  {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#1a1a2e] p-2.5 rounded-xl border border-[var(--panel-border)]">
                  <span className="text-gray-400 block mb-0.5">Cash Recv</span>
                  <span className="font-semibold text-white">{fmtRaw(dailySummary.cashReceived)}</span>
                </div>
                <div className="bg-[#1a1a2e] p-2.5 rounded-xl border border-[var(--panel-border)]">
                  <span className="text-gray-400 block mb-0.5">📱 UPI Recv</span>
                  <span className="font-semibold text-white">{fmtRaw(dailySummary.upiReceived)}</span>
                </div>
                <div className="bg-[#1a1a2e] p-2.5 rounded-xl border border-[var(--panel-border)] col-span-2">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="text-gray-400 block mb-0.5">💸 Today Expenses</span>
                      <span className="font-semibold text-[var(--error)]">{fmtRaw(dailySummary.expensesToday)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 block mb-0.5">Closing Balance</span>
                      <span className={`font-bold ${dailySummary.closingBalance >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                        {fmtRaw(dailySummary.closingBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Payments Widget */}
            <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-2.5 mb-3">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    ⏳ Pending Payments
                  </h3>
                  <span className="text-[10px] bg-amber-950 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-800/40">
                    {pendingInvoices.length} pending
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[85px] overflow-y-auto pr-0.5 mb-2">
                  {pendingInvoices.slice(0, 2).map(inv => (
                    <div key={inv.id} className="flex items-center justify-between bg-[#1a1a2e] border border-[var(--panel-border)] p-2 rounded-xl text-xs">
                      <div className="truncate max-w-[120px]">
                        <span className="font-bold text-white block truncate">{inv.customer}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{inv.invoice_no}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--warning)] font-mono">{fmtRaw(inv.final)}</span>
                        <button
                          onClick={() => handleMarkAsPaid(inv.id)}
                          className="bg-[#1a3a1a] hover:bg-[#225022] text-[var(--success)] p-1 rounded-lg border border-green-900/50"
                          title="Mark Paid"
                        >
                          <Check size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingInvoices.length === 0 && (
                    <p className="text-center text-xs text-gray-500 py-4">No pending payments! 🎉</p>
                  )}
                </div>
              </div>

              {pendingInvoices.length > 0 && (
                <div className="flex justify-between items-center text-xs pt-1 border-t border-[var(--panel-border)] mt-1">
                  <span className="text-gray-400">Total Pending:</span>
                  <span className="font-bold text-[var(--warning)] font-mono">{fmtRaw(totalPendingAmount)}</span>
                </div>
              )}
            </div>

          </div>

          {/* Quick Actions */}
          <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-3">🚀 Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {[
                { href: "/dashboard/invoice",    icon: <Plus size={20} className="text-[var(--accent)]" />,    label: "New Invoice" },
                { href: "/dashboard/appointments",icon: <Calendar size={20} className="text-[#38bdf8]" />,     label: "Appointments" },
                { href: "/dashboard/inventory",   icon: <Package size={20} className="text-[#f59e0b]" />,      label: "Inventory" },
                { href: "/dashboard/customers",  icon: <Users size={20} className="text-[#a78bfa]" />,         label: "Add Customer" },
                { href: "/dashboard/expenses",   icon: <IndianRupee size={20} className="text-[var(--error)]"/>,label: "Add Expense" },
                { href: "/dashboard/revenue",    icon: <PieChart size={20} className="text-[var(--success)]"/>, label: "Reports" },
              ].map(a => (
                <Link key={a.href} href={a.href}
                  className="flex flex-col items-center gap-2 p-3 bg-[#1f2937] hover:bg-[#374151] rounded-xl border border-gray-700 transition-colors">
                  {a.icon}
                  <span className="text-xs font-medium text-center truncate w-full">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-5 h-[300px]">
            <h2 className="text-sm font-bold text-white mb-3">Monthly Revenue vs Expenses</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={chartData} margin={{ top: 5, right: 15, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", color: "#fff" }}
                    formatter={v => [`₹ ${Number(v).toLocaleString("en-IN")}`, undefined]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="revenue"  name="Revenue"  stroke="#00FF99" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#FF5555" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500 text-sm">No data yet.</div>
            )}
          </div>
        </div>

        {/* ── Right col: Notes ── */}
        <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-5 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-white">📝 Reminders</h2>
            <Link href="/dashboard/notes"
              className="text-xs bg-[var(--accent)] text-black px-3 py-1 rounded-full font-bold hover:opacity-80">
              + Add
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {highPriorityNotes.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[var(--error)] mb-2 uppercase tracking-wider">🚨 High Priority</p>
                {highPriorityNotes.slice(0, 3).map(n => (
                  <div key={n.id} className="bg-[#3a1f1f] border border-red-900/40 p-3 rounded-xl mb-2">
                    <div className="flex justify-between">
                      <p className="font-bold text-[#ff8888] text-xs">🔴 {n.title}</p>
                      <button onClick={() => completeNote(n.id)} className="text-[var(--success)]"><CheckCircle2 size={14} /></button>
                    </div>
                    <p className="text-[10px] text-[#ffaaaa] mt-1 line-clamp-2">{n.content}</p>
                    {n.due_date && <p className="text-[10px] text-gray-500 mt-1">📅 {n.due_date}</p>}
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-[var(--accent)] mb-2 uppercase tracking-wider">📋 Pending Tasks</p>
              {pendingNotes.length > 0 ? pendingNotes.slice(0, 6).map(n => (
                <div key={n.id} className="bg-[#1f2f3a] border border-[#2a3f4a] p-3 rounded-xl mb-2">
                  <div className="flex justify-between">
                    <p className={`font-bold text-xs ${n.priority === "High" ? "text-[var(--error)]" : n.priority === "Medium" ? "text-[var(--warning)]" : "text-[#60a5fa]"}`}>
                      {n.title}
                    </p>
                    <button onClick={() => completeNote(n.id)} className="text-[var(--success)]"><CheckCircle2 size={14} /></button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{n.content}</p>
                  <p className="text-[10px] text-gray-500 mt-1">🏷️ {n.category}</p>
                </div>
              )) : (
                <div className="text-center py-8 text-[var(--success)]">
                  <p className="text-2xl mb-1">🎉</p>
                  <p className="text-xs">No pending tasks!</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--panel-border)]">
            <div className="bg-[#1f3a2f] p-3 rounded-xl border border-green-900/30">
              <p className="text-[var(--success)] font-bold text-xs mb-1">💾 Backup</p>
              <p className="text-[10px] text-gray-400 mb-2">Export data regularly to keep it safe.</p>
              <Link href="/dashboard/settings"
                className="block text-center text-xs bg-[var(--panel)] text-white border border-[var(--panel-border)] py-1.5 rounded-lg hover:bg-[#3a3a4b]">
                Go to Backup
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
