"use client";

import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { PlusCircle, Search, Edit2, Trash2, ChevronDown, ChevronRight, Package, AlertTriangle, Plus, Minus } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  reorder_level: number;
  unit: string;
}

const CATEGORIES = ["Needles", "Inks", "Sanitization", "Ointments", "Stencil Paper", "Other"];
const UNITS = ["pcs", "ml", "bottle", "box", "pack", "roll"];

export default function InventoryPage() {
  const [inventory, setInventory, loaded] = useLocalStorage<InventoryItem[]>("ritech_inventory", []);

  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quantity, setQuantity] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [unit, setUnit] = useState(UNITS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setName("");
    setCategory(CATEGORIES[0]);
    setQuantity("");
    setReorderLevel("");
    setUnit(UNITS[0]);
    setEditingId(null);
    setError("");
  };

  const saveItem = () => {
    if (!name.trim()) { setError("Item Name is required."); return; }
    if (quantity === "" || isNaN(Number(quantity)) || Number(quantity) < 0) { setError("Enter a valid quantity."); return; }
    if (reorderLevel === "" || isNaN(Number(reorderLevel)) || Number(reorderLevel) < 0) { setError("Enter a valid reorder level."); return; }

    const qty = Number(quantity);
    const reorder = Number(reorderLevel);

    if (editingId) {
      setInventory(prev => (prev as InventoryItem[]).map(item =>
        item.id === editingId
          ? { ...item, name: name.trim(), category, quantity: qty, reorder_level: reorder, unit }
          : item
      ));
    } else {
      if (inventory.some(i => i.name.toLowerCase() === name.trim().toLowerCase())) {
        setError("Item with this name already exists in inventory!");
        return;
      }
      const newItem: InventoryItem = {
        id: Date.now().toString(),
        name: name.trim(),
        category,
        quantity: qty,
        reorder_level: reorder,
        unit
      };
      setInventory(prev => [...(prev as InventoryItem[] || []), newItem]);
    }
    resetForm();
  };

  const editItem = (item: InventoryItem) => {
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category);
    setQuantity(String(item.quantity));
    setReorderLevel(String(item.reorder_level));
    setUnit(item.unit);
    setError("");
  };

  const deleteItem = (id: string) => {
    if (confirm("Delete this item from inventory?")) {
      setInventory(prev => (prev as InventoryItem[]).filter(i => i.id !== id));
    }
  };

  // Quick adjust stock count
  const adjustStock = (id: string, amount: number) => {
    setInventory(prev => (prev as InventoryItem[]).map(item => {
      if (item.id === id) {
        const nextQty = Math.max(0, item.quantity + amount);
        return { ...item, quantity: nextQty };
      }
      return item;
    }));
  };

  const filteredItems = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
      const matchesLowStock = !filterLowStock || item.quantity <= item.reorder_level;
      return matchesSearch && matchesCat && matchesLowStock;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, search, selectedCategory, filterLowStock]);

  const lowStockCount = useMemo(() => {
    if (!inventory) return 0;
    return inventory.filter(i => i.quantity <= i.reorder_level).length;
  }, [inventory]);

  if (!loaded) return <div className="flex h-full items-center justify-center">Loading Inventory...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2.5">
            <Package className="text-[var(--accent)]" /> Stock & Inventory Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">स्टुडिओ सुया, शाई आणि इतर साहित्याचा हिशोब ठेवा.</p>
        </div>
      </div>

      {/* Low Stock Warning Header */}
      {lowStockCount > 0 && (
        <div className="bg-[#3d1c1c] border border-[var(--error)] rounded-2xl p-4 text-[#ff8888] flex items-center gap-3">
          <AlertTriangle className="text-[var(--error)] shrink-0" size={24} />
          <div>
            <p className="font-bold text-sm">कमी स्टॉक अलर्ट (Low Stock Alert!)</p>
            <p className="text-xs text-gray-400 mt-0.5">{lowStockCount} साहित्याचा स्टॉक संपत आला आहे. कृपया खरेदी करा.</p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-[var(--accent)] mb-4">
          {editingId ? "✏️ Edit Inventory Item" : "➕ Add New Stock Item"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold">Item Name *</label>
            <input
              type="text" placeholder="e.g. Needle 3RL" value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--accent)] text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold">Category *</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--accent)] text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold">Current Quantity *</label>
            <input
              type="number" placeholder="e.g. 50" value={quantity} min="0"
              onChange={e => setQuantity(e.target.value)}
              className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--accent)] text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold">Reorder Level *</label>
            <input
              type="number" placeholder="e.g. 10" value={reorderLevel} min="0"
              onChange={e => setReorderLevel(e.target.value)}
              className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--accent)] text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold">Unit (एकक) *</label>
            <select value={unit} onChange={e => setUnit(e.target.value)}
              className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--accent)] text-sm">
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        
        {error && <p className="text-[var(--error)] text-sm mt-2">{error}</p>}
        
        <div className="flex gap-3 mt-4">
          <button onClick={saveItem}
            className="bg-gradient-to-r from-[var(--accent)] to-[#00b3ff] text-black font-bold py-2 px-6 rounded-xl flex items-center gap-2 hover:opacity-90">
            <PlusCircle size={18} /> {editingId ? "Update Item" : "Add Stock"}
          </button>
          {editingId && (
            <button onClick={resetForm}
              className="border border-[var(--panel-border)] text-gray-400 py-2 px-6 rounded-xl hover:bg-[#2a2a3b]">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text" placeholder="Search items..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
            className="bg-[#1a1a2e] text-white border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]">
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filterLowStock}
              onChange={e => setFilterLowStock(e.target.checked)}
              className="rounded text-[var(--accent)] focus:ring-[var(--accent)] bg-[#1a1a2e] border-gray-700 w-4 h-4"
            />
            <span>⚠️ Low Stock Only</span>
          </label>
        </div>

        <div className="text-xs text-gray-400">
          {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Stock List */}
      <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-2xl overflow-x-auto">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No inventory items found.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#1a1a2e]">
                {["S/N", "Item Name", "Category", "Stock Count", "Quick Adjust", "Reorder Level", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-[var(--warning)] font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, i) => {
                const isLow = item.quantity <= item.reorder_level;
                return (
                  <tr key={item.id} className={`border-t border-[var(--panel-border)] hover:bg-[#2a2a3b] transition-colors ${isLow ? "bg-[#3d1c1c]/10" : ""}`}>
                    <td className="px-5 py-4 text-gray-400">{i + 1}</td>
                    <td className="px-5 py-4 font-semibold text-white">
                      {item.name}
                      {isLow && <span className="ml-2 text-[9px] bg-red-950 text-red-400 border border-red-900/50 px-1.5 py-0.5 rounded-full font-bold">⚠️ LOW</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="bg-[#1f2937] text-gray-300 px-2 py-0.5 rounded-lg text-xs">{item.category}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`text-base font-bold font-mono ${isLow ? "text-[var(--error)]" : "text-white"}`}>
                        {item.quantity}
                      </span>
                      <span className="text-gray-400 text-xs ml-1 font-medium">{item.unit}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => adjustStock(item.id, -1)}
                          className="bg-[#252538] hover:bg-[#373752] border border-gray-700 text-white rounded p-1"
                          title="Decrease Stock (-1)"
                        >
                          <Minus size={11} />
                        </button>
                        <button
                          onClick={() => adjustStock(item.id, 1)}
                          className="bg-[#252538] hover:bg-[#373752] border border-gray-700 text-white rounded p-1"
                          title="Increase Stock (+1)"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-400 font-mono">
                      {item.reorder_level} {item.unit}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => editItem(item)} className="text-[var(--accent)] hover:opacity-80" title="Edit Item">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteItem(item.id)} className="text-[var(--error)] hover:opacity-80" title="Delete Item">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
