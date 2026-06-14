import React, { useEffect, useState } from "react";
import axios from "axios";

export default function BlueprintSelector({ examId, onSaved }) {
  const [blueprints, setBlueprints] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await axios.get("/api/blueprints");
        setBlueprints(res.data.data || []);
      } catch (err) {
        console.error("Failed to load blueprints", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!examId) return;
    // Could fetch current linked blueprints for exam here if needed
  }, [examId]);

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function save() {
    if (!examId) return;
    setSaving(true);
    try {
      const ids = Array.from(selected);
      await axios.post(`/api/exams/${examId}/blueprints`, { blueprintIds: ids });
      if (onSaved) onSaved(ids);
    } catch (err) {
      console.error("Failed to save blueprints", err);
      alert("Failed to save blueprints. See console for details.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading blueprints...</div>;

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="text-lg font-medium mb-2">Select Blueprints</h3>
      <div className="max-h-64 overflow-auto mb-3">
        {blueprints.length === 0 && <div className="text-sm text-gray-500">No blueprints available.</div>}
        <ul>
          {blueprints.map((bp) => (
            <li key={bp.id} className="flex items-center gap-2 py-1">
              <input
                id={`bp-${bp.id}`}
                type="checkbox"
                checked={selected.has(bp.id)}
                onChange={() => toggle(bp.id)}
              />
              <label htmlFor={`bp-${bp.id}`} className="text-sm">{bp.title || bp.template_text?.slice(0,80)}</label>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Selection"}
        </button>
      </div>
    </div>
  );
}
