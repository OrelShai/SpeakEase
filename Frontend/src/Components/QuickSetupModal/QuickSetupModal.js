import React, { useEffect, useState } from "react";
import "./QuickSetupModal.css";

const DURATION_OPTIONS_MIN = [5, 10, 15, 20];
const DEFAULT_DURATION_MIN = 10;
const MAX_NOTES_LEN = 500;

export default function QuickSetupModal({
  isOpen,
  scenarioId,
  scenarioName,
  onClose,
  onStart, // async function({ durationMin, notes }) -> should return saved doc or id
  isRtl = true,
}) {
  const [durationMin, setDurationMin] = useState(DEFAULT_DURATION_MIN);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDurationMin(DEFAULT_DURATION_MIN);
      setNotes("");
      setError("");
      setLoading(false);
    }
  }, [isOpen, scenarioId]);

  if (!isOpen) return null;

  const handleStart = async () => {
    setError("");

    if (!DURATION_OPTIONS_MIN.includes(Number(durationMin))) {
      setError("Please choose a valid duration.");
      return;
    }
    if (notes.length > MAX_NOTES_LEN) {
      setError(`Notes must be at most ${MAX_NOTES_LEN} characters.`);
      return;
    }

    try {
      setLoading(true);
      const result = await onStart?.({
        durationMin: Number(durationMin),
        notes: notes.trim(),
      });
      // parent handles navigation on success
    } catch (e) {
      setError(
        e?.message || "Failed to start scenario. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("qs-modal-overlay")) {
      onClose?.();
    }
  };

  const dir = isRtl ? "rtl" : "ltr";

  return (
    <div className="qs-modal-overlay" onClick={handleOverlayClick}>
      <div className="qs-modal">
        <div className="qs-header">
          <h3>Quick Setup</h3>
        </div>

        <div className="qs-body">
          <label className="qs-label">Scenario</label>
          <input className="qs-input" value={scenarioName || ""} readOnly />

          <label className="qs-label">Duration (minutes)</label>
          <select
            className="qs-select"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
          >
            {DURATION_OPTIONS_MIN.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <label className="qs-label">Notes (optional)</label>
          <textarea
            className="qs-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={MAX_NOTES_LEN}
            placeholder="Add any details or goals for this session…"
          />

          {error && <div className="qs-error">{error}</div>}
        </div>

        <div className="qs-footer">
          <button className="qs-btn ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="qs-btn primary" onClick={handleStart} disabled={loading}>
            {loading ? "Starting…" : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}
