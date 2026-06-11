"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
  Search, Trash2, Clock, User, List, Grid, CheckCircle2, 
  XCircle, AlertCircle, X, Edit, Phone, MessageSquare, Image as ImageIcon
} from "lucide-react";

interface Customer { id: string; name: string; mobile: string; address: string; }
interface Appointment {
  id: string;
  customer_name: string;
  customer_mobile: string;
  service: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  notes: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  artist?: string;
  reference_image?: string; // Base64 compressed JPEG
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SERVICES = [
  "Tattoo", "Touchup", "Second Session", "Multiple", "Painting", "Blood Painting",
  "Sketching", "Framing", "Sculpture", "DIY Art", "Coverup Tattoos", "Laser Removal"
];
const STATUSES = ["Scheduled", "Completed", "Cancelled"];

export default function AppointmentsPage() {
  const [customers, , customersLoaded] = useLocalStorage<Customer[]>("ritech_customers", []);
  const [appointments, setAppointments, loaded] = useLocalStorage<Appointment[]>("ritech_appointments", []);
  const [settings, , settingsLoaded] = useLocalStorage<Record<string, any>>("ritech_settings", {});

  // View States
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Form Fields
  const [customerSearch, setCustomerSearch] = useState("");
  const [mobile, setMobile] = useState("");
  const [service, setService] = useState(SERVICES[0]);
  const [customService, setCustomService] = useState("");
  const [time, setTime] = useState("12:00");
  const [dateField, setDateField] = useState("");
  const [statusField, setStatusField] = useState<"Scheduled" | "Completed" | "Cancelled">("Scheduled");
  const [notes, setNotes] = useState("");
  const [artistField, setArtistField] = useState("Ritesh");
  const [referenceImage, setReferenceImage] = useState("");
  const [error, setError] = useState("");

  // Search Filter
  const [listSearch, setListSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  const artistsList = settings?.artists || ["Ritesh"];

  // Suggestions filter
  const suggestions = useMemo(() => {
    if (!customerSearch) return [];
    return customers.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobile.includes(customerSearch)
    ).slice(0, 8);
  }, [customerSearch, customers]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-fill mobile if customer matches
  useEffect(() => {
    const found = customers.find(c => c.name.toLowerCase() === customerSearch.toLowerCase());
    if (found) setMobile(found.mobile);
  }, [customerSearch, customers]);

  // Calendar parameters
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const firstDayIndex = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);

  // Change month
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Open modal to add appointment
  const handleOpenAddModal = (dateStr?: string) => {
    setError("");
    setCustomerSearch("");
    setMobile("");
    setService(SERVICES[0]);
    setCustomService("");
    setTime("12:00");
    setNotes("");
    setStatusField("Scheduled");
    setArtistField(artistsList[0] || "Ritesh");
    setReferenceImage("");

    const targetDate = dateStr || new Date().toISOString().split("T")[0];
    setDateField(targetDate);
    setEditingAppointment(null);
    setShowAddModal(true);
  };

  // Open modal to edit appointment
  const handleOpenEditModal = (app: Appointment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setError("");
    setEditingAppointment(app);
    setCustomerSearch(app.customer_name);
    setMobile(app.customer_mobile);
    if (SERVICES.includes(app.service)) {
      setService(app.service);
      setCustomService("");
    } else {
      setService("Other");
      setCustomService(app.service);
    }
    setDateField(app.date);
    setTime(app.time);
    setStatusField(app.status);
    setNotes(app.notes);
    setArtistField(app.artist || "Ritesh");
    setReferenceImage(app.reference_image || "");
    setShowAddModal(true);
  };

  // Image compressor helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const max_size = 300; // Resize to max 300px width/height

        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
          setReferenceImage(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Save / Update Appointment
  const handleSaveAppointment = () => {
    if (!customerSearch.trim()) { setError("Customer Name is required."); return; }
    if (!mobile.trim()) { setError("Mobile Number is required."); return; }
    if (!/^\d{10}$/.test(mobile.trim())) { setError("Mobile must be exactly 10 digits."); return; }
    if (!dateField) { setError("Date is required."); return; }
    if (!time) { setError("Time is required."); return; }

    const finalService = service === "Other" ? customService.trim() : service;
    if (!finalService) { setError("Please specify the service."); return; }

    // ⏰ Working hours validation
    const start = settings.working_hours_start || "10:00";
    const end = settings.working_hours_end || "20:00";
    if (time < start || time > end) {
      setError(`अपॉइंटमेंटची वेळ स्टुडिओच्या कामाच्या वेळेच्या बाहेर आहे (Working Hours: ${start} ते ${end}).`);
      return;
    }

    // 📅 Artist slot conflict check (within 1 hour overlap)
    const parseTimeToMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const newTimeMin = parseTimeToMinutes(time);
    const conflictApp = appointments.find(app => {
      if (editingAppointment && app.id === editingAppointment.id) return false;
      if (app.status !== "Scheduled" || app.date !== dateField || app.artist !== artistField) return false;
      const existingTimeMin = parseTimeToMinutes(app.time);
      return Math.abs(newTimeMin - existingTimeMin) < 60; // 60 mins overlap
    });

    if (conflictApp) {
      setError(`कलाकार ${artistField} साठी ${conflictApp.time} वाजता आधीच बुकिंग आहे. (Overlap Conflict!)`);
      return;
    }

    if (editingAppointment) {
      // Update
      setAppointments(prev => (prev as Appointment[]).map(a => 
        a.id === editingAppointment.id 
          ? { 
              ...a, 
              customer_name: customerSearch.trim(), 
              customer_mobile: mobile.trim(), 
              service: finalService,
              date: dateField,
              time: time,
              status: statusField,
              notes: notes.trim(),
              artist: artistField,
              reference_image: referenceImage || undefined
            } 
          : a
      ));
    } else {
      // Create new
      const newApp: Appointment = {
        id: Date.now().toString(),
        customer_name: customerSearch.trim(),
        customer_mobile: mobile.trim(),
        service: finalService,
        date: dateField,
        time: time,
        notes: notes.trim(),
        status: statusField,
        artist: artistField,
        reference_image: referenceImage || undefined
      };
      setAppointments(prev => [...(prev as Appointment[] || []), newApp]);
    }

    setShowAddModal(false);
    setEditingAppointment(null);
  };

  // Delete Appointment
  const handleDeleteAppointment = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Are you sure you want to cancel and delete this appointment?")) {
      setAppointments(prev => (prev as Appointment[]).filter(a => a.id !== id));
      if (editingAppointment && editingAppointment.id === id) {
        setShowAddModal(false);
        setEditingAppointment(null);
      }
    }
  };

  // Quick mark status
  const handleQuickStatus = (id: string, newStatus: "Scheduled" | "Completed" | "Cancelled", e: React.MouseEvent) => {
    e.stopPropagation();
    setAppointments(prev => (prev as Appointment[]).map(a => a.id === id ? { ...a, status: newStatus } : a));
  };

  // WhatsApp reminder
  const handleSendWhatsAppReminder = (app: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    const studioName = settings?.studio_name || "Ritesh Tattoo Studio";
    
    // Friendly date
    const dateFormatted = new Date(app.date).toLocaleDateString("en-IN", { 
      day: "numeric", 
      month: "short", 
      year: "numeric" 
    });

    const msg = `🧿 *${studioName} — Appointment Reminder* 📅\n` +
      `━━━━━━━━━━━━━━\n` +
      `नमस्कार *${app.customer_name}*, हा तुमच्या टॅटू अपॉइंटमेंटचा रिमाइंडर मेसेज आहे:\n\n` +
      `📅 दिनांक: *${dateFormatted}*\n` +
      `🕒 वेळ: *${app.time}*\n` +
      `🎨 सर्व्हिस: *${app.service}*\n` +
      `👤 आर्टिस्ट: *${app.artist || "Ritesh"}*\n\n` +
      `कृपया वेळेवर यावे. टॅटू काढण्यापूर्वी व्यवस्थित जेवण करून यावे. काही अडचण असल्यास नक्की कळवा! 🙏\n` +
      `━━━━━━━━━━━━━━\n` +
      `${settings?.phone ? `📞 ${settings.phone}` : ""}`;

    const phone = app.customer_mobile ? `91${app.customer_mobile}` : "";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Map appointments to days in current month
  const appointmentsByDay = useMemo(() => {
    const map: Record<number, Appointment[]> = {};
    if (!appointments) return map;

    appointments.forEach(app => {
      const appDate = new Date(app.date);
      if (appDate.getFullYear() === year && appDate.getMonth() === month) {
        const dayNum = appDate.getDate();
        if (!map[dayNum]) map[dayNum] = [];
        map[dayNum].push(app);
      }
    });

    // Sort by time
    Object.keys(map).forEach(day => {
      map[Number(day)].sort((a, b) => a.time.localeCompare(b.time));
    });

    return map;
  }, [appointments, year, month]);

  // List View Filter
  const filteredList = useMemo(() => {
    if (!appointments) return [];
    return appointments
      .filter(app => {
        const matchesSearch = !listSearch || 
          app.customer_name.toLowerCase().includes(listSearch.toLowerCase()) ||
          app.customer_mobile.includes(listSearch) ||
          app.service.toLowerCase().includes(listSearch.toLowerCase()) ||
          (app.artist || "").toLowerCase().includes(listSearch.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => {
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) return dateDiff;
        return a.time.localeCompare(b.time);
      });
  }, [appointments, listSearch]);

  if (!loaded || !customersLoaded || !settingsLoaded) {
    return <div className="flex h-full items-center justify-center text-gray-400">Loading appointments...</div>;
  }

  // Visual classes for status
  const statusColors = {
    Scheduled: "bg-[#1e3a47] text-[#00FFE1] border-[#00FFE1]/20",
    Completed: "bg-[#1b3d2b] text-[#00FF99] border-[#00FF99]/20",
    Cancelled: "bg-[#3d1c1c] text-[#FF5555] border-[#FF5555]/20"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2.5">
            <CalendarIcon className="text-[var(--accent)]" /> Appointment Calendar
          </h1>
          <p className="text-xs text-gray-400 mt-1">Manage studio bookings, services, and scheduling slots.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-[#1a1a2e] border border-[var(--panel-border)] p-1 rounded-xl">
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-2 rounded-lg transition-all ${viewMode === "calendar" ? "bg-[var(--accent)] text-black" : "text-gray-400 hover:text-white"}`}
              title="Calendar View"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-[var(--accent)] text-black" : "text-gray-400 hover:text-white"}`}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>

          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[var(--accent)] to-[#00b3ff] text-black font-bold py-2 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm shadow-md"
          >
            <Plus size={16} /> Schedule
          </button>
        </div>
      </div>

      {/* ── View 1: Calendar ── */}
      {viewMode === "calendar" && (
        <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-5 space-y-4">
          
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              📅 {MONTHS[month]} {year}
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={prevMonth}
                className="p-2 bg-[#1a1a2e] border border-[var(--panel-border)] rounded-xl text-gray-400 hover:text-white hover:border-gray-500"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="text-xs bg-[#1a1a2e] border border-[var(--panel-border)] text-gray-300 font-semibold px-3 py-2 rounded-xl hover:text-white"
              >
                Today
              </button>
              <button 
                onClick={nextMonth}
                className="p-2 bg-[#1a1a2e] border border-[var(--panel-border)] rounded-xl text-gray-400 hover:text-white hover:border-gray-500"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            
            {/* Weekday headers */}
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="text-center text-xs font-bold text-[var(--warning)] py-2 border-b border-[var(--panel-border)] uppercase tracking-wider">
                {d}
              </div>
            ))}

            {/* Empty cells for preceding month padding */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="bg-[#1f212f]/30 border border-[#2a2a3b]/40 rounded-xl min-h-[90px] p-2 opacity-30 select-none">
                {/* Blank */}
              </div>
            ))}

            {/* Day cells of current month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const isToday = new Date().toDateString() === new Date(year, month, dayNum).toDateString();
              const dayApps = appointmentsByDay[dayNum] || [];

              return (
                <div 
                  key={`day-${dayNum}`}
                  onClick={() => handleOpenAddModal(dateStr)}
                  className={`bg-[#1e1e2f] border rounded-xl min-h-[100px] p-2 flex flex-col justify-between hover:border-gray-500 transition-all cursor-pointer relative group
                    ${isToday ? "border-[var(--accent)] shadow-lg bg-[#212f3d]/60" : "border-[var(--panel-border)]"}
                  `}
                >
                  {/* Day Header */}
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${isToday ? "bg-[var(--accent)] text-black" : "text-gray-400"}`}>
                      {dayNum}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenAddModal(dateStr); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-[var(--accent)] p-0.5 rounded transition-all"
                      title="Add Booking"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Appointments List inside cell */}
                  <div className="flex-1 overflow-y-auto space-y-1 max-h-[75px] pr-0.5">
                    {dayApps.map(app => (
                      <div
                        key={app.id}
                        onClick={(e) => handleOpenEditModal(app, e)}
                        className={`text-[9px] px-1.5 py-1 rounded border leading-snug font-medium truncate flex flex-col transition-opacity hover:opacity-90 ${statusColors[app.status] || "bg-[#1f2937] text-white"}`}
                        title={`${app.time} - ${app.customer_name} (${app.service}) [Artist: ${app.artist || "Ritesh"}]`}
                      >
                        <div className="font-semibold truncate flex items-center justify-between">
                          <span>{app.time} — {app.customer_name}</span>
                          {app.reference_image && <ImageIcon size={8} className="text-gray-400 ml-1 shrink-0" />}
                        </div>
                        <span className="opacity-75 block truncate">{app.service} ({app.artist || "Ritesh"})</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── View 2: List View ── */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {/* List Controls */}
          <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by customer, mobile, service, or artist..."
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
                className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="text-xs text-gray-400 whitespace-nowrap">
              {filteredList.length} booking{filteredList.length !== 1 ? "s" : ""} found
            </div>
          </div>

          {/* List Table */}
          <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl overflow-hidden">
            {filteredList.length === 0 ? (
              <div className="text-center py-16 text-gray-500">No scheduled bookings found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-[#1a1a2e] border-b border-[var(--panel-border)]">
                      {["Date & Time", "Customer Details", "Artist & Service", "Design & Notes", "Status", "Actions"].map(h => (
                        <th key={h} className="px-5 py-3 text-[var(--warning)] font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((app) => (
                      <tr key={app.id} className="border-t border-[var(--panel-border)] hover:bg-[#2a2a3b] transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <CalendarIcon size={14} className="text-[var(--accent)]" />
                            <span className="text-white font-medium">{new Date(app.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400 text-xs mt-1">
                            <Clock size={12} />
                            <span>{app.time}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-white font-semibold">{app.customer_name}</div>
                          <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                            <Phone size={10} />
                            <span>{app.customer_mobile}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="bg-[#1f2937] text-[var(--accent)] px-2.5 py-1 rounded-lg text-xs border border-gray-700 font-semibold">{app.service}</span>
                          <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                            <User size={10} /> Artist: <span className="text-white font-medium">{app.artist || "Ritesh"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 max-w-xs text-xs">
                          <div className="flex items-center gap-2.5">
                            {app.reference_image && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={app.reference_image} alt="Ref Design" className="w-10 h-10 object-cover rounded-md border border-gray-700 shrink-0" />
                            )}
                            <p className="text-gray-400 line-clamp-2">{app.notes || "—"}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[app.status] || "bg-[#1f2937]"}`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => handleOpenEditModal(app, e)}
                              className="text-[var(--accent)] hover:opacity-80 transition-opacity"
                              title="Edit Booking"
                            >
                              <Edit size={16} />
                            </button>

                            <button
                              onClick={(e) => handleSendWhatsAppReminder(app, e)}
                              className="text-[#25D366] hover:opacity-80 transition-opacity"
                              title="WhatsApp Reminder"
                            >
                              <MessageSquare size={16} />
                            </button>
                            
                            {app.status === "Scheduled" && (
                              <>
                                <button
                                  onClick={(e) => handleQuickStatus(app.id, "Completed", e)}
                                  className="text-[var(--success)] hover:opacity-80 transition-opacity"
                                  title="Mark Completed"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                                <button
                                  onClick={(e) => handleQuickStatus(app.id, "Cancelled", e)}
                                  className="text-[var(--error)] hover:opacity-80 transition-opacity"
                                  title="Mark Cancelled"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}

                            <button
                              onClick={(e) => handleDeleteAppointment(app.id, e)}
                              className="text-[var(--error)] hover:opacity-80 transition-opacity"
                              title="Delete Booking"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Add / Edit Appointment ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--panel-border)] bg-[#1a1a2e]">
              <h3 className="font-bold text-white flex items-center gap-2">
                {editingAppointment ? "✏️ Edit Booking" : "📅 Schedule Appointment"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
              {error && (
                <div className="bg-[#3d1c1c] border border-[var(--error)] text-[var(--error)] rounded-xl p-3 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              {/* Customer search field */}
              <div className="space-y-1.5" ref={customerRef}>
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Customer Name *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search by name or mobile..."
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[var(--accent)] text-xs"
                  />
                  {showSuggestions && customerSearch.length > 0 && suggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-[#1e1e2f] border border-[var(--panel-border)] rounded-xl shadow-2xl overflow-hidden max-h-40 overflow-y-auto">
                      {suggestions.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setCustomerSearch(c.name); setMobile(c.mobile); setShowSuggestions(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-[#2a2a3b] border-b border-[var(--panel-border)] last:border-0 text-xs text-white"
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-gray-400 ml-2">📞 {c.mobile}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer mobile */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Customer Mobile *</label>
                <input
                  type="text"
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  maxLength={10}
                  className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--accent)] text-xs"
                />
              </div>

              {/* Artist Selection */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Tattoo Artist (कलाकार) *</label>
                <select
                  value={artistField}
                  onChange={e => setArtistField(e.target.value)}
                  className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--accent)] text-xs"
                >
                  {artistsList.map((a: string) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {/* Service Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Service Type *</label>
                  <select 
                    value={service}
                    onChange={e => setService(e.target.value)}
                    className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--accent)] text-xs"
                  >
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="Other">Other / Custom</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Status</label>
                  <select
                    value={statusField}
                    onChange={e => setStatusField(e.target.value as any)}
                    className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--accent)] text-xs"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Custom Service Input */}
              {service === "Other" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Custom Service Name *</label>
                  <input
                    type="text"
                    placeholder="Describe custom service"
                    value={customService}
                    onChange={e => setCustomService(e.target.value)}
                    className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--accent)] text-xs"
                  />
                </div>
              )}

              {/* Date & Time fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Date *</label>
                  <input
                    type="date"
                    value={dateField}
                    onChange={e => setDateField(e.target.value)}
                    className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--accent)] text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Time *</label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--accent)] text-xs"
                  />
                </div>
              </div>

              {/* Upload Design Reference Image */}
              <div className="bg-[#1a1a2e] border border-[var(--panel-border)] rounded-xl p-3.5 space-y-2">
                <label className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-[var(--accent)]" /> Upload Reference Design (फोटो जोडा)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 bg-[#252538] hover:bg-[#373752] text-white border border-gray-700 text-[10px] px-3.5 py-2 rounded-lg cursor-pointer transition-colors font-semibold">
                    Choose Image File
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {referenceImage ? (
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={referenceImage} alt="Reference preview" className="w-9 h-9 object-cover rounded-md border border-gray-700" />
                      <button type="button" onClick={() => setReferenceImage("")} className="text-[var(--error)] hover:opacity-80">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-500">फोटो जोडलेला नाही (ऑटो-कंप्रेस केला जाईल)</span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Notes / Custom Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Design info, size placement notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--accent)] text-xs resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#1a1a2e] border-t border-[var(--panel-border)] flex justify-between gap-3">
              {editingAppointment ? (
                <button
                  type="button"
                  onClick={() => handleDeleteAppointment(editingAppointment.id)}
                  className="flex items-center justify-center gap-1.5 bg-[#3d1c1c] hover:bg-[#5a2424] text-[var(--error)] font-bold text-xs py-2 px-4 rounded-xl transition-colors border border-red-950"
                >
                  <Trash2 size={14} /> Cancel Booking
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="border border-[var(--panel-border)] text-gray-400 font-bold text-xs py-2 px-4 rounded-xl hover:bg-[#2a2a3b] transition-colors"
                >
                  Discard
                </button>
              )}

              <button
                onClick={handleSaveAppointment}
                className="flex-1 bg-gradient-to-r from-[var(--accent)] to-[#00b3ff] text-black font-bold text-xs py-2 px-5 rounded-xl hover:opacity-90 transition-opacity"
              >
                {editingAppointment ? "💾 Update Booking" : "💾 Schedule Booking"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
