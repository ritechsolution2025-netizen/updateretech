"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Save, Download, Upload, Shield, Clock, Palette, Globe, Check, Users } from "lucide-react";

interface Settings {
  studio_name: string;
  address: string;
  phone: string;
  gstin: string;
  invoice_footer: string;
  default_discount: string;
  default_payment_mode: string;
  theme: string;
  language: string;
  artists?: string[];
  gst_enabled?: boolean;
  cgst_rate?: string;
  sgst_rate?: string;
  working_hours_start?: string;
  working_hours_end?: string;
  loyalty_rate?: string;
  referral_reward?: string;
}

const DEFAULT_SETTINGS: Settings = {
  studio_name: "Ritesh Tattoo Studio",
  address: "Kolhapur",
  phone: "9876543210",
  gstin: "",
  invoice_footer: "Thank you for visiting!",
  default_discount: "0",
  default_payment_mode: "Cash",
  theme: "cyan",
  language: "en",
  artists: ["Ritesh"],
  gst_enabled: false,
  cgst_rate: "9",
  sgst_rate: "9",
  working_hours_start: "10:00",
  working_hours_end: "20:00",
  loyalty_rate: "5",
  referral_reward: "100",
};

const ALL_KEYS = [
  "ritech_invoices",
  "ritech_expenses",
  "ritech_customers",
  "ritech_notes",
  "ritech_investments",
  "ritech_settings",
  "ritech_appointments",
  "ritech_inventory"
];

// Helper: collect all data from localStorage
function collectAllData() {
  const data: Record<string, unknown> = {};
  ALL_KEYS.forEach(k => {
    try { data[k] = JSON.parse(localStorage.getItem(k) || "null"); } catch { data[k] = null; }
  });
  return data;
}

// Helper: trigger file download
function downloadJSON(data: Record<string, unknown>, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Get current month key e.g. "2026-06"
function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function SettingsPage() {
  const [settings, setSettings, loaded] = useLocalStorage<Settings>("ritech_settings", DEFAULT_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [lastBackupMonth, setLastBackupMonth] = useLocalStorage<string>("ritech_last_backup_month", "");
  const [autoBackupEnabled, setAutoBackupEnabled] = useLocalStorage<boolean>("ritech_auto_backup", true);
  const [backupHistory, setBackupHistory] = useLocalStorage<string[]>("ritech_backup_history", []);

  const [newArtistName, setNewArtistName] = useState("");
  const currentArtists = draftSettings.artists || ["Ritesh"];

  const handleAddArtist = () => {
    if (!newArtistName.trim()) return;
    if (currentArtists.includes(newArtistName.trim())) {
      alert("Artist already exists!");
      return;
    }
    setDraftSettings({
      ...draftSettings,
      artists: [...currentArtists, newArtistName.trim()]
    });
    setNewArtistName("");
  };

  const handleRemoveArtist = (artistName: string) => {
    if (currentArtists.length <= 1) {
      alert("At least one artist must remain!");
      return;
    }
    if (confirm(`Are you sure you want to remove artist '${artistName}'?`)) {
      setDraftSettings({
        ...draftSettings,
        artists: currentArtists.filter(name => name !== artistName)
      });
    }
  };

  useEffect(() => {
    if (loaded) {
      // Merge defaults for missing fields
      setDraftSettings({
        ...DEFAULT_SETTINGS,
        ...settings
      });
    }
  }, [loaded, settings]);

  const savedSettingsRef = useRef(settings);
  useEffect(() => {
    savedSettingsRef.current = settings;
  }, [settings]);

  // Revert preview theme/language if unmounted without saving
  useEffect(() => {
    return () => {
      document.documentElement.setAttribute("data-theme", savedSettingsRef.current.theme || "cyan");
      document.documentElement.lang = savedSettingsRef.current.language || "en";
    };
  }, []);

  // ── Auto Monthly Backup Logic ──
  useEffect(() => {
    if (!autoBackupEnabled) return;
    const thisMonth = currentMonthKey();
    if (lastBackupMonth !== thisMonth) {
      const timer = setTimeout(() => {
        const data = collectAllData();
        const filename = `ritech_auto_backup_${thisMonth}.json`;
        downloadJSON(data, filename);
        setLastBackupMonth(thisMonth);
        setBackupHistory(prev => {
          const list = prev as string[];
          const updated = [thisMonth, ...list.filter(m => m !== thisMonth)].slice(0, 12);
          return updated;
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBackupEnabled]);

  const handleSave = () => {
    setSettings(draftSettings);
    document.documentElement.setAttribute("data-theme", draftSettings.theme || "cyan");
    document.documentElement.lang = draftSettings.language || "en";
    window.dispatchEvent(new Event("ritech_settings_changed"));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    const data = collectAllData();
    const today = new Date().toISOString().slice(0, 10);
    downloadJSON(data, `ritech_backup_${today}.json`);
    const thisMonth = currentMonthKey();
    setLastBackupMonth(thisMonth);
    setBackupHistory(prev => {
      const list = prev as string[];
      return [thisMonth, ...list.filter(m => m !== thisMonth)].slice(0, 12);
    });
  };

  const handleBackupNow = () => {
    const data = collectAllData();
    const thisMonth = currentMonthKey();
    downloadJSON(data, `ritech_backup_${thisMonth}.json`);
    setLastBackupMonth(thisMonth);
    setBackupHistory(prev => {
      const list = prev as string[];
      return [thisMonth, ...list.filter(m => m !== thisMonth)].slice(0, 12);
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        Object.entries(data).forEach(([key, value]) => {
          if (value !== null) localStorage.setItem(key, JSON.stringify(value));
        });
        window.location.reload();
      } catch {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!loaded) return <div className="flex h-full items-center justify-center">Loading...</div>;

  const thisMonth = currentMonthKey();
  const isBackedUpThisMonth = lastBackupMonth === thisMonth;

  return (
    <div className="space-y-6 max-w-2xl pb-12">
      <h1 className="text-2xl lg:text-3xl font-bold text-white">⚙️ Settings</h1>

      {/* Auto Backup Status Banner */}
      <div className={`rounded-2xl p-4 flex items-center justify-between border ${
        isBackedUpThisMonth
          ? "bg-[#1a2e1a] border-green-900/50"
          : "bg-[#2e1a00] border-orange-900/50"
      }`}>
        <div className="flex items-center gap-3">
          <Shield size={20} className={isBackedUpThisMonth ? "text-[var(--success)]" : "text-[var(--warning)]"} />
          <div>
            <p className={`font-bold text-sm ${isBackedUpThisMonth ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
              {isBackedUpThisMonth ? `✅ ${thisMonth} चा backup झाला आहे` : `⚠️ ${thisMonth} चा backup अजून झाला नाही`}
            </p>
            <p className="text-xs text-gray-400">
              {isBackedUpThisMonth ? "तुमचा data safe आहे." : "आत्ता backup घ्या — data safe राहील."}
            </p>
          </div>
        </div>
        {!isBackedUpThisMonth && (
          <button onClick={handleBackupNow}
            className="flex items-center gap-2 bg-[var(--warning)] text-black font-bold text-xs py-2 px-4 rounded-xl hover:opacity-90">
            <Download size={14} /> Backup Now
          </button>
        )}
      </div>

      {/* Studio Settings */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-[var(--accent)]">🏪 Studio Information</h2>

        {([
          ["studio_name", "Studio Name", "text", "Ritesh Tattoo Studio"],
          ["address", "Address", "text", "City, State"],
          ["phone", "Phone Number", "tel", "10-digit number"],
          ["gstin", "GSTIN (optional)", "text", "GST number"],
          ["invoice_footer", "Invoice Footer Message", "text", "Thank you for visiting!"],
          ["default_discount", "Default Discount (₹)", "number", "0"],
        ] as [keyof Settings, string, string, string][]).map(([key, label, type, placeholder]) => (
          <div key={key} className="space-y-1">
            <label className="text-sm text-gray-400">{label}</label>
            <input type={type} placeholder={placeholder}
              value={String(draftSettings[key] ?? "")}
              onChange={e => setDraftSettings({ ...draftSettings, [key]: e.target.value })}
              className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        ))}

        <div className="space-y-1">
          <label className="text-sm text-gray-400">Default Payment Mode</label>
          <select value={draftSettings.default_payment_mode || "Cash"}
            onChange={e => setDraftSettings({ ...draftSettings, default_payment_mode: e.target.value })}
            className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--accent)]">
            {["Cash", "UPI", "Card", "Online Transfer"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <button onClick={handleSave}
          className="flex items-center justify-center gap-2 bg-[var(--accent)] text-black font-bold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity">
          <Save size={18} /> {saved ? "✅ Saved!" : "Save Settings"}
        </button>
      </div>

      {/* 👥 Artists Settings */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Users size={20} className="text-[#a78bfa]" /> 👥 Artists Management (टॅटू आर्टिस्ट्स व्यवस्थापन)
        </h2>
        <p className="text-sm text-gray-400">
          स्टुडिओमध्ये काम करणाऱ्या टॅटू आर्टिस्ट्सची नावे जोडा किंवा काढून टाका.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Artist चे नाव (e.g. Amit)"
            value={newArtistName}
            onChange={e => setNewArtistName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddArtist()}
            className="flex-1 bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <button onClick={handleAddArtist}
            className="bg-[#a78bfa] text-black font-bold px-4 py-2 rounded-xl text-sm hover:opacity-90">
            Add Artist
          </button>
        </div>

        <div className="space-y-1.5 pt-2">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Current Artists</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentArtists.map(art => (
              <div key={art} className="flex items-center justify-between bg-[#1a1a2e] border border-[var(--panel-border)] rounded-xl px-4 py-2.5">
                <span className="text-sm text-white font-medium">{art}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveArtist(art)}
                  className="text-[var(--error)] hover:opacity-80 text-xs font-semibold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🧾 GST Tax Configuration */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield size={20} className="text-[var(--warning)]" /> 🧾 GST Tax Configuration (कर रचना)
        </h2>
        
        <div className="flex items-center justify-between bg-[#1a1a2e] rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Enable GST on Invoices</p>
            <p className="text-xs text-gray-500">पावतीवर GST लागू करा</p>
          </div>
          <button
            onClick={() => setDraftSettings({ ...draftSettings, gst_enabled: !draftSettings.gst_enabled })}
            className={`relative w-12 h-6 rounded-full transition-colors ${draftSettings.gst_enabled ? "bg-[var(--accent)]" : "bg-gray-600"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${draftSettings.gst_enabled ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>

        {draftSettings.gst_enabled && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">CGST Rate (%)</label>
              <input type="number" placeholder="e.g. 9"
                value={draftSettings.cgst_rate || ""}
                onChange={e => setDraftSettings({ ...draftSettings, cgst_rate: e.target.value })}
                className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">SGST Rate (%)</label>
              <input type="number" placeholder="e.g. 9"
                value={draftSettings.sgst_rate || ""}
                onChange={e => setDraftSettings({ ...draftSettings, sgst_rate: e.target.value })}
                className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ⏰ Working Hours (Booking Parameters) */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock size={20} className="text-[#38bdf8]" /> ⏰ Booking Hours (कामाच्या वेळा)
        </h2>
        <p className="text-xs text-gray-400">या वेळेतच नवीन अपॉइंटमेंट बुक करता येतील.</p>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold">Start Time (कामाची सुरुवात)</label>
            <input type="time"
              value={draftSettings.working_hours_start || "10:00"}
              onChange={e => setDraftSettings({ ...draftSettings, working_hours_start: e.target.value })}
              className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold">End Time (काम समाप्ती)</label>
            <input type="time"
              value={draftSettings.working_hours_end || "20:00"}
              onChange={e => setDraftSettings({ ...draftSettings, working_hours_end: e.target.value })}
              className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      {/* 🎁 Loyalty & Referrals Settings */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Palette size={20} className="text-[#a78bfa]" /> 🎁 Loyalty & Referrals (रिवॉर्ड पॉईंट्स)
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold">Loyalty Reward (%)</label>
            <input type="number" placeholder="e.g. 5"
              value={draftSettings.loyalty_rate || "5"}
              onChange={e => setDraftSettings({ ...draftSettings, loyalty_rate: e.target.value })}
              className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
            <span className="text-[10px] text-gray-500">बिलाच्या रकमेवर जमा होणारे पॉईंट्स टक्केवारी</span>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold">Referral Bonus (Points)</label>
            <input type="number" placeholder="e.g. 100"
              value={draftSettings.referral_reward || "100"}
              onChange={e => setDraftSettings({ ...draftSettings, referral_reward: e.target.value })}
              className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
            <span className="text-[10px] text-gray-500">रेफर करणाऱ्या ग्राहकाला मिळणारे पॉईंट्स</span>
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Palette size={20} className="text-[var(--accent)]" /> Theme Customization
        </h2>
        <p className="text-sm text-gray-400">Select a color theme for the application. Changes will apply immediately.</p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { id: "cyan", name: "Cyan", color: "#00FFE1" },
            { id: "emerald", name: "Emerald", color: "#10b981" },
            { id: "rose", name: "Rose", color: "#f43f5e" },
            { id: "amber", name: "Amber", color: "#f59e0b" },
            { id: "violet", name: "Violet", color: "#8b5cf6" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                const newTheme = t.id;
                setDraftSettings({ ...draftSettings, theme: newTheme });
                document.documentElement.setAttribute("data-theme", newTheme);
              }}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                (draftSettings.theme || "cyan") === t.id
                  ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                  : "border-[var(--panel-border)] bg-[#1a1a2e] hover:border-gray-500"
              }`}
            >
              <div className="w-8 h-8 rounded-full shadow-lg" style={{ backgroundColor: t.color }}></div>
              <span className="text-xs font-semibold text-white">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language Settings */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Globe size={20} className="text-[var(--accent)]" /> Language Setting
        </h2>
        <p className="text-sm text-gray-400">Select your preferred language.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { id: "en", name: "English" },
            { id: "mr", name: "मराठी" },
            { id: "hi", name: "हिन्दी" },
          ].map((lang) => (
            <button
              key={lang.id}
              onClick={() => {
                const newLang = lang.id;
                setDraftSettings({ ...draftSettings, language: newLang });
                document.documentElement.lang = newLang;
              }}
              className={`px-3 py-3 rounded-xl text-sm font-medium transition-all border ${
                (draftSettings.language || "en") === lang.id
                  ? "bg-[var(--accent-muted)] border-[var(--accent)] text-[var(--accent)]"
                  : "bg-[#1a1a2e] border-[var(--panel-border)] text-gray-400 hover:border-gray-500"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                {(draftSettings.language || "en") === lang.id && <Check size={16} />}
                {lang.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Auto Backup Settings */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock size={20} className="text-[var(--accent)]" /> Auto Monthly Backup
        </h2>
        <p className="text-sm text-gray-400">
          दर महिन्याच्या पहिल्या login ला automatically backup file download होते.
          File तुमच्या PC च्या Downloads folder मध्ये जाते.
        </p>

        <div className="flex items-center justify-between bg-[#1a1a2e] rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Auto Monthly Backup</p>
            <p className="text-xs text-gray-500">दर महिन्याला auto download</p>
          </div>
          <button
            onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${autoBackupEnabled ? "bg-[var(--accent)]" : "bg-gray-600"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoBackupEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>

        {backupHistory.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Backup History</p>
            <div className="space-y-1">
              {backupHistory.map(month => (
                <div key={month} className="flex items-center justify-between bg-[#1a2e1a] border border-green-900/30 rounded-xl px-4 py-2">
                  <span className="text-sm text-[var(--success)]">✅ {month}</span>
                  <span className="text-xs text-gray-500">Backed up</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Manual Backup & Restore */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">💾 Manual Backup & Restore</h2>
        <p className="text-sm text-gray-400">Manual export करा किंवा जुन्या backup file वरून restore करा.</p>

        <div className="flex flex-wrap gap-4">
          <button onClick={handleExport}
            className="flex items-center gap-2 bg-[var(--success)] text-black font-bold py-2 px-5 rounded-xl hover:opacity-90">
            <Download size={18} /> Export Backup
          </button>

          <label className="flex items-center gap-2 bg-[#1f2937] border border-[var(--panel-border)] text-white font-bold py-2 px-5 rounded-xl hover:bg-[#374151] cursor-pointer">
            <Upload size={18} /> Import Backup
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>

      {/* Save Trigger Banner */}
      <div className="bg-[#1a1a2e] border border-[var(--panel-border)] rounded-2xl p-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">बदल जतन करण्यासाठी सेव्ह करा.</span>
        <button onClick={handleSave}
          className="bg-[var(--accent)] text-black font-bold text-xs py-2 px-5 rounded-xl hover:opacity-90">
          {saved ? "Saved! ✔" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
