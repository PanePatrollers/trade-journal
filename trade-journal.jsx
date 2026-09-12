import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Calendar, BarChart2 } from "lucide-react";

const STORAGE_KEY = "tradejournal:v1";

const C = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  sub: "#8E8E93",
  sep: "#E5E5EA",
  fill: "#F6F6F9",
  green: "#34C759",
  greenInk: "#1B7F3B",
  greenSoft: "rgba(52,199,89,0.16)",
  red: "#FF3B30",
  redInk: "#C0271D",
  redSoft: "rgba(255,59,48,0.13)",
};

const ACCOUNTS = {
  live: { label: "Live", title: "Live account", accent: "#007AFF", soft: "rgba(0,122,255,0.12)" },
  paper: { label: "Paper", title: "Paper trading", accent: "#AF52DE", soft: "rgba(175,82,222,0.12)" },
};

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const amount = (n) => {
  const a = Math.abs(n);
  return a.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(a) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};
const signed = (n) => `${n > 0 ? "+" : n < 0 ? "-" : ""}$${amount(n)}`;
const compact = (n) => {
  if (n === 0) return "0";
  const a = Math.abs(n);
  const body = a >= 1000 ? `${(a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : Math.round(a);
  return `${n > 0 ? "+" : "-"}${body}`;
};
const inkFor = (n) => (n > 0 ? C.greenInk : n < 0 ? C.redInk : C.sub);

function buildWeeks(y, m) {
  const lead = new Date(y, m, 1).getDay();
  const total = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(toISO(new Date(y, m, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/* ---------------------------------- bits --------------------------------- */

function Segmented({ value, onChange }) {
  return (
    <div className="flex w-full p-1" style={{ background: "#E9E9EB", borderRadius: 999 }}>
      {Object.keys(ACCOUNTS).map((k) => {
        const on = value === k;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className="flex-1 py-2 text-sm font-semibold transition-all active:opacity-60"
            style={{
              borderRadius: 999,
              background: on ? "#FFFFFF" : "transparent",
              color: on ? ACCOUNTS[k].accent : C.sub,
              boxShadow: on ? "0 2px 6px rgba(0,0,0,0.10)" : "none",
            }}
          >
            {ACCOUNTS[k].label}
          </button>
        );
      })}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: C.card, borderRadius: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", ...style }}>
      {children}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-base font-bold" style={{ color: color || "#000" }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: C.sub }}>{label}</div>
    </div>
  );
}

/* -------------------------------- calendar -------------------------------- */

function JournalView({ trades, cfg, cursor, setCursor, onOpenDay }) {
  const todayISO = toISO(new Date());

  const byDay = useMemo(() => {
    const map = {};
    for (const t of trades) {
      if (!map[t.date]) map[t.date] = { pnl: 0, n: 0, wins: 0 };
      map[t.date].pnl += t.pnl;
      map[t.date].n += 1;
      if (t.pnl > 0) map[t.date].wins += 1;
    }
    return map;
  }, [trades]);

  const weeks = useMemo(() => buildWeeks(cursor.y, cursor.m), [cursor]);

  const month = useMemo(() => {
    const prefix = `${cursor.y}-${pad(cursor.m + 1)}`;
    const list = trades.filter((t) => t.date.startsWith(prefix));
    const pnl = list.reduce((s, t) => s + t.pnl, 0);
    const wins = list.filter((t) => t.pnl > 0).length;
    const decided = list.filter((t) => t.pnl !== 0).length;
    const greens = Object.keys(byDay).filter((d) => d.startsWith(prefix) && byDay[d].pnl > 0).length;
    return { pnl, n: list.length, rate: decided ? Math.round((wins / decided) * 100) : 0, greens };
  }, [trades, cursor, byDay]);

  const step = (dir) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + dir, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const isThisMonth = cursor.y === new Date().getFullYear() && cursor.m === new Date().getMonth();

  return (
    <div className="px-4 pb-4" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* month total */}
      <Card style={{ padding: "22px 20px" }}>
        <div className="text-xs font-semibold" style={{ color: C.sub }}>
          {MONTHS[cursor.m]} · {cfg.title}
        </div>
        <div className="font-bold" style={{ fontSize: 40, letterSpacing: -1.4, color: inkFor(month.pnl), lineHeight: 1.15 }}>
          {signed(month.pnl)}
        </div>
        <div className="flex mt-4 pt-4" style={{ borderTop: `1px solid ${C.sep}` }}>
          <Stat label="Trades" value={month.n} />
          <Stat label="Win rate" value={`${month.rate}%`} />
          <Stat label="Green days" value={month.greens} />
        </div>
      </Card>

      {/* calendar */}
      <Card style={{ padding: 14 }}>
        <div className="flex items-center justify-between px-1 pb-2">
          <button onClick={() => step(-1)} className="p-2 active:opacity-40" style={{ color: cfg.accent }}>
            <ChevronLeft size={22} strokeWidth={2.6} />
          </button>
          <button
            onClick={() => {
              const d = new Date();
              setCursor({ y: d.getFullYear(), m: d.getMonth() });
            }}
            className="text-base font-bold active:opacity-40"
          >
            {MONTHS[cursor.m]} {cursor.y}
            {!isThisMonth && <span className="ml-2 text-xs font-semibold" style={{ color: cfg.accent }}>Today</span>}
          </button>
          <button onClick={() => step(1)} className="p-2 active:opacity-40" style={{ color: cfg.accent }}>
            <ChevronRight size={22} strokeWidth={2.6} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 pb-1">
          {DOW.map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold" style={{ color: C.sub }}>
              {d[0]}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((iso, i) => {
            if (!iso) return <div key={i} className="aspect-square" />;
            const day = byDay[iso];
            const p = day ? day.pnl : null;
            const bg = p === null ? C.fill : p > 0 ? C.greenSoft : p < 0 ? C.redSoft : C.fill;
            return (
              <button
                key={i}
                onClick={() => onOpenDay(iso)}
                className="aspect-square flex flex-col items-center justify-center active:opacity-50 transition-opacity"
                style={{
                  borderRadius: 14,
                  background: bg,
                  border: iso === todayISO ? `2px solid ${cfg.accent}` : "2px solid transparent",
                }}
              >
                <span className="text-xs font-semibold" style={{ color: p === null ? "#AEAEB2" : inkFor(p) }}>
                  {Number(iso.slice(8))}
                </span>
                {day && (
                  <span className="font-bold" style={{ fontSize: 10, color: inkFor(p), marginTop: 1 }}>
                    {compact(p)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* weekly */}
      <Card style={{ padding: "6px 18px" }}>
        {weeks.map((w, i) => {
          const days = w.filter(Boolean);
          if (!days.length) return null;
          const pnl = days.reduce((s, d) => s + (byDay[d] ? byDay[d].pnl : 0), 0);
          const n = days.reduce((s, d) => s + (byDay[d] ? byDay[d].n : 0), 0);
          const a = fromISO(days[0]);
          const b = fromISO(days[days.length - 1]);
          return (
            <div
              key={i}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: i < weeks.length - 1 ? `1px solid ${C.sep}` : "none" }}
            >
              <div>
                <div className="text-sm font-semibold">Week {i + 1}</div>
                <div className="text-xs" style={{ color: C.sub }}>
                  {MONTHS_SHORT[a.getMonth()]} {a.getDate()} – {MONTHS_SHORT[b.getMonth()]} {b.getDate()} · {n} {n === 1 ? "trade" : "trades"}
                </div>
              </div>
              <div className="text-base font-bold" style={{ color: inkFor(pnl) }}>{signed(pnl)}</div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ------------------------------- add a trade ------------------------------ */

function AddView({ account, setAccount, onSave }) {
  const [win, setWin] = useState(true);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(toISO(new Date()));
  const [symbol, setSymbol] = useState("");
  const [note, setNote] = useState("");

  const cfg = ACCOUNTS[account];
  const num = parseFloat(value);
  const valid = !Number.isNaN(num) && num > 0;

  const handleValue = (v) => {
    const clean = v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setValue(clean);
  };

  const save = () => {
    if (!valid) return;
    onSave({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      account,
      date,
      pnl: win ? num : -num,
      symbol: symbol.trim(),
      note: note.trim(),
    });
    setValue("");
    setSymbol("");
    setNote("");
    setWin(true);
  };

  const field = {
    background: C.fill,
    borderRadius: 16,
    border: "none",
    outline: "none",
    width: "100%",
    padding: "14px 16px",
    fontSize: 16,
    fontFamily: FONT,
  };

  return (
    <div className="px-4 pb-4" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 1. account */}
      <Card style={{ padding: 18 }}>
        <div className="text-sm font-semibold mb-3">Which account?</div>
        <div className="grid grid-cols-2 gap-3">
          {Object.keys(ACCOUNTS).map((k) => {
            const a = ACCOUNTS[k];
            const on = account === k;
            return (
              <button
                key={k}
                onClick={() => setAccount(k)}
                className="py-4 transition-all active:opacity-60"
                style={{
                  borderRadius: 20,
                  background: on ? a.accent : C.fill,
                  color: on ? "#fff" : "#000",
                  boxShadow: on ? `0 6px 16px ${a.soft}` : "none",
                }}
              >
                <div className="text-base font-bold">{a.label}</div>
                <div className="text-xs" style={{ color: on ? "rgba(255,255,255,0.85)" : C.sub }}>
                  {k === "live" ? "Real money" : "Practice"}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 2. realized pnl */}
      <Card style={{ padding: 18 }}>
        <div className="text-sm font-semibold mb-3">Realized P&amp;L</div>
        <div className="flex p-1 mb-3" style={{ background: "#E9E9EB", borderRadius: 999 }}>
          {[true, false].map((w) => (
            <button
              key={String(w)}
              onClick={() => setWin(w)}
              className="flex-1 py-2 text-sm font-semibold active:opacity-60"
              style={{
                borderRadius: 999,
                background: win === w ? "#fff" : "transparent",
                color: win === w ? (w ? C.greenInk : C.redInk) : C.sub,
                boxShadow: win === w ? "0 2px 6px rgba(0,0,0,0.10)" : "none",
              }}
            >
              {w ? "Win" : "Loss"}
            </button>
          ))}
        </div>
        <div
          className="flex items-center"
          style={{ background: win ? C.greenSoft : C.redSoft, borderRadius: 20, padding: "14px 18px" }}
        >
          <span className="font-bold" style={{ fontSize: 30, color: inkFor(win ? 1 : -1) }}>
            {win ? "+$" : "-$"}
          </span>
          <input
            value={value}
            onChange={(e) => handleValue(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="flex-1 font-bold"
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 30,
              width: "100%",
              color: inkFor(win ? 1 : -1),
              fontFamily: FONT,
              letterSpacing: -0.8,
            }}
          />
        </div>
      </Card>

      {/* 3. details */}
      <Card style={{ padding: 18 }}>
        <div className="text-sm font-semibold mb-3">Details</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={field} />
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase().slice(0, 12))}
            placeholder="Symbol (optional)"
            style={field}
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notes (optional)"
            rows={3}
            style={{ ...field, resize: "none" }}
          />
        </div>
      </Card>

      <button
        onClick={save}
        disabled={!valid}
        className="w-full py-4 text-base font-bold transition-all active:opacity-60"
        style={{
          borderRadius: 999,
          background: valid ? cfg.accent : "#D6D6DB",
          color: "#fff",
          boxShadow: valid ? `0 8px 20px ${cfg.soft}` : "none",
        }}
      >
        Save to {cfg.label.toLowerCase()} journal
      </button>
    </div>
  );
}

/* --------------------------------- stats --------------------------------- */

function StatsView({ trades, cfg, onJump, onDelete }) {
  const s = useMemo(() => {
    const net = trades.reduce((a, t) => a + t.pnl, 0);
    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl < 0);
    const decided = wins.length + losses.length;
    const byDay = {};
    for (const t of trades) byDay[t.date] = (byDay[t.date] || 0) + t.pnl;
    const dayVals = Object.entries(byDay);
    const best = dayVals.length ? dayVals.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
    const worst = dayVals.length ? dayVals.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;
    const grossW = wins.reduce((a, t) => a + t.pnl, 0);
    const grossL = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
    return {
      net,
      n: trades.length,
      rate: decided ? Math.round((wins.length / decided) * 100) : 0,
      avgWin: wins.length ? grossW / wins.length : 0,
      avgLoss: losses.length ? -grossL / losses.length : 0,
      factor: grossL ? grossW / grossL : null,
      best,
      worst,
    };
  }, [trades]);

  const months = useMemo(() => {
    const m = {};
    for (const t of trades) {
      const k = t.date.slice(0, 7);
      if (!m[k]) m[k] = { pnl: 0, n: 0 };
      m[k].pnl += t.pnl;
      m[k].n += 1;
    }
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]));
  }, [trades]);

  const recent = useMemo(
    () => [...trades].sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date))).slice(0, 25),
    [trades]
  );

  if (!trades.length) {
    return (
      <div className="px-4">
        <Card style={{ padding: 34, textAlign: "center" }}>
          <div className="text-base font-bold">Nothing here yet</div>
          <div className="text-sm mt-1" style={{ color: C.sub }}>
            Log a trade on the {cfg.label.toLowerCase()} side and your numbers show up here.
          </div>
        </Card>
      </div>
    );
  }

  const peak = Math.max(...months.map((m) => Math.abs(m[1].pnl)), 1);

  return (
    <div className="px-4 pb-4" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ padding: "22px 20px" }}>
        <div className="text-xs font-semibold" style={{ color: C.sub }}>All time · {cfg.title}</div>
        <div className="font-bold" style={{ fontSize: 40, letterSpacing: -1.4, color: inkFor(s.net), lineHeight: 1.15 }}>
          {signed(s.net)}
        </div>
        <div className="flex mt-4 pt-4" style={{ borderTop: `1px solid ${C.sep}` }}>
          <Stat label="Trades" value={s.n} />
          <Stat label="Win rate" value={`${s.rate}%`} />
          <Stat label="Profit factor" value={s.factor === null ? "—" : s.factor.toFixed(2)} />
        </div>
        <div className="flex mt-4 pt-4" style={{ borderTop: `1px solid ${C.sep}` }}>
          <Stat label="Avg win" value={signed(s.avgWin)} color={C.greenInk} />
          <Stat label="Avg loss" value={signed(s.avgLoss)} color={C.redInk} />
        </div>
        {s.best && (
          <div className="flex mt-4 pt-4" style={{ borderTop: `1px solid ${C.sep}` }}>
            <Stat label={`Best day · ${MONTHS_SHORT[fromISO(s.best[0]).getMonth()]} ${fromISO(s.best[0]).getDate()}`} value={signed(s.best[1])} color={C.greenInk} />
            <Stat label={`Worst day · ${MONTHS_SHORT[fromISO(s.worst[0]).getMonth()]} ${fromISO(s.worst[0]).getDate()}`} value={signed(s.worst[1])} color={C.redInk} />
          </div>
        )}
      </Card>

      <Card style={{ padding: "6px 18px" }}>
        {months.map(([k, v], i) => {
          const [y, m] = k.split("-").map(Number);
          return (
            <button
              key={k}
              onClick={() => onJump(y, m - 1)}
              className="w-full flex items-center justify-between py-3 active:opacity-40"
              style={{ borderBottom: i < months.length - 1 ? `1px solid ${C.sep}` : "none" }}
            >
              <div className="text-left" style={{ width: 96 }}>
                <div className="text-sm font-semibold">{MONTHS_SHORT[m - 1]} {y}</div>
                <div className="text-xs" style={{ color: C.sub }}>{v.n} {v.n === 1 ? "trade" : "trades"}</div>
              </div>
              <div className="flex-1 mx-3" style={{ height: 8, background: C.fill, borderRadius: 999, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${(Math.abs(v.pnl) / peak) * 100}%`,
                    height: "100%",
                    background: v.pnl >= 0 ? C.green : C.red,
                    borderRadius: 999,
                  }}
                />
              </div>
              <div className="text-sm font-bold" style={{ color: inkFor(v.pnl), minWidth: 70, textAlign: "right" }}>
                {signed(v.pnl)}
              </div>
            </button>
          );
        })}
      </Card>

      <Card style={{ padding: "6px 18px" }}>
        <div className="text-sm font-semibold pt-3 pb-1">Recent trades</div>
        {recent.map((t, i) => {
          const d = fromISO(t.date);
          return (
            <div
              key={t.id}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: i < recent.length - 1 ? `1px solid ${C.sep}` : "none" }}
            >
              <div className="min-w-0 pr-2">
                <div className="text-sm font-semibold truncate">
                  {t.symbol || "Trade"} · {MONTHS_SHORT[d.getMonth()]} {d.getDate()}
                </div>
                {t.note && <div className="text-xs truncate" style={{ color: C.sub }}>{t.note}</div>}
              </div>
              <div className="flex items-center" style={{ gap: 12 }}>
                <span className="text-sm font-bold" style={{ color: inkFor(t.pnl) }}>{signed(t.pnl)}</span>
                <button onClick={() => onDelete(t.id)} className="active:opacity-40" style={{ color: C.sub }}>
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* -------------------------------- day sheet ------------------------------- */

function DaySheet({ iso, trades, cfg, onClose, onDelete, onAdd }) {
  const d = fromISO(iso);
  const list = trades.filter((t) => t.date === iso);
  const pnl = list.reduce((s, t) => s + t.pnl, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)", animation: "fade .2s ease" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md"
        style={{
          background: C.bg,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          padding: "10px 18px 30px",
          paddingBottom: "calc(30px + env(safe-area-inset-bottom))",
          maxHeight: "80vh",
          overflowY: "auto",
          animation: "slideUp .28s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <div className="mx-auto mb-3" style={{ width: 38, height: 5, borderRadius: 999, background: "#D1D1D6" }} />
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-lg font-bold">
              {DOW[d.getDay()]}, {MONTHS_SHORT[d.getMonth()]} {d.getDate()}
            </div>
            <div className="text-2xl font-bold" style={{ color: inkFor(pnl), letterSpacing: -0.6 }}>{signed(pnl)}</div>
          </div>
          <button onClick={onClose} className="p-1.5 active:opacity-40" style={{ background: "#E3E3E8", borderRadius: 999, color: C.sub }}>
            <X size={17} strokeWidth={2.6} />
          </button>
        </div>

        {list.length === 0 ? (
          <Card style={{ padding: 26, textAlign: "center" }}>
            <div className="text-sm" style={{ color: C.sub }}>No trades logged on this day.</div>
          </Card>
        ) : (
          <Card style={{ padding: "4px 16px" }}>
            {list.map((t, i) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: i < list.length - 1 ? `1px solid ${C.sep}` : "none" }}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-sm font-semibold">{t.symbol || "Trade"}</div>
                  {t.note && <div className="text-xs" style={{ color: C.sub }}>{t.note}</div>}
                </div>
                <div className="flex items-center" style={{ gap: 12 }}>
                  <span className="text-sm font-bold" style={{ color: inkFor(t.pnl) }}>{signed(t.pnl)}</span>
                  <button onClick={() => onDelete(t.id)} className="active:opacity-40" style={{ color: C.sub }}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}

        <button
          onClick={onAdd}
          className="w-full py-3.5 mt-3 text-sm font-bold active:opacity-60"
          style={{ borderRadius: 999, background: cfg.accent, color: "#fff" }}
        >
          Add a trade
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------- app ---------------------------------- */

export default function App() {
  const [trades, setTrades] = useState([]);
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState("live");
  const [tab, setTab] = useState("journal");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [openDay, setOpenDay] = useState(null);
  const [toast, setToast] = useState(null);

  const cfg = ACCOUNTS[account];
  const mine = useMemo(() => trades.filter((t) => t.account === account), [trades, account]);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) setTrades(JSON.parse(res.value));
      } catch (e) {
        // nothing saved yet
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1900);
    return () => clearTimeout(id);
  }, [toast]);

  const persist = async (next) => {
    setTrades(next);
    try {
      const ok = await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
      if (!ok) setToast("Saved on screen, but not to storage");
    } catch (e) {
      setToast("Couldn't save — check your connection");
    }
  };

  const addTrade = (t) => {
    persist([...trades, t]);
    const d = fromISO(t.date);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setTab("journal");
    setToast(`${signed(t.pnl)} logged to ${ACCOUNTS[t.account].label.toLowerCase()}`);
  };

  const deleteTrade = (id) => persist(trades.filter((t) => t.id !== id));

  if (!ready) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT, color: C.sub }}>
        <div className="text-sm">Opening your journal…</div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: FONT, color: "#000" }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes drop { from { opacity: 0; transform: translateY(-14px) } to { opacity: 1; transform: translateY(0) } }
        input::placeholder, textarea::placeholder { color: #B4B4BA; }
        input[type="date"] { -webkit-appearance: none; appearance: none; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div className="w-full max-w-md mx-auto" style={{ paddingBottom: 108 }}>
        {/* header */}
        <div
          className="sticky top-0 z-30 px-4 pt-4 pb-3"
          style={{ background: "rgba(242,242,247,0.86)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <h1 className="font-bold" style={{ fontSize: 30, letterSpacing: -0.8 }}>
              {tab === "add" ? "New trade" : tab === "stats" ? "Stats" : "Journal"}
            </h1>
            <span className="text-xs font-semibold" style={{ color: cfg.accent }}>{cfg.title}</span>
          </div>
          <Segmented value={account} onChange={setAccount} />
        </div>

        {tab === "journal" && (
          <JournalView trades={mine} cfg={cfg} cursor={cursor} setCursor={setCursor} onOpenDay={setOpenDay} />
        )}
        {tab === "add" && <AddView account={account} setAccount={setAccount} onSave={addTrade} />}
        {tab === "stats" && (
          <StatsView
            trades={mine}
            cfg={cfg}
            onJump={(y, m) => {
              setCursor({ y, m });
              setTab("journal");
            }}
            onDelete={deleteTrade}
          />
        )}
      </div>

      {/* tab bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: `1px solid ${C.sep}`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="w-full max-w-md mx-auto flex items-center justify-around" style={{ height: 62 }}>
          <button
            onClick={() => setTab("journal")}
            className="flex flex-col items-center active:opacity-40"
            style={{ color: tab === "journal" ? cfg.accent : C.sub, width: 80 }}
          >
            <Calendar size={23} strokeWidth={tab === "journal" ? 2.6 : 2} />
            <span className="text-xs font-semibold mt-1">Journal</span>
          </button>

          <button
            onClick={() => setTab("add")}
            className="flex items-center justify-center active:opacity-60 transition-all"
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: cfg.accent,
              color: "#fff",
              marginTop: -22,
              boxShadow: `0 8px 20px ${cfg.soft}, 0 2px 6px rgba(0,0,0,0.14)`,
            }}
          >
            <Plus size={28} strokeWidth={2.8} />
          </button>

          <button
            onClick={() => setTab("stats")}
            className="flex flex-col items-center active:opacity-40"
            style={{ color: tab === "stats" ? cfg.accent : C.sub, width: 80 }}
          >
            <BarChart2 size={23} strokeWidth={tab === "stats" ? 2.6 : 2} />
            <span className="text-xs font-semibold mt-1">Stats</span>
          </button>
        </div>
      </div>

      {openDay && (
        <DaySheet
          iso={openDay}
          trades={mine}
          cfg={cfg}
          onClose={() => setOpenDay(null)}
          onDelete={deleteTrade}
          onAdd={() => {
            setOpenDay(null);
            setTab("add");
          }}
        />
      )}

      {toast && (
        <div
          className="fixed left-0 right-0 z-50 flex justify-center"
          style={{ top: 14, animation: "drop .25s cubic-bezier(.22,1,.36,1)" }}
        >
          <div
            className="text-sm font-semibold px-4 py-2.5"
            style={{ background: "rgba(0,0,0,0.82)", color: "#fff", borderRadius: 999, backdropFilter: "blur(10px)" }}
          >
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
