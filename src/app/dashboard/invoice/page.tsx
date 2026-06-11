"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { FileText, Printer, Download, MessageCircle, Search, ArrowLeft, Users, Edit3, Image as ImageIcon, Trash2, Check } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

interface Customer { id: string; name: string; mobile: string; address: string; loyalty_points?: number; }
export interface Invoice {
  id: string;
  invoice_no: string;
  customer: string;
  mobile: string;
  gender: string;
  service: string;
  tattoo_type: string;
  body_part: string;
  tattoo_size: string;
  price: number;
  discount: number;
  final: number;
  payment_mode: string;
  payment_status: string;
  ointment: string;
  date: string;
  notes: string;
  artist?: string;
  signature?: string; // Base64 data URL
  tattoo_image?: string; // Base64 compressed JPEG
  gst_enabled?: boolean;
  cgst_rate?: number;
  sgst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  points_earned?: number;
  points_redeemed?: number;
  referred_by?: string;
  consumed_items?: { item_id: string; name: string; quantity: number; unit: string }[];
}

const SERVICES = [
  "Tattoo", "Touchup", "Second Session", "Multiple", "Painting", "Blood Painting",
  "Sketching", "Framing", "Sculpture", "DIY Art", "Coverup Tattoos", "Laser Removal",
];
const TATTOO_TYPES = ["2D", "3D"];
const BODY_PARTS = ["Arm", "Forearm", "Wrist", "Hand", "Chest", "Back", "Shoulder", "Neck", "Leg", "Thigh", "Ankle", "Foot", "Rib", "Other"];
const TATTOO_SIZES = ["Small (1-3 inch)", "Medium (3-6 inch)", "Large (6-10 inch)", "Extra Large (10+ inch)", "Full Sleeve", "Half Sleeve"];
const PAYMENT_MODES = ["Cash", "UPI", "Online"];
const PAYMENT_STATUSES = ["Paid", "Pending"];
const GENDERS = ["Male", "Female", "Other"];

function InvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [customers, setCustomers, customersLoaded]  = useLocalStorage<Customer[]>("ritech_customers", []);
  const [invoices, setInvoices, invoicesLoaded] = useLocalStorage<Invoice[]>("ritech_invoices", []);
  const [settings, , settingsLoaded]    = useLocalStorage<Record<string, any>>("ritech_settings", {});
  const [inventory, setInventory, inventoryLoaded] = useLocalStorage<any[]>("ritech_inventory", []);

  const [customer, setCustomer]         = useState("");
  const [mobile, setMobile]             = useState("");
  const [gender, setGender]             = useState(GENDERS[0]);
  const [service, setService]           = useState(SERVICES[0]);
  const [tattooType, setTattooType]     = useState(TATTOO_TYPES[0]);
  const [price, setPrice]               = useState("");
  const [discount, setDiscount]         = useState("0");
  const [paymentMode, setPaymentMode]   = useState(PAYMENT_MODES[0]);
  const [paymentStatus, setPaymentStatus] = useState(PAYMENT_STATUSES[0]);
  const [ointment, setOintment]         = useState("");
  const [bodyPart, setBodyPart]         = useState(BODY_PARTS[0]);
  const [tattooSize, setTattooSize]     = useState(TATTOO_SIZES[0]);
  const [notes, setNotes]               = useState("");
  const [saved, setSaved]               = useState<Invoice | null>(null);
  const [error, setError]               = useState("");

  // Phase 2 additions
  const [artist, setArtist]             = useState("Ritesh");
  const [showConsent, setShowConsent]   = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const [tattooImage, setTattooImage]   = useState("");
  const [isDrawing, setIsDrawing]       = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editingInvoiceNo, setEditingInvoiceNo] = useState("");
  const [editingDate, setEditingDate] = useState("");

  // Phase 3 additions
  const [redeemPoints, setRedeemPoints] = useState("0");
  const [referredByMobile, setReferredByMobile] = useState("");
  const [consumedItems, setConsumedItems] = useState<{ id: string; name: string; qty: number; unit: string }[]>([]);
  const [printLayout, setPrintLayout] = useState<"standard" | "thermal">("standard");

  // Customer search dropdown
  const [showSuggestions, setShowSuggestions] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  const priceNum    = parseFloat(price) || 0;
  const discountNum = parseFloat(discount) || 0;
  const redeemPointsNum = parseFloat(redeemPoints) || 0;

  const gstEnabled = settings?.gst_enabled || false;
  const cgstRate = parseFloat(settings?.cgst_rate) || 9;
  const sgstRate = parseFloat(settings?.sgst_rate) || 9;

  const billingCalculations = useMemo(() => {
    const base = Math.max(0, priceNum - discountNum - redeemPointsNum);
    if (gstEnabled) {
      const cgst = base * (cgstRate / 100);
      const sgst = base * (sgstRate / 100);
      const final = base + cgst + sgst;
      return { base, cgst, sgst, final };
    } else {
      return { base, cgst: 0, sgst: 0, final: base };
    }
  }, [priceNum, discountNum, redeemPointsNum, gstEnabled, cgstRate, sgstRate]);

  const finalAmount = billingCalculations.final;

  const artistsList = settings?.artists || ["Ritesh"];

  // Filter suggestions
  const suggestions = customers.filter(c =>
    c.name.toLowerCase().includes(customer.toLowerCase()) ||
    c.mobile.includes(customer)
  ).slice(0, 8);

  // Load default settings
  useEffect(() => {
    if (settingsLoaded) {
      if (settings?.default_discount && !editId) setDiscount(settings.default_discount);
      if (settings?.default_payment_mode && !editId) setPaymentMode(settings.default_payment_mode);
      if (settings?.artists?.length > 0 && !editId) setArtist(settings.artists[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, editId]);

  // Match customer mobile automatically
  useEffect(() => {
    const found = customers.find(c => c.name.toLowerCase() === customer.toLowerCase());
    if (found) setMobile(found.mobile);
  }, [customer, customers]);

  // Validate discount vs price
  useEffect(() => {
    if (discountNum > priceNum && priceNum > 0) setError("Discount cannot exceed MRP!");
    else if (error === "Discount cannot exceed MRP!") setError("");
  }, [discountNum, priceNum, error]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load invoice if in edit mode
  useEffect(() => {
    if (invoicesLoaded && editId) {
      const inv = invoices.find(i => i.id === editId);
      if (inv) {
        setCustomer(inv.customer);
        setMobile(inv.mobile);
        setGender(inv.gender || GENDERS[0]);
        setService(inv.service);
        setTattooType(inv.tattoo_type || TATTOO_TYPES[0]);
        setPrice(String(inv.price));
        setDiscount(String(inv.discount));
        setPaymentMode(inv.payment_mode);
        setPaymentStatus(inv.payment_status || PAYMENT_STATUSES[0]);
        setOintment(inv.ointment || "");
        setBodyPart(inv.body_part || BODY_PARTS[0]);
        setTattooSize(inv.tattoo_size || TATTOO_SIZES[0]);
        setNotes(inv.notes || "");
        setArtist(inv.artist || "Ritesh");
        setSignatureData(inv.signature || "");
        setTattooImage(inv.tattoo_image || "");
        setRedeemPoints(String((inv as any).points_redeemed || 0));
        setReferredByMobile((inv as any).referred_by || "");
        setConsumedItems(((inv as any).consumed_items || []).map((x: any) => ({
          id: x.item_id,
          name: x.name,
          qty: x.quantity,
          unit: x.unit
        })));
        setSaved(inv);
        setEditingInvoiceNo(inv.invoice_no);
        setEditingDate(inv.date);
      }
    }
  }, [editId, invoices, invoicesLoaded]);

  // Draw on Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#00FFE1"; // Accent color signature
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData("");
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
          // Compress to 60% quality jpeg to keep Base64 tiny (approx 6-10KB)
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
          setTattooImage(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const genInvNo = () => {
    const now = new Date();
    return `RT${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(Math.floor(Math.random() * 900) + 100)}`;
  };

  const resetForm = () => {
    setCustomer(""); setMobile(""); setGender(GENDERS[0]); setService(SERVICES[0]);
    setTattooType(TATTOO_TYPES[0]); setPrice(""); setDiscount(settings?.default_discount || "0");
    setPaymentMode(settings?.default_payment_mode || PAYMENT_MODES[0]); setPaymentStatus(PAYMENT_STATUSES[0]);
    setBodyPart(BODY_PARTS[0]); setTattooSize(TATTOO_SIZES[0]);
    setOintment(""); setNotes(""); setError("");
    setArtist(artistsList[0] || "Ritesh");
    setSignatureData("");
    setTattooImage("");
    setEditingInvoiceNo(""); setEditingDate("");
    setRedeemPoints("0");
    setReferredByMobile("");
    setConsumedItems([]);
    clearCanvas();
  };

  const handleSubmit = () => {
    if (!customer.trim())                     { setError("Customer name is required."); return; }
    if (!price || isNaN(priceNum) || priceNum <= 0) { setError("Enter a valid MRP."); return; }
    if (discountNum > priceNum)               { setError("Discount cannot exceed MRP!"); return; }

    // Loyalty Calculations
    const loyaltyRate = parseFloat(settings?.loyalty_rate) || 5;
    const pointsEarned = Math.round(finalAmount * (loyaltyRate / 100));

    // Deduct stock from inventory
    if (consumedItems.length > 0) {
      setInventory(prev => {
        return (prev as any[]).map(item => {
          const consumed = consumedItems.find(x => x.id === item.id);
          if (consumed) {
            return { ...item, quantity: Math.max(0, item.quantity - consumed.qty) };
          }
          return item;
        });
      });
    }

    // Update Customer loyalty points
    setCustomers(prev => {
      return (prev as Customer[]).map(c => {
        if (c.mobile === mobile.trim()) {
          const currentPoints = c.loyalty_points || 0;
          return {
            ...c,
            loyalty_points: Math.max(0, currentPoints - redeemPointsNum + pointsEarned)
          };
        }
        return c;
      });
    });

    // Credit referral rewards to referrer
    const referralReward = parseFloat(settings?.referral_reward) || 100;
    if (referredByMobile) {
      setCustomers(prev => {
        return (prev as Customer[]).map(c => {
          if (c.mobile === referredByMobile) {
            const currentPoints = c.loyalty_points || 0;
            return {
              ...c,
              loyalty_points: currentPoints + referralReward
            };
          }
          return c;
        });
      });
    }

    const additionalInvoiceFields = {
      gst_enabled: gstEnabled,
      cgst_rate: gstEnabled ? cgstRate : undefined,
      sgst_rate: gstEnabled ? sgstRate : undefined,
      cgst_amount: gstEnabled ? billingCalculations.cgst : undefined,
      sgst_amount: gstEnabled ? billingCalculations.sgst : undefined,
      points_earned: pointsEarned,
      points_redeemed: redeemPointsNum,
      referred_by: referredByMobile || undefined,
      consumed_items: consumedItems.map(x => ({ item_id: x.id, name: x.name, quantity: x.qty, unit: x.unit })),
    };

    if (editId) {
      // Update existing invoice
      const updatedInvoices = invoices.map((inv) => {
        if (inv.id === editId) {
          const updated: Invoice = {
            ...inv,
            customer: customer.trim(),
            mobile: mobile.trim(),
            gender,
            service,
            tattoo_type: tattooType,
            body_part: bodyPart,
            tattoo_size: tattooSize,
            price: priceNum,
            discount: discountNum,
            final: finalAmount,
            payment_mode: paymentMode,
            payment_status: paymentStatus,
            ointment: ointment.trim(),
            notes: notes.trim(),
            artist,
            signature: signatureData || undefined,
            tattoo_image: tattooImage || undefined,
            ...additionalInvoiceFields
          };
          setSaved(updated);
          return updated;
        }
        return inv;
      });
      setInvoices(updatedInvoices);
      alert("Invoice updated successfully! ✏️");
      router.push("/dashboard/invoice-history");
    } else {
      // Create new invoice
      const inv: Invoice = {
        id: Date.now().toString(),
        invoice_no: genInvNo(),
        customer: customer.trim(),
        mobile: mobile.trim(),
        gender, service,
        tattoo_type: tattooType,
        body_part: bodyPart,
        tattoo_size: tattooSize,
        price: priceNum,
        discount: discountNum,
        final: finalAmount,
        payment_mode: paymentMode,
        payment_status: paymentStatus,
        ointment: ointment.trim(),
        date: new Date().toISOString(),
        notes: notes.trim(),
        artist,
        signature: signatureData || undefined,
        tattoo_image: tattooImage || undefined,
        ...additionalInvoiceFields
      };
      setInvoices(prev => [...(prev as Invoice[]), inv]);
      setSaved(inv);
      resetForm();
    }
  };

  const handleCancelEdit = () => {
    resetForm();
    setSaved(null);
    router.push("/dashboard/invoice-history");
  };

  // ── Print ──
  const handlePrint = () => window.print();

  // ── Download PDF via browser print-to-PDF ──
  const handleDownloadPDF = () => {
    const receipt = document.getElementById("receipt-content");
    if (!receipt) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Invoice ${saved?.invoice_no}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #000; max-width: 400px; margin: auto; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 12px; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
        .label { color: #555; }
        .total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
        .footer { text-align: center; color: #777; font-size: 11px; margin-top: 16px; }
        .receipt-image { width: 150px; height: 150px; object-fit: cover; border-radius: 8px; display: block; margin: 12px auto; }
        .sig-image { width: 110px; height: 40px; object-fit: contain; filter: invert(0); margin-top: 8px; }
      </style></head>
      <body>${receipt.innerHTML}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  // ── WhatsApp Invoice Share ──
  const handleWhatsApp = () => {
    if (!saved) return;
    const studioName = settings?.studio_name || "Ritesh Tattoo Studio";
    const msg = `🧿 *${studioName}*\n` +
      `━━━━━━━━━━━━━━\n` +
      `📄 Invoice: *${saved.invoice_no}*\n` +
      `👤 Customer: *${saved.customer}*\n` +
      `👤 Artist: *${saved.artist || "Ritesh"}*\n` +
      `🎨 Service: *${saved.service}* (${saved.tattoo_type})\n` +
      `📍 Placement: *${saved.body_part}* — *${saved.tattoo_size}*\n` +
      `💰 MRP: ₹${saved.price.toFixed(2)}\n` +
      (saved.discount > 0 ? `🎁 Discount: ₹${saved.discount.toFixed(2)}\n` : "") +
      `✅ *Total: ₹${saved.final.toFixed(2)}*\n` +
      `💳 Payment: ${saved.payment_mode} — ${saved.payment_status}\n` +
      `━━━━━━━━━━━━━━\n` +
      `${settings?.invoice_footer || "Thank you for visiting! 🙏"}`;

    const phone = saved.mobile ? `91${saved.mobile}` : "";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // ── WhatsApp Aftercare instructions ──
  const handleWhatsAppAftercare = () => {
    if (!saved) return;
    const studioName = settings?.studio_name || "Ritesh Tattoo Studio";
    const msg = `🧴 *${studioName} — टॅटू काळजी मार्गदर्शक (Aftercare Guide)* 🧼\n` +
      `━━━━━━━━━━━━━━\n` +
      `Hi *${saved.customer}*, तुमच्या नवीन टॅटूची काळजी घेण्यासाठी खालील नियमांचे पालन करा:\n\n` +
      `1. 🩹 टॅटूवरील मलमपट्टी (Bandage) २ ते ४ तास ठेवा, त्यानंतर काढा.\n` +
      `2. 🧼 कोमट पाण्याने आणि माईल्ड सोपने टॅटू हळूवार स्वच्छ करा, घासू नका. कोरडे झाल्यावर मऊ कापडाने टॅप करा.\n` +
      (saved.ointment ? `3. 🧴 दिवसातून २-३ वेळा *${saved.ointment}* मलम अतिशय पातळ थरात लावा.\n` : `3. 🧴 दिवसातून २-३ वेळा टॅटू आफ्टरकेअर क्रीम अतिशय पातळ थरात लावा.\n`) +
      `4. 🚫 टॅटूला नखे लावू नका, खाजवू नका किंवा त्याची त्वचा सोलण्याचा प्रयत्न करू नका.\n` +
      `5. 🏊 स्विमिंग, अति-उष्णता, थेट सूर्यप्रकाश आणि घट्ट कपडे २ आठवडे टाळा.\n` +
      `━━━━━━━━━━━━━━\n` +
      `${settings?.invoice_footer || "काही अडचण असल्यास संपर्क साधा! 🙏"}`;

    const phone = saved.mobile ? `91${saved.mobile}` : "";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  if (!customersLoaded || !invoicesLoaded || !settingsLoaded || !inventoryLoaded)
    return <div className="flex h-full items-center justify-center">Loading...</div>;

  const studioName    = settings?.studio_name    || "Ritesh Tattoo Studio";
  const studioPhone   = settings?.phone          || "";
  const studioAddress = settings?.address        || "";
  const invoiceFooter = settings?.invoice_footer || "Thank you for visiting! 🙏";

  const inputCls  = "w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--accent)] text-sm";
  const selectCls = inputCls;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="text-[var(--accent)]" /> {editId ? "✏️ Edit Invoice" : "New Invoice"}
        </h1>
        {editId && (
          <button
            onClick={handleCancelEdit}
            className="flex items-center gap-2 text-xs bg-[#1f2937] hover:bg-[#374151] border border-gray-700 text-white px-3 py-2 rounded-xl"
          >
            <ArrowLeft size={14} /> Back to History
          </button>
        )}
      </div>

      {editId && (
        <div className="bg-[#2e2000] border border-[var(--warning)] text-[var(--warning)] rounded-xl p-4 text-xs font-semibold">
          ⚠️ Editing Invoice #{editingInvoiceNo} (Created: {editingDate ? new Date(editingDate).toLocaleString("en-IN") : "Unknown"})
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Form ── */}
        <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-[var(--accent)]">Invoice Details</h2>

          {/* Customer searchable dropdown */}
          <div className="space-y-1" ref={customerRef}>
            <label className="text-xs text-gray-400 font-semibold">Customer Name *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Type name or mobile to search..."
                value={customer}
                onChange={e => { setCustomer(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-[var(--accent)] text-sm"
              />
              {showSuggestions && customer.length > 0 && suggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-[#1e1e2f] border border-[var(--panel-border)] rounded-xl shadow-2xl overflow-hidden">
                  {suggestions.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setCustomer(c.name); setMobile(c.mobile); setShowSuggestions(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#2a2a3b] border-b border-[var(--panel-border)] last:border-0"
                    >
                      <span className="text-white font-medium text-sm">{c.name}</span>
                      <span className="text-gray-400 text-xs ml-2">📞 {c.mobile}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Mobile (auto-filled)</label>
              <input type="text" placeholder="Mobile" value={mobile} maxLength={10}
                onChange={e => setMobile(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className={selectCls}>
                {GENDERS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Service + Tattoo Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Service *</label>
              <select value={service} onChange={e => setService(e.target.value)} className={selectCls}>
                {SERVICES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Tattoo Type</label>
              <select value={tattooType} onChange={e => setTattooType(e.target.value)} className={selectCls}>
                {TATTOO_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Body Placement + Tattoo Size */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Body Placement</label>
              <select value={bodyPart} onChange={e => setBodyPart(e.target.value)} className={selectCls}>
                {BODY_PARTS.map(bp => <option key={bp}>{bp}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Tattoo Size</label>
              <select value={tattooSize} onChange={e => setTattooSize(e.target.value)} className={selectCls}>
                {TATTOO_SIZES.map(ts => <option key={ts}>{ts}</option>)}
              </select>
            </div>
          </div>

          {/* MRP + Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">MRP (₹) *</label>
              <input type="number" placeholder="e.g. 2000" value={price} min="0"
                onChange={e => setPrice(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Discount (₹)</label>
              <input type="number" placeholder="e.g. 200" value={discount} min="0"
                onChange={e => setDiscount(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Artist + Payment Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Tattoo Artist (कलाकार)</label>
              <select value={artist} onChange={e => setArtist(e.target.value)} className={selectCls}>
                {artistsList.map((a: string) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Payment Mode</label>
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className={selectCls}>
                {PAYMENT_MODES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Payment Status + Ointment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Payment Status</label>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className={selectCls}>
                {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Ointment (मलम)</label>
              <input type="text" placeholder="e.g. A,D / Himalaya"
                value={ointment} onChange={e => setOintment(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Referral & Loyalty Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-[var(--panel-border)] pt-3">
            {/* Referral System */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold block">Referred By (कोणाचा संदर्भ?)</label>
              <select
                value={referredByMobile}
                onChange={e => setReferredByMobile(e.target.value)}
                className={selectCls}
              >
                <option value="">None / No Referral</option>
                {customers
                  .filter(c => c.mobile !== mobile.trim())
                  .map(c => (
                    <option key={c.id} value={c.mobile}>
                      {c.name} (📞 {c.mobile})
                    </option>
                  ))}
              </select>
            </div>

            {/* Loyalty Redeem */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold block">
                Loyalty Redeem (pts: {customers.find(c => c.mobile === mobile.trim())?.loyalty_points || 0})
              </label>
              <input
                type="number"
                placeholder="Redeem points"
                value={redeemPoints}
                min="0"
                max={customers.find(c => c.mobile === mobile.trim())?.loyalty_points || 0}
                onChange={e => {
                  const maxPoints = customers.find(c => c.mobile === mobile.trim())?.loyalty_points || 0;
                  const val = Math.min(maxPoints, Math.max(0, parseInt(e.target.value) || 0));
                  setRedeemPoints(String(val));
                }}
                className={inputCls}
              />
            </div>
          </div>

          {/* Upload Tattoo Reference Photo */}
          <div className="bg-[#1a1a2e] border border-[var(--panel-border)] rounded-xl p-4 space-y-2">
            <label className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
              <ImageIcon size={14} className="text-[var(--accent)]" /> Upload Tattoo Photo (रेफरन्स/अंतिम डिझाईन)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 bg-[#252538] hover:bg-[#373752] text-white border border-gray-700 text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-colors font-medium">
                Choose Image File
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {tattooImage ? (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tattooImage} alt="Tattoo preview" className="w-10 h-10 object-cover rounded-md border border-gray-700" />
                  <button type="button" onClick={() => setTattooImage("")} className="text-[var(--error)] hover:opacity-80">
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-gray-500">कोणतीही इमेज जोडलेली नाही (ऑटो-कंप्रेस केली जाईल)</span>
              )}
            </div>
          </div>

          {/* 📦 Material Consumption */}
          <div className="bg-[#1a1a2e] border border-[var(--panel-border)] rounded-xl p-4 space-y-3">
            <label className="text-xs text-gray-400 font-semibold block uppercase tracking-wider">📦 Material Consumed (वापरलेले साहित्य)</label>
            <div className="space-y-2">
              {consumedItems.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between bg-black/35 p-2.5 rounded-lg border border-gray-800 text-xs">
                  <span className="text-white font-medium">{item.name} ({item.unit})</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={e => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setConsumedItems(prev => prev.map((x, i) => i === idx ? { ...x, qty: val } : x));
                      }}
                      className="w-12 bg-black border border-gray-700 text-center rounded py-0.5 text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setConsumedItems(prev => prev.filter((_, i) => i !== idx))}
                      className="text-[var(--error)] hover:opacity-80"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="flex gap-2">
                <select
                  defaultValue=""
                  onChange={e => {
                    const itemId = e.target.value;
                    if (!itemId) return;
                    const found = inventory.find(i => i.id === itemId);
                    if (found) {
                      if (consumedItems.some(x => x.id === itemId)) {
                        alert("Item already added!");
                        e.target.value = "";
                        return;
                      }
                      setConsumedItems(prev => [...prev, { id: found.id, name: found.name, qty: 1, unit: found.unit }]);
                    }
                    e.target.value = "";
                  }}
                  className="flex-1 bg-[#1a1a2e] border border-[var(--panel-border)] text-gray-400 rounded-xl p-2 text-xs"
                >
                  <option value="">+ Add Material Used...</option>
                  {inventory.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.quantity} {i.unit} available)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Expandable Digital Consent Form */}
          <div className="border border-[var(--panel-border)] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowConsent(!showConsent)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1a2e] hover:bg-[#252538] transition-colors"
            >
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Edit3 size={14} className="text-[var(--accent)]" /> 📝 Consent Form & Signature (संमती पत्रक आणि स्वाक्षरी)
              </span>
              <span className="text-xs text-gray-400">{signatureData ? "✅ Signed" : "❌ Unsigned"}</span>
            </button>
            
            {showConsent && (
              <div className="p-4 bg-[#141424] space-y-3">
                <div className="text-[10px] text-gray-400 bg-black/40 p-3 rounded-lg leading-relaxed border border-gray-900">
                  <p className="font-bold text-white mb-1">DECLARATION / संमती पत्रक:</p>
                  I confirm that I am 18 years or older, I do not have any skin allergies or infectious conditions, I am not pregnant or nursing, I am not under the influence of drugs/alcohol, and I consent to the tattoo being drawn entirely at my own risk.
                  <br />
                  <span className="text-gray-500">(मी प्रमाणित करतो की माझे वय १८+ आहे, मला त्वचा ऍलर्जी नाही, आणि मी स्वतःच्या संमतीने व जबाबदारीने टॅटू काढत आहे.)</span>
                </div>
                
                {/* Signature Board */}
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 block font-semibold">Draw signature on box below (खाली स्वाक्षरी काढा):</span>
                  <div className="border border-gray-700 bg-black rounded-lg overflow-hidden relative">
                    <canvas
                      ref={canvasRef}
                      width={340}
                      height={100}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-[100px] cursor-crosshair block"
                    />
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="absolute right-2 bottom-2 bg-[#252538] text-white hover:bg-gray-800 text-[9px] px-2 py-1 rounded"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold">Notes</label>
            <textarea rows={2} placeholder="Additional notes..." value={notes}
              onChange={e => setNotes(e.target.value)}
              className={`${inputCls} resize-none`} />
          </div>

          {/* Final */}
          <div className={`rounded-xl p-4 flex justify-between items-center border ${paymentStatus === "Pending" ? "border-[var(--warning)] bg-[#2a2000]" : "border-[var(--accent)] bg-[#0d1a1a]"}`}>
            <div>
              <span className="text-gray-300 font-medium text-sm">Final Amount</span>
              {paymentStatus === "Pending" && <span className="ml-2 text-xs text-[var(--warning)] font-bold">⏳ PENDING</span>}
            </div>
            <span className="text-xl font-bold text-[var(--accent)]">
              ₹ {finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          {error && <p className="text-[var(--error)] text-sm">{error}</p>}

          <div className="flex gap-3">
            {editId && (
              <button onClick={handleCancelEdit}
                className="w-1/3 border border-[var(--panel-border)] text-gray-400 font-bold py-3 rounded-xl hover:bg-[#2a2a3b]">
                Cancel
              </button>
            )}
            <button onClick={handleSubmit}
              className={`font-bold py-3 rounded-xl hover:opacity-90 ${editId ? "w-2/3 bg-gradient-to-r from-[var(--warning)] to-[#ff8800] text-black" : "w-full bg-gradient-to-r from-[var(--accent)] to-[#00b3ff] text-black"}`}>
              {editId ? "💾 Update Invoice" : "💾 Save Invoice"}
            </button>
          </div>
        </div>

        {/* ── Receipt Preview ── */}
        <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-white">🧾 Receipt Preview</h2>
          </div>

          {saved ? (
            <>
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={handlePrint}
                  className="flex items-center gap-2 text-xs bg-[#1f2937] border border-gray-700 text-white px-3 py-2 rounded-xl hover:bg-[#374151]">
                  <Printer size={14} /> Print
                </button>
                <button onClick={handleDownloadPDF}
                  className="flex items-center gap-2 text-xs bg-[#1a3a1a] border border-green-900/50 text-[var(--success)] px-3 py-2 rounded-xl hover:opacity-80">
                  <Download size={14} /> Download PDF
                </button>
                <button onClick={handleWhatsApp}
                  className="flex items-center gap-2 text-xs bg-[#1a3a1a] border border-green-900/50 text-[#25D366] px-3 py-2 rounded-xl hover:opacity-80">
                  <MessageCircle size={14} /> WhatsApp Invoice
                </button>
                <button onClick={handleWhatsAppAftercare}
                  className="flex items-center gap-2 text-xs bg-[#1f2f3a] border border-[#2a3f4a] text-[var(--accent)] px-3 py-2 rounded-xl hover:opacity-80">
                  🧴 Send Aftercare
                </button>
              </div>

              {/* Print Layout Selector */}
              <div className="flex items-center bg-[#1a1a2e] border border-[var(--panel-border)] p-1 rounded-xl mb-4 w-fit">
                <button
                  onClick={() => setPrintLayout("standard")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${printLayout === "standard" ? "bg-[var(--accent)] text-black" : "text-gray-400 hover:text-white"}`}
                >
                  Standard A4 Layout
                </button>
                <button
                  onClick={() => setPrintLayout("thermal")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${printLayout === "thermal" ? "bg-[var(--accent)] text-black" : "text-gray-400 hover:text-white"}`}
                >
                  3-inch Thermal Receipt
                </button>
              </div>

              {/* Receipt Card */}
              <div id="receipt-content" className={`bg-[#0d0d1a] border border-[var(--panel-border)] rounded-xl p-5 space-y-3 text-sm ${printLayout === "thermal" ? "thermal-receipt-view" : "standard-receipt-view"}`}>
                {/* Studio Header */}
                <div className="text-center border-b border-[var(--panel-border)] pb-4">
                  <p className="text-lg font-bold text-[var(--accent)]">🧿 {studioName}</p>
                  {studioAddress && <p className="text-gray-400 text-xs">{studioAddress}</p>}
                  {studioPhone   && <p className="text-gray-400 text-xs">📞 {studioPhone}</p>}
                  <p className="text-gray-500 text-xs mt-1">Invoice# {saved.invoice_no}</p>
                  <p className="text-gray-500 text-xs">{new Date(saved.date).toLocaleString("en-IN")}</p>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <span className="text-gray-500">Customer</span>
                  <span className="text-white font-semibold">{saved.customer}</span>
                  {saved.mobile && <><span className="text-gray-500">Mobile</span><span className="text-gray-300">{saved.mobile}</span></>}
                  <span className="text-gray-500">Gender</span>
                  <span className="text-gray-300">{saved.gender}</span>
                  <span className="text-gray-500">Artist (कलाकार)</span>
                  <span className="text-white font-medium">{saved.artist || "Ritesh"}</span>
                  <span className="text-gray-500">Service</span>
                  <span className="text-gray-300">{saved.service}</span>
                  <span className="text-gray-500">Tattoo Type</span>
                  <span className="text-gray-300">{saved.tattoo_type}</span>
                  
                  {/* Added Placement and Size */}
                  <span className="text-gray-500">Placement</span>
                  <span className="text-gray-300">{saved.body_part || "—"}</span>
                  <span className="text-gray-500">Tattoo Size</span>
                  <span className="text-gray-300">{saved.tattoo_size || "—"}</span>

                  <span className="text-gray-500">Payment</span>
                  <span className="text-gray-300">{saved.payment_mode}</span>
                  <span className="text-gray-500">Status</span>
                  <span className={`font-bold ${saved.payment_status === "Pending" ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                    {saved.payment_status}
                  </span>
                  {saved.ointment && (
                    <><span className="text-gray-500">Ointment</span><span className="text-gray-300">{saved.ointment}</span></>
                  )}
                </div>

                {/* Render tattoo image in invoice if exists */}
                {saved.tattoo_image && (
                  <div className="border-t border-b border-[var(--panel-border)] py-3 text-center">
                    <span className="text-[10px] text-gray-500 block mb-1">TATTOO PHOTO / टॅटू फोटो:</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={saved.tattoo_image} alt="Tattoo Design" className="receipt-image max-w-[120px] max-h-[120px] rounded-lg border border-gray-800 mx-auto object-cover" />
                  </div>
                )}

                {/* Consumed Materials */}
                {(saved as any).consumed_items && (saved as any).consumed_items.length > 0 && (
                  <div className="border-t border-[var(--panel-border)] pt-3 text-xs space-y-1">
                    <span className="text-gray-500 block">Consumed Materials (साहित्य वापर):</span>
                    {(saved as any).consumed_items.map((item: any) => (
                      <div key={item.item_id} className="flex justify-between text-[10px] text-gray-400">
                        <span>• {item.name}</span>
                        <span>{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pricing */}
                <div className="border-t border-[var(--panel-border)] pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">MRP</span>
                    <span className="text-gray-300">₹ {saved.price.toFixed(2)}</span>
                  </div>
                  {saved.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Discount</span>
                      <span className="text-[var(--error)]">- ₹ {saved.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {saved.points_redeemed !== undefined && saved.points_redeemed > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Loyalty Redeemed</span>
                      <span className="text-[var(--error)]">- ₹ {(saved.points_redeemed || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {saved.gst_enabled && saved.cgst_amount !== undefined && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">CGST ({saved.cgst_rate}%)</span>
                        <span className="text-gray-300">₹ {(saved.cgst_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">SGST ({saved.sgst_rate}%)</span>
                        <span className="text-gray-300">₹ {(saved.sgst_amount || 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-base border-t border-[var(--panel-border)] pt-2 mt-1">
                    <span className="text-white">Total</span>
                    <span className="text-[var(--accent)]">₹ {saved.final.toFixed(2)}</span>
                  </div>
                  {saved.points_earned !== undefined && saved.points_earned > 0 && (
                    <div className="flex justify-between text-[var(--success)] font-semibold border-t border-dashed border-gray-800 pt-1 mt-1">
                      <span>Loyalty Points Earned</span>
                      <span>+ {saved.points_earned} pts</span>
                    </div>
                  )}
                  {(saved as any).referred_by && (
                    <div className="flex justify-between text-gray-500 mt-1">
                      <span>Referral</span>
                      <span>{(saved as any).referred_by}</span>
                    </div>
                  )}
                </div>

                {saved.notes && (
                  <p className="text-gray-400 text-xs border-t border-[var(--panel-border)] pt-3">📝 {saved.notes}</p>
                )}

                {/* Render signature if exists */}
                {saved.signature && (
                  <div className="border-t border-[var(--panel-border)] pt-3 text-right">
                    <span className="text-[9px] text-gray-500 block">Customer Signature / ग्राहकाची सही:</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={saved.signature} alt="Customer Signature" className="sig-image inline-block filter invert mt-1" />
                  </div>
                )}

                <p className="text-center text-gray-500 text-[10px] pt-1">{invoiceFooter}</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
              <FileText size={48} className="opacity-20" />
              <p className="text-sm">Fill the form and save to preview receipt</p>
            </div>
          )}
        </div>
      </div>

      {/* Print styles — FIXED: correct element ID */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #receipt-content.standard-receipt-view {
            display: block !important;
            background: white !important;
            color: black !important;
            padding: 20px;
            width: 100% !important;
          }
          #receipt-content.thermal-receipt-view {
            display: block !important;
            background: white !important;
            color: black !important;
            padding: 5px;
            width: 3in !important;
            max-width: 3in !important;
            font-size: 10px !important;
          }
          #receipt-content.thermal-receipt-view .text-lg { font-size: 14px !important; }
          #receipt-content.thermal-receipt-view .text-sm { font-size: 10px !important; }
          #receipt-content.thermal-receipt-view .text-xs { font-size: 9px !important; }
          #receipt-content.thermal-receipt-view .receipt-image { width: 100px !important; height: 100px !important; }
          #receipt-content.thermal-receipt-view .sig-image { width: 80px !important; height: 30px !important; }
          .sig-image { filter: invert(0) !important; } /* Make sure signature prints dark */
        }
        /* Screen preview styling for thermal */
        .thermal-receipt-view {
          max-width: 3in !important;
          margin: 0 auto;
          font-size: 11px !important;
        }
        .thermal-receipt-view .text-sm { font-size: 11px !important; }
        .thermal-receipt-view .text-xs { font-size: 10px !important; }
        .thermal-receipt-view .receipt-image { width: 100px !important; height: 100px !important; }
        .thermal-receipt-view .sig-image { width: 80px !important; height: 30px !important; }
      `}</style>
    </div>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-gray-400">Loading form...</div>}>
      <InvoiceForm />
    </Suspense>
  );
}
