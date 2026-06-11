"use client";

import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { UserPlus, Search, Edit2, Trash2, ChevronDown, ChevronRight, History, X, Check, Eye } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  loyalty_points?: number;
  registered: string;
}

interface Invoice {
  id: string;
  invoice_no: string;
  customer: string;
  mobile: string;
  service: string;
  price: number;
  discount: number;
  final: number;
  payment_mode: string;
  payment_status?: string;
  body_part?: string;
  tattoo_size?: string;
  date: string;
  notes: string;
  artist?: string;
  signature?: string;
  tattoo_image?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers, loaded] = useLocalStorage<Customer[]>("ritech_customers", []);
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>("ritech_invoices", []);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  // Customer History Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const resetForm = () => {
    setName(""); setMobile(""); setAddress(""); setEditingId(null); setError("");
  };

  const saveCustomer = () => {
    if (!name.trim() || !mobile.trim()) { setError("Name and Mobile are required."); return; }
    if (!/^\d{10}$/.test(mobile.trim())) { setError("Mobile must be exactly 10 digits."); return; }

    if (editingId) {
      setCustomers(prev => (prev as Customer[]).map(c => c.id === editingId ? { ...c, name: name.trim(), mobile: mobile.trim(), address: address.trim() } : c));
    } else {
      if (customers.some(c => c.mobile === mobile.trim())) { setError("Mobile number already registered!"); return; }
      const newCustomer: Customer = {
        id: Date.now().toString(),
        name: name.trim(),
        mobile: mobile.trim(),
        address: address.trim(),
        loyalty_points: 0,
        registered: new Date().toISOString(),
      };
      setCustomers(prev => [...(prev as Customer[]), newCustomer]);
    }
    resetForm();
  };

  const editCustomer = (c: Customer) => {
    setEditingId(c.id); setName(c.name); setMobile(c.mobile); setAddress(c.address); setError("");
  };

  const deleteCustomer = (id: string) => {
    if (confirm("Delete this customer?")) setCustomers(prev => (prev as Customer[]).filter(c => c.id !== id));
  };

  const filtered = useMemo(() =>
    customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search)
    ), [customers, search]);

  // Group by month-year
  const grouped = useMemo(() => {
    const map: Record<string, Customer[]> = {};
    filtered.forEach(c => {
      const key = c.registered
        ? new Date(c.registered).toLocaleString("en-IN", { month: "long", year: "numeric" })
        : "Unknown";
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return Object.entries(map).sort((a, b) => {
      const da = new Date(a[1][0]?.registered || 0);
      const db = new Date(b[1][0]?.registered || 0);
      return db.getTime() - da.getTime();
    });
  }, [filtered]);

  const toggleMonth = (key: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Find customer history
  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices.filter(inv =>
      (inv.mobile && inv.mobile === selectedCustomer.mobile) ||
      (inv.customer.toLowerCase() === selectedCustomer.name.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCustomer, invoices]);

  const customerStats = useMemo(() => {
    if (customerInvoices.length === 0) return { visits: 0, spent: 0, pending: 0 };
    const visits = customerInvoices.length;
    const spent = customerInvoices.reduce((s, inv) => s + (inv.final || 0), 0);
    const pending = customerInvoices
      .filter(inv => inv.payment_status === "Pending")
      .reduce((s, inv) => s + (inv.final || 0), 0);
    return { visits, spent, pending };
  }, [customerInvoices]);

  const handleMarkAsPaid = (invId: string) => {
    if (confirm("Mark this invoice as Paid?")) {
      setInvoices(prev => prev.map(inv => inv.id === invId ? { ...inv, payment_status: "Paid" } : inv));
    }
  };

  if (!loaded) return <div className="flex h-full items-center justify-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl lg:text-3xl font-bold text-white">👤 Customer Management</h1>

      {/* Form */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-[var(--accent)] mb-4">{editingId ? "✏️ Edit Customer" : "➕ Add New Customer"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="text" placeholder="Full Name" value={name}
            onChange={e => setName(e.target.value)}
            className="bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            type="text" placeholder="Mobile (10 digits)" value={mobile}
            onChange={e => setMobile(e.target.value)} maxLength={10}
            className="bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            type="text" placeholder="Address (optional)" value={address}
            onChange={e => setAddress(e.target.value)}
            className="bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        {error && <p className="text-[var(--error)] text-sm mt-2">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={saveCustomer}
            className="bg-gradient-to-r from-[var(--accent)] to-[#00b3ff] text-black font-bold py-2 px-6 rounded-xl flex items-center gap-2 hover:opacity-90">
            <UserPlus size={18} /> {editingId ? "Update" : "Add Customer"}
          </button>
          {editingId && (
            <button onClick={resetForm}
              className="border border-[var(--panel-border)] text-gray-400 py-2 px-6 rounded-xl hover:bg-[#2a2a3b]">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text" placeholder="Search by name or mobile..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[var(--panel)] border border-[var(--panel-border)] text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      {/* Customer List */}
      <div className="space-y-4">
        {grouped.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No customers found.</div>
        ) : (
          grouped.map(([month, list]) => (
            <div key={month} className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleMonth(month)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#2a2a3b] transition-colors"
              >
                <span className="font-bold text-[var(--accent)]">📅 {month} ({list.length} customers)</span>
                {collapsedMonths.has(month) ? <ChevronRight size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
              </button>

              {!collapsedMonths.has(month) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-[var(--panel-border)] bg-[#1a1a2e]">
                        {["S/N", "Name", "Mobile", "Address", "Loyalty Points", "Registered", "Actions"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[var(--warning)] font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((c, i) => (
                        <tr key={c.id} className="border-t border-[var(--panel-border)] hover:bg-[#2a2a3b]">
                          <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                          <td className="px-4 py-3 text-gray-300">{c.mobile}</td>
                          <td className="px-4 py-3 text-gray-400">{c.address || "—"}</td>
                          <td className="px-4 py-3 text-[var(--accent)] font-semibold whitespace-nowrap">{c.loyalty_points ?? 0} pts</td>
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                            <span className="block">{new Date(c.registered).toLocaleDateString("en-IN")}</span>
                            <span className="block text-gray-500">{new Date(c.registered).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-3">
                              <button onClick={() => setSelectedCustomer(c)} className="text-[#a78bfa] hover:opacity-80" title="View Customer History">
                                <History size={16} />
                              </button>
                              <button onClick={() => editCustomer(c)} className="text-[var(--accent)] hover:opacity-80" title="Edit Profile"><Edit2 size={16} /></button>
                              <button onClick={() => deleteCustomer(c.id)} className="text-[var(--error)] hover:opacity-80" title="Delete Customer"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Customer History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--panel-border)]">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  👤 Customer Profile & History
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Showing details for <span className="text-[var(--accent)] font-semibold">{selectedCustomer.name}</span> (📞 {selectedCustomer.mobile})
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Customer Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#1f2937]/50 border border-gray-700 p-4 rounded-xl">
                  <p className="text-xs text-gray-400">Total Visits (Invoices)</p>
                  <p className="text-xl font-bold text-[var(--accent)] mt-1">{customerStats.visits} times</p>
                </div>
                <div className="bg-[#1f2937]/50 border border-gray-700 p-4 rounded-xl">
                  <p className="text-xs text-gray-400">Total Spend</p>
                  <p className="text-xl font-bold text-[var(--success)] mt-1">₹ {customerStats.spent.toLocaleString("en-IN")}</p>
                </div>
                <div className={`p-4 rounded-xl border ${customerStats.pending > 0 ? "bg-[#3e1f1f]/35 border-red-900/40" : "bg-[#1f2937]/50 border-gray-700"}`}>
                  <p className="text-xs text-gray-400">Outstanding Balance</p>
                  <p className={`text-xl font-bold mt-1 ${customerStats.pending > 0 ? "text-[var(--error)]" : "text-gray-300"}`}>
                    ₹ {customerStats.pending.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-[#2e2615] border border-amber-800/40 p-4 rounded-xl">
                  <p className="text-xs text-gray-400">Loyalty Points</p>
                  <p className="text-xl font-bold text-amber-400 mt-1">
                    {(customers.find(c => c.id === selectedCustomer.id)?.loyalty_points ?? 0)} pts
                  </p>
                </div>
              </div>

              {/* Profile Details */}
              <div className="bg-[#1a1a2e] border border-[var(--panel-border)] p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block">Address</span>
                  <span className="text-gray-300 font-medium">{selectedCustomer.address || "No address provided"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Registered On</span>
                  <span className="text-gray-300 font-medium">{new Date(selectedCustomer.registered).toLocaleDateString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Registered Time</span>
                  <span className="text-gray-300 font-medium">{new Date(selectedCustomer.registered).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Customer ID</span>
                  <span className="text-gray-400 font-mono">{selectedCustomer.id}</span>
                </div>
              </div>

              {/* Invoices List */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">🧾 Past Invoices</h4>
                {customerInvoices.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-500 bg-[#1f2937]/20 border border-dashed border-gray-700 rounded-xl">
                    No invoices recorded for this customer.
                  </div>
                ) : (
                  <div className="border border-[var(--panel-border)] rounded-xl overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-[#1a1a2e]">
                          {["Invoice #", "Date", "Artist", "Service (Type)", "Placement / Size", "Tattoo Photo", "Final ₹", "Payment Mode", "Status", "Consent & Sig", "Actions"].map(h => (
                            <th key={h} className="px-4 py-2.5 text-[var(--warning)] font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {customerInvoices.map((inv) => (
                          <tr key={inv.id} className="border-t border-[var(--panel-border)] hover:bg-[#2a2a3b] transition-colors">
                            <td className="px-4 py-3 text-[var(--accent)] font-mono font-medium">{inv.invoice_no}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{new Date(inv.date).toLocaleDateString("en-IN")}</td>
                            <td className="px-4 py-3 text-gray-300 font-semibold">{inv.artist || "Ritesh"}</td>
                            <td className="px-4 py-3 text-white">
                              {inv.service} <span className="text-gray-400 text-[10px]">({(inv as any).tattoo_type || "2D"})</span>
                            </td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                              {inv.body_part || "—"} <span className="text-gray-400 text-[10px]">({inv.tattoo_size || "—"})</span>
                            </td>
                            
                            {/* Tattoo Photo thumbnail with click-to-zoom capability */}
                            <td className="px-4 py-3">
                              {inv.tattoo_image ? (
                                <button
                                  onClick={() => setZoomImage(inv.tattoo_image || null)}
                                  className="w-8 h-8 rounded-md border border-gray-700 overflow-hidden block relative group hover:border-[var(--accent)]"
                                  title="Zoom Image"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={inv.tattoo_image} alt="Tattoo" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye size={10} className="text-white" />
                                  </div>
                                </button>
                              ) : (
                                <span className="text-gray-600">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-[var(--success)] font-bold">₹{inv.final.toFixed(2)}</td>
                            <td className="px-4 py-3 text-gray-400">{inv.payment_mode}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${inv.payment_status === "Pending" ? "bg-amber-950 text-amber-300 border border-amber-800/40" : "bg-emerald-950 text-emerald-300 border border-emerald-800/40"}`}>
                                {inv.payment_status || "Paid"}
                              </span>
                            </td>

                            {/* Consent signature display */}
                            <td className="px-4 py-3">
                              {inv.signature ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={inv.signature} alt="Sig" className="h-5 max-w-[65px] object-contain filter invert opacity-85 hover:opacity-100 cursor-pointer" onClick={() => setZoomImage(inv.signature || null)} />
                              ) : (
                                <span className="text-gray-600">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {inv.payment_status === "Pending" && (
                                <button
                                  onClick={() => handleMarkAsPaid(inv.id)}
                                  className="flex items-center gap-1 bg-[#1a3a1a] hover:bg-[#225022] text-[var(--success)] font-bold py-1 px-2 rounded-lg text-[10px] border border-green-900/50"
                                  title="Mark Paid"
                                >
                                  <Check size={10} /> Recv
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#1a1a2e] border-t border-[var(--panel-border)] flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs py-2 px-5 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Zoom Image Modal */}
      {zoomImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={() => setZoomImage(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-400">
            <X size={28} />
          </button>
          <div className="max-w-xl max-h-[80vh] overflow-hidden rounded-xl border border-gray-800 bg-[#0d0d1a]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomImage} alt="Zoomed View" className="max-w-full max-h-[75vh] object-contain block" />
          </div>
        </div>
      )}

    </div>
  );
}
