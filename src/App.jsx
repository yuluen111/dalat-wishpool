import { useState, useEffect, useRef } from "react";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwmh9ltQGRNTD9roY6tpsq09e4BCJvZzNlRaqxJDQDVOibHt-a2n-V2hTCmUIiXOxfQ/exec";

const CATEGORIES = [
  { id: "all", label: "全部", emoji: "🗺️" },
  { id: "stay", label: "住宿", emoji: "🏨" },
  { id: "food", label: "餐廳", emoji: "🍜" },
  { id: "activity", label: "活動體驗", emoji: "🎒" },
  { id: "sight", label: "景點", emoji: "🌿" },
  { id: "transport", label: "交通", emoji: "🚌" },
  { id: "other", label: "其他", emoji: "📌" },
];

const REACTIONS = [
  { id: "go", emoji: "❤️", label: "要去！" },
  { id: "maybe", emoji: "🤔", label: "我再想想" },
  { id: "skip", emoji: "❎", label: "這個我不跟～" },
];

const AVATARS = [
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#FAECE7", color: "#993C1D" },
  { bg: "#E6F1FB", color: "#185FA5" },
];

const CAT_COLORS = {
  stay: "#534AB7", food: "#D85A30", activity: "#0F6E56",
  sight: "#185FA5", transport: "#BA7517", other: "#888780",
};

function getAvatarStyle(name) {
  if (!name) return AVATARS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

function Avatar({ name, size = 26 }) {
  const s = getAvatarStyle(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: s.bg, color: s.color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
    }}>{name ? name[0] : "?"}</div>
  );
}

function timeAgo(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return "剛剛";
  if (d < 3600) return `${Math.floor(d / 60)}分鐘前`;
  if (d < 86400) return `${Math.floor(d / 3600)}小時前`;
  return `${Math.floor(d / 86400)}天前`;
}

function detectSourceType(url) {
  if (!url) return null;
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  if (url.includes("instagram.com")) return "IG";
  if (url.includes("maps.google.com") || url.includes("goo.gl/maps")) return "Google Maps";
  if (url.includes("facebook.com")) return "Facebook";
  return "網站";
}

function parseLatLng(mapsUrl) {
  if (!mapsUrl) return null;
  const qMatch = mapsUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  return null;
}

const iStyle = {
  input: {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "0.5px solid #e0e0e0", fontSize: 14, color: "#1a1a1a",
    background: "#fff", outline: "none", fontFamily: "inherit",
  },
  label: { fontSize: 12, color: "#888", display: "block", marginBottom: 5, fontWeight: 500 },
};

async function fetchItems() {
  const res = await fetch(SCRIPT_URL);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function saveItems(items) {
  const form = new FormData();
  form.append("data", JSON.stringify(items));
  await fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: form,
  });
}

function MapView({ items }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const [selected, setSelected] = useState(null);
  const withCoords = items.filter(i => i.lat && i.lng);
  const withMaps = items.filter(i => i.mapsUrl);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, { center: [11.9415, 108.4384], zoom: 13 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 19,
    }).addTo(map);
    leafletMap.current = map;

    withCoords.forEach(item => {
      const color = CAT_COLORS[item.category] || "#534AB7";
      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.2)"></div>`,
        iconSize: [28, 28], iconAnchor: [14, 28], className: "",
      });
      L.marker([item.lat, item.lng], { icon }).addTo(map).on("click", () => setSelected(item));
    });

    return () => { map.remove(); leafletMap.current = null; };
  }, []);

  if (withMaps.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>📍</div>
        <div style={{ fontSize: 14 }}>還沒有地點有地圖連結</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>新增資料時貼上 Google Maps 連結，就會顯示在這裡</div>
      </div>
    );
  }

  return (
    <div>
      <div ref={mapRef} style={{ height: 340, borderRadius: 14, overflow: "hidden", border: "0.5px solid #ebebeb", marginBottom: 12 }} />

      {selected ? (
        <div style={{ background: "#fff", border: "0.5px solid #ebebeb", borderRadius: 14, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{selected.title}</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{selected.note}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 18 }}>×</button>
          </div>
          {selected.mapsUrl && (
            <a href={selected.mapsUrl} target="_blank" rel="noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 20, fontSize: 13,
              background: "#e8f5ee", color: "#0F6E56", border: "0.5px solid #9FE1CB",
              textDecoration: "none", fontWeight: 600,
            }}>📍 在 Google Maps 開啟</a>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#bbb", textAlign: "center", marginBottom: 12 }}>點地圖上的標記查看詳細資訊</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {CATEGORIES.filter(c => c.id !== "all").map(c => {
          const inCat = withMaps.filter(i => i.category === c.id);
          if (inCat.length === 0) return null;
          return (
            <div key={c.id} style={{ background: "#fff", border: "0.5px solid #ebebeb", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 8 }}>{c.emoji} {c.label}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {inCat.map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "#1a1a1a", flex: 1 }}>{item.title}</span>
                    <a href={item.mapsUrl} target="_blank" rel="noreferrer" style={{
                      fontSize: 12, padding: "4px 12px", borderRadius: 20,
                      background: "#e8f5ee", color: "#0F6E56", border: "0.5px solid #9FE1CB",
                      textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
                    }}>📍 地圖</a>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItemModal({ item, onClose, onSave, userName }) {
  const editing = !!item?.id;
  const [title, setTitle] = useState(item?.title || "");
  const [url, setUrl] = useState(item?.url || "");
  const [mapsUrl, setMapsUrl] = useState(item?.mapsUrl || "");
  const [note, setNote] = useState(item?.note || "");
  const [category, setCategory] = useState(item?.category || "sight");
  const canSave = title.trim() && note.trim();

  function handleSave() {
    if (!canSave) return;
    const coords = parseLatLng(mapsUrl);
    onSave({
      ...(item || {}),
      title, url, mapsUrl, note, category,
      lat: coords?.lat || item?.lat || null,
      lng: coords?.lng || item?.lng || null,
      author: item?.author || userName,
      ts: item?.ts || Date.now(),
      feedback: item?.feedback || [],
      id: item?.id || Date.now(),
    });
    onClose();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "20px 20px 0 0",
        padding: "20px 20px 32px", width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{editing ? "編輯點子" : "新增一個點子"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#999" }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={iStyle.label}>標題 *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="這個地方叫什麼？" style={iStyle.input} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={iStyle.label}>分類</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.filter(c => c.id !== "all").map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)} style={{
                padding: "6px 12px", borderRadius: 20, fontSize: 12,
                border: category === c.id ? "1.5px solid #534AB7" : "0.5px solid #e0e0e0",
                background: category === c.id ? "#EEEDFE" : "#fff",
                color: category === c.id ? "#3C3489" : "#666", cursor: "pointer",
              }}>{c.emoji} {c.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={iStyle.label}>連結（選填）</label>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="網站、YouTube、IG…" style={iStyle.input} />
          {url && <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>偵測為：{detectSourceType(url)}</div>}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={iStyle.label}>📍 Google Maps 連結（選填）</label>
          <input value={mapsUrl} onChange={e => setMapsUrl(e.target.value)} placeholder="貼上 Google Maps 網址…" style={iStyle.input} />
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>貼入後地點會自動顯示在地圖上</div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={iStyle.label}>為什麼推薦？ *</label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="說說你為什麼想去…" rows={3}
            style={{ ...iStyle.input, resize: "none", lineHeight: 1.6 }} />
        </div>

        <button onClick={handleSave} disabled={!canSave} style={{
          width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
          cursor: canSave ? "pointer" : "not-allowed",
          background: canSave ? "#534AB7" : "#e8e8e8",
          color: canSave ? "#fff" : "#aaa", fontSize: 15, fontWeight: 700,
        }}>{editing ? "儲存修改" : "丟進許願池 ✨"}</button>
      </div>
    </div>
  );
}

function FeedbackSection({ item, userName, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const myReaction = item.feedback.find(f => f.author === userName && f.reaction && !f.text);
  const reactionCounts = REACTIONS.map(r => ({
    ...r, count: item.feedback.filter(f => f.reaction === r.id).length,
  })).filter(r => r.count > 0);

  function handleReaction(rid) {
    const existing = item.feedback.find(f => f.author === userName && f.reaction && !f.text);
    let updated;
    if (existing?.reaction === rid) {
      updated = item.feedback.filter(f => f !== existing);
    } else if (existing) {
      updated = item.feedback.map(f => f === existing ? { ...f, reaction: rid } : f);
    } else {
      updated = [...item.feedback, { author: userName, reaction: rid, ts: Date.now() }];
    }
    onUpdate({ ...item, feedback: updated });
  }

  function handleComment() {
    if (!text.trim()) return;
    const myR = item.feedback.find(f => f.author === userName && f.reaction && !f.text);
    onUpdate({ ...item, feedback: [...item.feedback, { author: userName, text: text.trim(), reaction: myR?.reaction || null, ts: Date.now() }] });
    setText("");
  }

  return (
    <div style={{ borderTop: "0.5px solid #f0f0f0", paddingTop: 10, marginTop: 8 }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
          {reactionCounts.length > 0 ? reactionCounts.map(r => (
            <span key={r.id} style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              padding: "2px 9px", borderRadius: 20, fontSize: 12,
              background: "#f5f5f5", border: "0.5px solid #eee", color: "#555",
            }}>{r.emoji} {r.count}</span>
          )) : <span style={{ fontSize: 12, color: "#ccc" }}>還沒有回饋</span>}
        </div>
        <span style={{ fontSize: 12, color: "#bbb", display: "flex", alignItems: "center", gap: 2 }}>
          <span style={{ display: "inline-block", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none", fontSize: 10 }}>▾</span>
          {open ? " 收起" : item.feedback.length > 0 ? ` ${item.feedback.length}則回饋` : " 回覆"}
        </span>
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
          {item.feedback.filter(f => f.text).map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <Avatar name={f.author} size={24} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{f.author}</span>
                  {f.reaction && <span style={{ fontSize: 11 }}>{REACTIONS.find(r => r.id === f.reaction)?.emoji}</span>}
                  <span style={{ fontSize: 11, color: "#ccc" }}>{timeAgo(f.ts)}</span>
                </div>
                <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5, background: "#f8f8f8", borderRadius: 8, padding: "5px 10px" }}>{f.text}</div>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {REACTIONS.map(r => (
              <button key={r.id} onClick={() => handleReaction(r.id)} style={{
                padding: "6px 12px", borderRadius: 20, fontSize: 12,
                border: myReaction?.reaction === r.id ? "1.5px solid #534AB7" : "0.5px solid #e0e0e0",
                background: myReaction?.reaction === r.id ? "#EEEDFE" : "#fff",
                color: myReaction?.reaction === r.id ? "#3C3489" : "#555", cursor: "pointer",
              }}>{r.emoji} {r.label}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleComment()}
              placeholder="留言說說你的想法…"
              style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "0.5px solid #e0e0e0", fontSize: 13, color: "#1a1a1a", background: "#fff", fontFamily: "inherit" }} />
            <button onClick={handleComment} style={{
              padding: "7px 14px", borderRadius: 8, border: "0.5px solid #e0e0e0",
              background: "#fff", fontSize: 13, cursor: "pointer", color: "#555",
            }}>送出</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, userName, onUpdate, onEdit }) {
  const cat = CATEGORIES.find(c => c.id === item.category);
  const srcType = detectSourceType(item.url);

  return (
    <div style={{ background: "#fff", border: "0.5px solid #ebebeb", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Avatar name={item.author} size={22} />
          <span style={{ fontSize: 12, color: "#555" }}>{item.author}</span>
          <span style={{ fontSize: 12, color: "#ddd" }}>·</span>
          <span style={{ fontSize: 12, color: "#bbb" }}>{timeAgo(item.ts)}</span>
        </div>
        <button onClick={() => onEdit(item)} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 13, color: "#bbb", padding: "2px 4px", flexShrink: 0,
        }}>✎ 編輯</button>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 5 }}>{item.title}</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 11, padding: "2px 10px", borderRadius: 20,
          background: "#f5f3ff", color: "#534AB7", border: "0.5px solid #c8c4f0",
        }}>{cat?.emoji} {cat?.label}</span>
        {srcType && item.url && (
          <a href={item.url} target="_blank" rel="noreferrer" style={{
            fontSize: 11, padding: "2px 10px", borderRadius: 20,
            background: "#f0f0f0", color: "#666", border: "0.5px solid #e0e0e0",
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3,
          }}>↗ {srcType}</a>
        )}
        {item.mapsUrl && (
          <a href={item.mapsUrl} target="_blank" rel="noreferrer" style={{
            fontSize: 11, padding: "2px 10px", borderRadius: 20,
            background: "#e8f5ee", color: "#0F6E56", border: "0.5px solid #9FE1CB",
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3,
          }}>📍 地圖</a>
        )}
      </div>

      <div style={{
        fontSize: 13, color: "#666", lineHeight: 1.6,
        background: "#fafafa", borderRadius: 8,
        padding: "8px 11px", marginBottom: 10,
        borderLeft: "2px solid #e8e8e8",
      }}>{item.note}</div>

      <FeedbackSection item={item} userName={userName} onUpdate={onUpdate} />
    </div>
  );
}

function ExportModal({ items, onClose }) {
  const [mode, setMode] = useState("text");

  function exportText() {
    const lines = ["# 大叻旅遊許願池\n"];
    CATEGORIES.filter(c => c.id !== "all").forEach(c => {
      const inCat = items.filter(i => i.category === c.id);
      if (inCat.length === 0) return;
      lines.push(`\n## ${c.emoji} ${c.label}\n`);
      inCat.forEach(item => {
        lines.push(`### ${item.title}`);
        if (item.url) lines.push(`連結：${item.url}`);
        if (item.mapsUrl) lines.push(`地圖：${item.mapsUrl}`);
        lines.push(`推薦人：${item.author}`);
        lines.push(`推薦原因：${item.note}`);
        if (item.feedback.length > 0) {
          lines.push("回饋：");
          item.feedback.filter(f => f.text).forEach(f => {
            const r = REACTIONS.find(r => r.id === f.reaction);
            lines.push(`  - ${f.author}${r ? " " + r.emoji : ""}：${f.text}`);
          });
        }
        lines.push("");
      });
    });
    return lines.join("\n");
  }

  const content = mode === "text" ? exportText() : JSON.stringify(items, null, 2);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "20px 20px 0 0",
        padding: "20px 20px 32px", width: "100%", maxWidth: 560,
        maxHeight: "85vh", display: "flex", flexDirection: "column",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>匯出資料</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#999" }}>×</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[["text", "📄 文字整理版"], ["json", "💾 JSON 備份"]].map(([id, label]) => (
            <button key={id} onClick={() => setMode(id)} style={{
              flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13,
              border: mode === id ? "1.5px solid #534AB7" : "0.5px solid #e0e0e0",
              background: mode === id ? "#EEEDFE" : "#fff",
              color: mode === id ? "#3C3489" : "#666",
              cursor: "pointer", fontWeight: mode === id ? 600 : 400,
            }}>{label}</button>
          ))}
        </div>
        <textarea readOnly value={content} style={{
          flex: 1, minHeight: 200, padding: "10px 12px", borderRadius: 10,
          border: "0.5px solid #e0e0e0", fontSize: 12, color: "#333",
          background: "#fafafa", resize: "none", fontFamily: "monospace",
          lineHeight: 1.6, marginBottom: 12,
        }} />
        <button onClick={() => navigator.clipboard.writeText(content).catch(() => {})} style={{
          width: "100%", padding: "11px 0", borderRadius: 12,
          border: "none", background: "#534AB7", color: "#fff",
          fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>全部複製</button>
      </div>
    </div>
  );
}

const VIEWS = [
  { id: "list", label: "許願池", emoji: "✨" },
  { id: "map", label: "地圖總覽", emoji: "📍" },
];

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("list");
  const [activeTab, setActiveTab] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem("dalat_user") || "");
  const [nameInput, setNameInput] = useState("");
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!userName) return;
    fetchItems()
      .then(data => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [userName]);

  async function handleSave(item) {
    const updated = items.find(i => i.id === item.id)
      ? items.map(i => i.id === item.id ? item : i)
      : [item, ...items];
    setItems(updated);
    setSaving(true);
    await saveItems(updated).finally(() => setSaving(false));
  }

  async function handleUpdate(updated) {
    const newItems = items.map(i => i.id === updated.id ? updated : i);
    setItems(newItems);
    setSaving(true);
    await saveItems(newItems).finally(() => setSaving(false));
  }

  function handleSetName() {
    if (!nameInput.trim()) return;
    localStorage.setItem("dalat_user", nameInput.trim());
    setUserName(nameInput.trim());
  }

  const filtered = activeTab === "all" ? items : items.filter(i => i.category === activeTab);

  if (!userName) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f7f5f0", padding: 24,
      }}>
        <div style={{
          background: "#fff", borderRadius: 20, padding: "32px 28px",
          maxWidth: 360, width: "100%", textAlign: "center", border: "0.5px solid #ebebeb",
        }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🌿</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>大叻旅遊許願池</h2>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 24, lineHeight: 1.7 }}>
            先告訴我你是誰<br />讓大家知道是你丟的點子！
          </p>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSetName()}
            placeholder="你的名字…"
            style={{ ...iStyle.input, marginBottom: 12, textAlign: "center", fontSize: 15 }}
            autoFocus
          />
          <button onClick={handleSetName} disabled={!nameInput.trim()} style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
            cursor: nameInput.trim() ? "pointer" : "not-allowed",
            background: nameInput.trim() ? "#534AB7" : "#e8e8e8",
            color: nameInput.trim() ? "#fff" : "#aaa",
            fontSize: 15, fontWeight: 700,
          }}>進入許願池 ✨</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f7f5f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {(showAdd || editItem) && (
        <ItemModal
          item={editItem}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          onSave={handleSave}
          userName={userName}
        />
      )}
      {showExport && <ExportModal items={items} onClose={() => setShowExport(false)} />}

      <div style={{
        background: "#fff", borderBottom: "0.5px solid #ebebeb",
        padding: "12px 16px", position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🌿</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>大叻許願池</span>
            {saving && <span style={{ fontSize: 11, color: "#bbb" }}>儲存中…</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setShowExport(true)} style={{
              padding: "6px 12px", borderRadius: 20, fontSize: 12,
              border: "0.5px solid #e0e0e0", background: "#fff", color: "#666", cursor: "pointer",
            }}>匯出</button>
            <button onClick={() => { setEditItem(null); setShowAdd(true); }} style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 13,
              border: "none", background: "#534AB7", color: "#fff",
              fontWeight: 700, cursor: "pointer",
            }}>＋ 新增</button>
            <Avatar name={userName} size={28} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 12,
              border: view === v.id ? "1.5px solid #534AB7" : "0.5px solid #e0e0e0",
              background: view === v.id ? "#EEEDFE" : "#fff",
              color: view === v.id ? "#3C3489" : "#666",
              cursor: "pointer", fontWeight: view === v.id ? 600 : 400,
            }}>{v.emoji} {v.label}</button>
          ))}
        </div>
      </div>

      {view === "list" && (
        <div>
          <div style={{ padding: "10px 16px 0", overflowX: "auto" }}>
            <div style={{ display: "flex", gap: 6, width: "max-content" }}>
              {CATEGORIES.map(c => {
                const count = c.id === "all" ? items.length : items.filter(i => i.category === c.id).length;
                return (
                  <button key={c.id} onClick={() => setActiveTab(c.id)} style={{
                    padding: "6px 12px", borderRadius: 20, fontSize: 12,
                    border: activeTab === c.id ? "1.5px solid #534AB7" : "0.5px solid #e0e0e0",
                    background: activeTab === c.id ? "#EEEDFE" : "#fff",
                    color: activeTab === c.id ? "#3C3489" : "#666",
                    cursor: "pointer", whiteSpace: "nowrap",
                    fontWeight: activeTab === c.id ? 600 : 400,
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    {c.emoji} {c.label}
                    {count > 0 && (
                      <span style={{
                        fontSize: 10,
                        background: activeTab === c.id ? "#AFA9EC" : "#eee",
                        color: activeTab === c.id ? "#26215C" : "#888",
                        padding: "1px 5px", borderRadius: 10,
                      }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#bbb" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
                <div style={{ fontSize: 14 }}>載入中…</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#bbb" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
                <div style={{ fontSize: 14 }}>這個分類還沒有點子，快來丟一個！</div>
              </div>
            ) : filtered.map(item => (
              <ItemCard key={item.id} item={item} userName={userName}
                onUpdate={handleUpdate} onEdit={i => { setEditItem(i); setShowAdd(true); }} />
            ))}
          </div>
        </div>
      )}

      {view === "map" && (
        <div style={{ padding: 16 }}>
          {leafletLoaded ? <MapView items={items} /> : (
            <div style={{ textAlign: "center", padding: 40, color: "#bbb" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🗺️</div>
              <div style={{ fontSize: 14 }}>地圖載入中…</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
