import { useState, useEffect } from "react";

const EMAILJS_SERVICE_ID = "service_o3npejs";
const EMAILJS_TEMPLATE_ID = "template_l8h5142";
const EMAILJS_PUBLIC_KEY = "r2n6Ym8e1L7aO1wIN";

const CHECKLIST_DATA = {
  pranzo: [
    {
      category: "PULIZIE",
      icon: "◉",
      items: [
        "Pavimento spazzato",
        "Sedie pulite",
      ],
    },
    {
      category: "ATTREZZATURE",
      icon: "◈",
      items: [
        "Carichi acqua completati",
        "iPad sotto carica",
        "Macchina ghiaccio spenta",
        "Macchina gelato spenta",
        "Aria condizionata spenta",
      ],
    },
  ],
  cena: [
    {
      category: "PULIZIE",
      icon: "◉",
      items: [
        "Pavimento spazzato",
        "Sedie pulite",
      ],
    },
    {
      category: "ATTREZZATURE",
      icon: "◈",
      items: [
        "Carichi acqua completati",
        "iPad sotto carica",
        "Macchina ghiaccio spenta",
        "Macchina gelato spenta",
        "Aria condizionata spenta",
      ],
    },
  ],
};

export default function ChecklistApp() {
  const [activeService, setActiveService] = useState("pranzo");
  const [checked, setChecked] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [note, setNote] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [responsabile, setResponsabile] = useState("");
  const [coperti, setCoperti] = useState("");
  const [sending, setSending] = useState(false);

  const today = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const serviceKey = (service) => `${service}_${new Date().toDateString()}`;

  useEffect(() => {
    const saved = localStorage.getItem(`checklist_${serviceKey(activeService)}`);
    if (saved) {
      const data = JSON.parse(saved);
      setChecked(data.checked || {});
      setNote(data.note || "");
      setResponsabile(data.responsabile || "");
      setCoperti(data.coperti || "");
    } else {
      setChecked({});
      setNote("");
    }
  }, [activeService]);

  const toggle = (catIdx, itemIdx) => {
    const key = `${catIdx}_${itemIdx}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const categories = CHECKLIST_DATA[activeService];
  const allItems = categories.flatMap((c, ci) => c.items.map((_, ii) => `${ci}_${ii}`));
  const checkedCount = allItems.filter((k) => checked[k]).length;
  const total = allItems.length;
  const pct = Math.round((checkedCount / total) * 100);

  const alreadySubmitted = submitted[serviceKey(activeService)];

  const buildVociText = () => {
    return categories.map((cat) => {
      const voci = cat.items.map((item) => `  ✓ ${item}`).join("\n");
      return `${cat.category}:\n${voci}`;
    }).join("\n\n");
  };

  const sendEmail = async () => {
    const templateParams = {
      servizio: activeService.toUpperCase(),
      ristorante: "Trezzano",
      responsabile: responsabile,
      coperti: coperti || "—",
      voci: buildVociText(),
      note: note || "Nessuna nota",
      data: today,
    };

    const url = "https://api.emailjs.com/api/v1.0/email/send";
    const body = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: templateParams,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Errore invio email");
  };

  const handleSubmit = async () => {
    if (!responsabile.trim()) {
      alert("Inserisci il nome del responsabile prima di inviare.");
      return;
    }
    setSending(true);
    try {
      await sendEmail();
      const data = { checked, note, responsabile, coperti, timestamp: new Date().toISOString() };
      localStorage.setItem(`checklist_${serviceKey(activeService)}`, JSON.stringify(data));
      setSubmitted((prev) => ({ ...prev, [serviceKey(activeService)]: true }));
      setShowModal(true);
    } catch (e) {
      alert("Checklist salvata ma invio email fallito. Controlla la connessione.");
      const data = { checked, note, responsabile, coperti, timestamp: new Date().toISOString() };
      localStorage.setItem(`checklist_${serviceKey(activeService)}`, JSON.stringify(data));
      setSubmitted((prev) => ({ ...prev, [serviceKey(activeService)]: true }));
      setShowModal(true);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setChecked({});
    setNote("");
    setCoperti("");
    setSubmitted((prev) => ({ ...prev, [serviceKey(activeService)]: false }));
    localStorage.removeItem(`checklist_${serviceKey(activeService)}`);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0e0c",
      color: "#e8e0d0",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      padding: "0 0 80px 0",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1712 0%, #0f0e0c 100%)",
        borderBottom: "1px solid #2a2620",
        padding: "28px 24px 20px",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 4, color: "#8a7a5a", textTransform: "uppercase", marginBottom: 4 }}>
                Chiusura Servizio
              </div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: "normal", color: "#e8e0d0", letterSpacing: 1 }}>
                Trezzano — Chiusura Servizio
              </h1>
              <div style={{ fontSize: 12, color: "#5a5040", marginTop: 4, textTransform: "capitalize" }}>{today}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 60, height: 60,
                borderRadius: "50%",
                background: `conic-gradient(#c8a96e ${pct * 3.6}deg, #2a2620 0deg)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: "50%",
                  background: "#0f0e0c",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: "bold", color: "#c8a96e",
                }}>
                  {pct}%
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#5a5040", marginTop: 4 }}>{checkedCount}/{total}</div>
            </div>
          </div>

          <div style={{
            display: "flex", gap: 0, marginTop: 20,
            border: "1px solid #2a2620", borderRadius: 6, overflow: "hidden",
          }}>
            {["pranzo", "cena"].map((s) => (
              <button
                key={s}
                onClick={() => setActiveService(s)}
                style={{
                  flex: 1, padding: "10px 0",
                  background: activeService === s ? "#c8a96e" : "transparent",
                  color: activeService === s ? "#0f0e0c" : "#8a7a5a",
                  border: "none", cursor: "pointer",
                  fontSize: 13, letterSpacing: 2, textTransform: "uppercase",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                  fontWeight: activeService === s ? "bold" : "normal",
                }}
              >
                {s === "pranzo" ? "☀ Pranzo" : "☾ Cena"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 0" }}>

        <div style={{
          background: "#1a1712", border: "1px solid #2a2620",
          borderRadius: 8, padding: "14px 16px", marginBottom: 20,
          display: "flex", gap: 24,
        }}>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: 11, letterSpacing: 3, color: "#8a7a5a", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Responsabile
            </label>
            <input
              value={responsabile}
              onChange={(e) => setResponsabile(e.target.value)}
              placeholder="Nome..."
              disabled={alreadySubmitted}
              style={{
                background: "transparent", border: "none", borderBottom: "1px solid #3a3020",
                color: "#e8e0d0", fontSize: 15, width: "100%", outline: "none",
                fontFamily: "inherit", padding: "4px 0",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, letterSpacing: 3, color: "#8a7a5a", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Coperti
            </label>
            <input
              value={coperti}
              onChange={(e) => setCoperti(e.target.value)}
              placeholder="0"
              type="number"
              min="0"
              disabled={alreadySubmitted}
              style={{
                background: "transparent", border: "none", borderBottom: "1px solid #3a3020",
                color: "#c8a96e", fontSize: 20, width: "100%", outline: "none",
                fontFamily: "inherit", padding: "4px 0", fontWeight: "bold",
              }}
            />
          </div>
        </div>

        {categories.map((cat, ci) => (
          <div key={ci} style={{
            marginBottom: 16,
            background: "#1a1712",
            border: "1px solid #2a2620",
            borderRadius: 8, overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid #2a2620",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ color: "#c8a96e", fontSize: 16 }}>{cat.icon}</span>
              <span style={{ fontSize: 11, letterSpacing: 3, color: "#8a7a5a", textTransform: "uppercase" }}>
                {cat.category}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#5a5040" }}>
                {cat.items.filter((_, ii) => checked[`${ci}_${ii}`]).length}/{cat.items.length}
              </span>
            </div>
            {cat.items.map((item, ii) => {
              const key = `${ci}_${ii}`;
              const isChecked = !!checked[key];
              return (
                <div
                  key={ii}
                  onClick={() => !alreadySubmitted && toggle(ci, ii)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "13px 16px",
                    borderBottom: ii < cat.items.length - 1 ? "1px solid #201e1a" : "none",
                    cursor: alreadySubmitted ? "default" : "pointer",
                    background: isChecked ? "#1e1d18" : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                    border: isChecked ? "2px solid #c8a96e" : "2px solid #3a3020",
                    background: isChecked ? "#c8a96e" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}>
                    {isChecked && <span style={{ color: "#0f0e0c", fontSize: 12, fontWeight: "bold" }}>✓</span>}
                  </div>
                  <span style={{
                    fontSize: 14, lineHeight: 1.4,
                    color: isChecked ? "#5a5040" : "#c8b898",
                    textDecoration: isChecked ? "line-through" : "none",
                    transition: "all 0.15s",
                  }}>
                    {item}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        <div style={{
          background: "#1a1712", border: "1px solid #2a2620",
          borderRadius: 8, padding: "14px 16px", marginBottom: 20,
        }}>
          <label style={{ fontSize: 11, letterSpacing: 3, color: "#8a7a5a", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
            Note / Anomalie
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Problemi, mancanze, comunicazioni per il prossimo turno..."
            disabled={alreadySubmitted}
            rows={3}
            style={{
              background: "transparent", border: "none",
              color: "#e8e0d0", fontSize: 14, width: "100%", outline: "none",
              fontFamily: "inherit", resize: "vertical", lineHeight: 1.6,
            }}
          />
        </div>

        {!alreadySubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={checkedCount < total || sending}
            style={{
              width: "100%", padding: "16px",
              background: checkedCount === total && !sending ? "#c8a96e" : "#2a2620",
              color: checkedCount === total && !sending ? "#0f0e0c" : "#5a5040",
              border: "none", borderRadius: 8,
              fontSize: 13, letterSpacing: 3, textTransform: "uppercase",
              cursor: checkedCount === total && !sending ? "pointer" : "not-allowed",
              fontFamily: "inherit", fontWeight: "bold",
              transition: "all 0.2s",
            }}
          >
            {sending
              ? "Invio in corso..."
              : checkedCount < total
              ? `Completa tutti i punti (${total - checkedCount} mancanti)`
              : "✓ Conferma Chiusura Servizio"}
          </button>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{
              background: "#1a2418", border: "1px solid #2a4020",
              borderRadius: 8, padding: "20px", marginBottom: 12,
              color: "#6ab06a", fontSize: 14,
            }}>
              ✓ Servizio {activeService} chiuso da <strong>{responsabile}</strong>
            </div>
            <button
              onClick={reset}
              style={{
                background: "transparent", border: "1px solid #3a3020",
                color: "#8a7a5a", padding: "10px 24px",
                borderRadius: 6, cursor: "pointer",
                fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
                fontFamily: "inherit",
              }}
            >
              Azzera
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 200, padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1712", border: "1px solid #c8a96e",
              borderRadius: 12, padding: 32, maxWidth: 340, width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: "normal", color: "#c8a96e" }}>
              Servizio Chiuso
            </h2>
            <p style={{ color: "#8a7a5a", fontSize: 14, margin: "0 0 8px", lineHeight: 1.6 }}>
              Chiusura <strong style={{ color: "#e8e0d0", textTransform: "capitalize" }}>{activeService}</strong> registrata da <strong style={{ color: "#e8e0d0" }}>{responsabile}</strong>
              {coperti && <><br /><span style={{ color: "#c8a96e" }}>{coperti} coperti</span></>}
            </p>
            <p style={{ color: "#5a6a50", fontSize: 12, margin: "0 0 24px" }}>📧 Report inviato via email</p>
            <button
              onClick={() => setShowModal(false)}
              style={{
                background: "#c8a96e", color: "#0f0e0c",
                border: "none", borderRadius: 6, padding: "12px 32px",
                cursor: "pointer", fontSize: 12, letterSpacing: 2,
                textTransform: "uppercase", fontFamily: "inherit", fontWeight: "bold",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
