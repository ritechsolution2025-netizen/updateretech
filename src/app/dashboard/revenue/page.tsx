"use client";

import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { Users, TrendingUp, Calendar, Clock, DollarSign, Award } from "lucide-react";

interface Invoice { 
  id: string; 
  customer: string; 
  service: string; 
  final: number; 
  date: string; 
  artist?: string; 
  mobile?: string; 
}
interface Expense { id: string; description: string; amount: number; date: string; category: string; }
interface Appointment { id: string; date: string; time: string; }

function getMonthKey(dateStr: string) {
  return dateStr ? dateStr.substring(0, 7) : "";
}

const COLORS = ["#00FFE1", "#a78bfa", "#00FF99", "#ff8800", "#FF5555", "#3b82f6", "#ec4899"];

export default function RevenuePage() {
  const [invoices, , invoicesLoaded] = useLocalStorage<Invoice[]>("ritech_invoices", []);
  const [expenses, , expensesLoaded] = useLocalStorage<Expense[]>("ritech_expenses", []);
  const [appointments, , appointmentsLoaded] = useLocalStorage<Appointment[]>("ritech_appointments", []);
  
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Monthly chart data (last 12 months always shown)
  const monthlyData = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; expenses: number }> = {};
    invoices.forEach(inv => {
      const key = getMonthKey(inv.date?.split("T")[0] || "");
      if (!key) return;
      if (!map[key]) map[key] = { name: key, revenue: 0, expenses: 0 };
      map[key].revenue += inv.final || 0;
    });
    expenses.forEach(exp => {
      const key = getMonthKey(exp.date || "");
      if (!key) return;
      if (!map[key]) map[key] = { name: key, revenue: 0, expenses: 0 };
      map[key].expenses += exp.amount || 0;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name)).slice(-12);
  }, [invoices, expenses]);

  // Filtered report
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const d = inv.date?.split("T")[0] || "";
      return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
    });
  }, [invoices, fromDate, toDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const d = exp.date || "";
      return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
    });
  }, [expenses, fromDate, toDate]);

  const totalIncome = filteredInvoices.reduce((s, i) => s + (i.final || 0), 0);
  const totalExp = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const profit = totalIncome - totalExp;

  // Monthly history
  const monthlyHistory = useMemo(() => {
    return [...monthlyData].map(m => ({
      ...m,
      profit: m.revenue - m.expenses,
    })).reverse();
  }, [monthlyData]);

  // Service breakdown
  const serviceBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredInvoices.forEach(inv => {
      if (!map[inv.service]) map[inv.service] = 0;
      map[inv.service] += inv.final || 0;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredInvoices]);

  // 👥 1. Artist Performance & Commission Tracker
  const artistAnalytics = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; count: number }> = {};
    filteredInvoices.forEach(inv => {
      const art = inv.artist || "Ritesh";
      if (!map[art]) map[art] = { name: art, revenue: 0, count: 0 };
      map[art].revenue += inv.final || 0;
      map[art].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredInvoices]);

  // 👥 2. Repeat Customer Rate Analytics
  const repeatCustomerStats = useMemo(() => {
    const customerVisits: Record<string, number> = {};
    invoices.forEach(inv => {
      const key = inv.mobile?.trim() || inv.customer.trim().toLowerCase();
      if (!key) return;
      customerVisits[key] = (customerVisits[key] || 0) + 1;
    });
    const totalCustomers = Object.keys(customerVisits).length;
    if (totalCustomers === 0) return { rate: 0, repeatCount: 0, total: 0 };
    const repeatCustomers = Object.values(customerVisits).filter(count => count > 1).length;
    const rate = (repeatCustomers / totalCustomers) * 100;
    return { rate, repeatCount: repeatCustomers, total: totalCustomers };
  }, [invoices]);

  // 📅 3. Busy Booking Days (Peak Days)
  const peakDaysData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = Array.from({ length: 7 }, (_, i) => ({ name: days[i], bookings: 0 }));
    appointments.forEach(app => {
      if (!app.date) return;
      const d = new Date(app.date).getDay();
      counts[d].bookings += 1;
    });
    return counts;
  }, [appointments]);

  // 🕒 4. Peak Booking Time slots (Peak Hours)
  const peakHoursData = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach(app => {
      if (!app.time) return;
      const hour = parseInt(app.time.split(":")[0]);
      const label = hour >= 12 
        ? `${hour === 12 ? 12 : hour - 12} PM` 
        : `${hour === 0 ? 12 : hour} AM`;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [appointments]);

  if (!invoicesLoaded || !expensesLoaded || !appointmentsLoaded) 
    return <div className="flex h-full items-center justify-center">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl lg:text-3xl font-bold text-[var(--success)]">📈 Revenue & Business Analytics</h1>

      {/* Date Filter */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-5 flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs text-gray-400">From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <button onClick={() => { setFromDate(""); setToDate(""); }}
          className="border border-[var(--panel-border)] text-gray-400 px-4 py-2 rounded-xl hover:bg-[#2a2a3b] text-sm">
          Clear Filters
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-5 text-center">
          <p className="text-gray-400 text-xs mb-2">💰 Total Revenue</p>
          <p className="text-2xl font-bold text-[var(--success)]">₹ {totalIncome.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-gray-500 mt-1">{filteredInvoices.length} invoices registered</p>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-5 text-center">
          <p className="text-gray-400 text-xs mb-2">💸 Total Expenses</p>
          <p className="text-2xl font-bold text-[var(--error)]">₹ {totalExp.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-gray-500 mt-1">{filteredExpenses.length} expenses logged</p>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-5 text-center">
          <p className="text-gray-400 text-xs mb-2">📈 Net Profit</p>
          <p className={`text-2xl font-bold ${profit >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
            ₹ {Math.abs(profit).toLocaleString("en-IN")}
            {profit < 0 && " (Loss)"}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">Under selected filters</p>
        </div>
        
        {/* Repeat Customer Rate KPI Card */}
        <div className="bg-[var(--panel)] border border-purple-900/30 rounded-2xl p-5 text-center">
          <p className="text-gray-400 text-xs mb-2 flex items-center justify-center gap-1">
            <Users size={12} className="text-[#a78bfa]" /> Repeat Customer Rate
          </p>
          <p className="text-2xl font-bold text-[#a78bfa]">
            {repeatCustomerStats.rate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            {repeatCustomerStats.repeatCount} out of {repeatCustomerStats.total} total clients return
          </p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Revenue vs Expenses Chart */}
        <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 h-[320px]">
          <h2 className="font-bold text-white text-sm mb-4">Monthly Revenue vs Expenses (Last 12 Months)</h2>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 15, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", color: "#fff" }}
                  formatter={(v) => [`₹ ${Number(v).toLocaleString("en-IN")}`, undefined]}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#00FF99" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#FF5555" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-gray-500 text-xs">No monthly data.</div>
          )}
        </div>

        {/* Artist Performance & Commission share */}
        <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 h-[320px] flex flex-col justify-between">
          <h2 className="font-bold text-white text-sm mb-2 flex items-center gap-1.5">
            <Award size={16} className="text-[#a78bfa]" /> Artist Revenue Share (कलाकार कमाई हिस्सा)
          </h2>
          
          {artistAnalytics.length > 0 ? (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={artistAnalytics}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      fill="#8884d8"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {artistAnalytics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", color: "#fff" }}
                      formatter={(v) => [`₹ ${Number(v).toLocaleString("en-IN")}`, "Revenue"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Table details */}
              <div className="text-xs overflow-y-auto max-h-48 pr-1 space-y-1.5">
                {artistAnalytics.map((art, idx) => (
                  <div key={art.name} className="flex justify-between items-center bg-[#1a1a2e] p-2.5 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="font-semibold text-white">{art.name}</span>
                      <span className="text-gray-400">({art.count} bookings)</span>
                    </div>
                    <span className="font-bold text-white">{fmtRaw(art.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-gray-500 text-xs">No artist data.</div>
          )}
        </div>

      </div>

      {/* Weekday & Hourly Peak booking times */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Peak Days Bar Chart */}
        <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 h-[300px]">
          <h2 className="font-bold text-white text-sm mb-4 flex items-center gap-1.5">
            <Calendar size={16} className="text-[var(--warning)]" /> Peak Booking Days (व्यस्त दिवस)
          </h2>
          <div className="h-[80%]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakDaysData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9ca3af" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", color: "#fff" }}
                  formatter={(v) => [v, "Bookings"]}
                />
                <Bar dataKey="bookings" name="Bookings" fill="#ffaa00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours (Time slots) Bar Chart */}
        <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 h-[300px]">
          <h2 className="font-bold text-white text-sm mb-4 flex items-center gap-1.5">
            <Clock size={16} className="text-[#38bdf8]" /> Peak Booking Time Slots (व्यस्त तास)
          </h2>
          {peakHoursData.length > 0 ? (
            <div className="h-[80%]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHoursData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#9ca3af" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", color: "#fff" }}
                    formatter={(v) => [v, "Bookings"]}
                  />
                  <Bar dataKey="value" name="Bookings" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-44 items-center justify-center text-gray-500 text-xs">No time slot bookings recorded yet.</div>
          )}
        </div>

      </div>

      {/* Monthly History Table */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl overflow-x-auto">
        <div className="px-6 py-4 border-b border-[var(--panel-border)]">
          <h2 className="font-bold text-white">📅 Monthly Profit / Loss History</h2>
        </div>
        {monthlyHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No data found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a2e]">
                {["Month", "Revenue", "Expenses", "Profit / Loss"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[var(--warning)] font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyHistory.map(m => (
                <tr key={m.name} className="border-t border-[var(--panel-border)] hover:bg-[#2a2a3b]">
                  <td className="px-4 py-3 text-white font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-[var(--success)]">₹ {m.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-[var(--error)]">₹ {m.expenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className={`px-4 py-3 font-bold ${m.profit >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                    ₹ {m.profit.toLocaleString("en-IN", { minimumFractionDigits: 2 })} {m.profit < 0 ? "(Loss)" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Helper formatting cash summary values
function fmtRaw(v: number) {
  return `₹ ${v.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}
