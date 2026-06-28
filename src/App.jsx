import { useState, useEffect, useRef } from "react";

const EMAILJS_SERVICE_ID = "service_o3npejs";
const EMAILJS_TEMPLATE_ID = "template_l8h5142";
const EMAILJS_PUBLIC_KEY = "r2n6Ym8e1L7aO1wIN";

// Voci checklist semplici (sala/attrezzature) - con doppia conferma
const SIMPLE_CHECKLIST = {
  pranzo: [
    { category: "SALA", icon: "◉", items: ["Pavimento spazzato", "Sedie pulite"] },
  ],
  cena: [
    { category: "SALA", icon: "◉", items: ["Pavimento spazzato", "Sedie pulite"] },
  ],
};

// Voci con foto obbligatoria (sempre pranzo+cena)
const PHOTO_CHECKLIST = [
  { key: "frigo", label: "Carico frigo" },
  { key: "ipad", label: "iPad sotto carica" },
  { key: "gelato", label: "Macchina gelato (modalità notturna)" },
  { key: "ac", label: "Aria condizionata (timer/spenta)" },
  { key: "delivery", label: "Foto delivery" },
  { key: "satispay", label: "Foto Satispay" },
  { key: "cassa", label: "Foto movimenti cassa" },
];

export default function ChecklistApp() {
  const [activeService, setActiveService] = useState("pranzo");
  const [checked, setChecked] = useState({});
  const [timestamps, setTimestamps] = useState({});
  const [photos, setPhotos] = useState({}); // key -> base64
  const [confirmPopup, setConfirmPopup] = useState(null); // {ci, ii} for double-confirm
  const [submitted, setSubmitted] = useState({});
  const [note, setNote] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [responsabile, setResponsabile] = useState("");
  const [coperti, setCoperti] = useState("");
  const [sending, setSending] = useState(false);

  // Campi gestionale
  const [reportInviato, setReportInviato] = useState(false);
  const [reportResettato, setReportResettato] = useState(false);

  // Campi cassa
  const [contantiTotali, setContantiTotali] = useState("");
  const [fondoCassa, setFondoCassa] = useState("");
  const [pagamentoExtraImporto, setPagamentoExtraImporto] = useState("");
  const [pagamentoExtraNome, setPagamentoExtraNome] = useState("");
  const [totaleTicket, setTotaleTicket] = useState("");
  const [numeroSaratoga, setNumeroSaratoga] = useState("");
  const [noteProdotti, setNoteProdotti] = useState("");

  const fileInputRef = useRef(null);
  const pendingPhotoKey = useRef(null);

  const today = new Date().toLocaleDateString("it-IT", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const serviceKey = (service) => `${service}_${new Date().toDateString()}`;

  useEffect(() => {
    const saved = localStorage.getItem(`checklist_${serviceKey(activeService)}`);
    if (saved) {
      const data = JSON.parse(saved);
      setChecked(data.checked || {});
      setTimestamps(data.timestamps || {});
      setPhotos(data.photos || {});
      setNote(data.note || "");
      setResponsabile(data.responsabile || "");
      setCoperti(data.coperti || "");
      setReportInviato(data.reportInviato || false);
      setReportResettato(data.reportResettato || false);
      setContantiTotali(data.contantiTotali || "");
      setFondoCassa(data.fondoCassa || "");
      setPagamentoExtraImporto(data.pagamentoExtraImporto || "");
      setPagamentoExtraNome(data.pagamentoExtraNome || "");
      setTotaleTicket(data.totaleTicket || "");
      setNumeroSaratoga(data.numeroSaratoga || "");
      setNoteProdotti(data.noteProdotti || "");
    } else {
      setChecked({});
      setTimestamps({});
      setPhotos({});
      setNote("");
      setReportInviato(false);
      setReportResettato(false);
      setContantiTotali("");
      setFondoCassa("");
      setPagamentoExtraImporto("");
      setPagamentoExtraNome("");
      setTotaleTicket("");
      setNumeroSaratoga("");
      setNoteProdotti("");
    }
  }, [activeService]);

  const simpleCategories = SIMPLE_CHECKLIST[activeService];

  // --- Simple checklist (doppia conferma) ---
  const requestToggle = (ci, ii) => {
    const key = `s_${ci}_${ii}`;
    if (checked[key]) {
      // un-check diretto, nessuna conferma necessaria
      setChecked((prev) => ({ ...prev, [key]: false }));
      setTimestamps((prev) => ({ ...prev, [key]: null }));
      return;
    }
    setConfirmPopup({ ci, ii, key });
  };

  const confirmCheck = () => {
    if (!confirmPopup) return;
    const { key } = confirmPopup;
    setChecked((prev) => ({ ...prev, [key]: true }));
    setTimestamps((prev) => ({
      ...prev,
      [key]: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    }));
    setConfirmPopup(null);
  };

  // --- Photo checklist ---
  const triggerPhotoUpload = (key) => {
    if (photos[key]) return; // già caricata, non ri-richiedere
    pendingPhotoKey.current = key;
    fileInputRef.current?.click();
  };

  const handlePhotoSelected = (e) => {
    const file = e.target.files?.[0];
    const key = pendingPhotoKey.current;
    if (!file || !key) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotos((prev) => ({ ...prev, [key]: reader.result }));
      setTimestamps((prev) => ({
        ...prev,
        [`p_${key}`]: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removePhoto = (key) => {
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // --- Completion check ---
  const simpleAllKeys = simpleCategories.flatMap((c, ci) => c.items.map((_, ii) => `s_${ci}_${ii}`));
  const simpleCheckedCount = simpleAllKeys.filter((k) => checked[k]).length;
  const photoCheckedCount = PHOTO_CHECKLIST.filter((p) => photos[p.key]).length;

  const gestionaleOk = reportInviato && (activeService === "cena" || reportResettato);
  const cassaOk = contantiTotali !== "" && fondoCassa !== "" && totaleTicket !== "";
  const saratogaOk = activeService === "cena" || numeroSaratoga !== "";

  const totalSteps = simpleAllKeys.length + PHOTO_CHECKLIST.length + 1 /*gestionale*/ + 1 /*cassa*/ + (activeService === "pranzo" ? 1 : 0);
  const doneSteps = simpleCheckedCount + photoCheckedCount + (gestionaleOk ? 1 : 0) + (cassaOk ? 1 : 0) + (activeService === "pranzo" ? (saratogaOk ? 1 : 0) : 0);
  const pct = Math.round((doneSteps / totalSteps) * 100);
  const allDone = doneSteps === totalSteps;

  const alreadySubmitted = submitted[serviceKey(activeService)];

  const buildVociText = () => {
    let txt = "VOCI SALA:\n";
    simpleCategories.forEach((cat, ci) => {
      cat.items.forEach((item, ii) => {
        const key = `s_${ci}_${ii}`;
        const ts = timestamps[key];
        txt += `  ${checked[key] ? "✓" : "✗"} ${item}${ts ? ` — ${ts}` : ""}\n`;
      });
    });
    txt += "\nFOTO ALLEGATE:\n";
    PHOTO_CHECKLIST.forEach((p) => {
      const ts = timestamps[`p_${p.key}`];
      txt += `  ${photos[p.key] ? "✓" : "✗"} ${p.label}${ts ? ` — ${ts}` : ""}\n`;
    });
    txt += "\nGESTIONALE:\n";
    txt += `  ${reportInviato ? "✓" : "✗"} Report inviato\n`;
    if (activeService === "pranzo") {
      txt += `  ${reportResettato ? "✓" : "✗"} Report resettato\n`;
    }
    txt += "\nCASSA:\n";
    txt += `  Contanti totali (senza fondo): € ${contantiTotali || "—"}\n`;
    txt += `  Fondo cassa: € ${fondoCassa || "—"}\n`;
    txt += `  Totale ticket restaurant: € ${totaleTicket || "—"}\n`;
    if (pagamentoExtraImporto || pagamentoExtraNome) {
      txt += `  Pagamento extra: € ${pagamentoExtraImporto || "—"} (${pagamentoExtraNome || "non specificato"})\n`;
    }
    if (activeService === "pranzo") {
      txt += `\nCLIENTI SARATOGA: ${numeroSaratoga || "—"}\n`;
    }
    txt += `\nPRODOTTI IN ESAURIMENTO:\n${noteProdotti || "Nessuna segnalazione"}`;
    return txt;
  };

  const sendEmail = async (folderLink) => {
    const templateParams = {
      servizio: activeService.toUpperCase(),
      ristorante: "Trezzano",
      responsabile,
      coperti: coperti || "—",
      voci: buildVociText(),
      note: note || "Nessuna nota",
      data: today,
      foto_link: folderLink || "Nessuna foto caricata",
    };

    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: templateParams,
      }),
    });
    if (!res.ok) throw new Error("Errore invio email");
  };

  const uploadAllPhotos = async () => {
    const photoKeys = Object.keys(photos);
    if (photoKeys.length === 0) return null;

    const folderName = `Trezzano - ${activeService === "pranzo" ? "Pranzo" : "Cena"} - ${new Date().toLocaleDateString("it-IT")} - ${responsabile}`;
    let folderId = null;
    let folderLink = null;

    for (const key of photoKeys) {
      const photoItem = PHOTO_CHECKLIST.find((p) => p.key === key);
      const fileName = `${photoItem ? photoItem.label : key}.jpg`;

      const res = await fetch("/api/upload-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderName,
          fileName,
          base64Data: photos[key],
          mimeType: "image/jpeg",
          existingFolderId: folderId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore upload foto");

      folderId = data.folderId;
      folderLink = data.folderLink;
    }

    return folderLink;
  };

  const handleSubmit = async () => {
    if (!responsabile.trim()) {
      alert("Inserisci il nome del responsabile prima di inviare.");
      return;
    }
    setSending(true);
    let folderLink = null;
    try {
      folderLink = await uploadAllPhotos();
    } catch (e) {
      alert("Errore nel caricamento delle foto su Drive: " + e.message);
    }
    try {
      await sendEmail(folderLink);
    } catch (e) {
      alert("Checklist salvata ma invio email fallito. Controlla la connessione.");
    } finally {
      const data = {
        checked, timestamps, photos, note, responsabile, coperti,
        reportInviato, reportResettato, contantiTotali, fondoCassa,
        pagamentoExtraImporto, pagamentoExtraNome, totaleTicket,
        numeroSaratoga, noteProdotti, folderLink,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`checklist_${serviceKey(activeService)}`, JSON.stringify(data));
      setSubmitted((prev) => ({ ...prev, [serviceKey(activeService)]: true }));
      setShowModal(true);
      setSending(false);
    }
  };

  const reset = () => {
    setChecked({});
    setTimestamps({});
    setPhotos({});
    setNote("");
    setCoperti("");
    setReportInviato(false);
    setReportResettato(false);
    setContantiTotali("");
    setFondoCassa("");
    setPagamentoExtraImporto("");
    setPagamentoExtraNome("");
    setTotaleTicket("");
    setNumeroSaratoga("");
    setNoteProdotti("");
    setSubmitted((prev) => ({ ...prev, [serviceKey(activeService)]: false }));
    localStorage.removeItem(`checklist_${serviceKey(activeService)}`);
  };

  const inputStyle = {
    background: "transparent", border: "none", borderBottom: "1px solid #3a3020",
    color: "#e8e0d0", fontSize: 15, width: "100%", outline: "none",
    fontFamily: "inherit", padding: "4px 0",
  };
  const labelStyle = {
    fontSize: 11, letterSpacing: 3, color: "#8a7a5a",
    textTransform: "uppercase", display: "block", marginBottom: 8,
  };
  const cardStyle = {
    background: "#1a1712", border: "1px solid #2a2620",
    borderRadius: 8, padding: "14px 16px", marginBottom: 16,
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0f0e0c", color: "#e8e0d0",
      fontFamily: "'Georgia', 'Times New Roman', serif", padding: "0 0 80px 0",
    }}>
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef}
        onChange={handlePhotoSelected} style={{ display: "none" }} />

      <div style={{
        background: "linear-gradient(135deg, #1a1712 0%, #0f0e0c 100%)",
        borderBottom: "1px solid #2a2620", padding: "28px 24px 20px",
        position: "sticky", top: 0, zIndex: 100,
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
                width: 60, height: 60, borderRadius: "50%",
                background: `conic-gradient(#c8a96e ${pct * 3.6}deg, #2a2620 0deg)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: "50%", background: "#0f0e0c",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: "bold", color: "#c8a96e",
                }}>
                  {pct}%
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#5a5040", marginTop: 4 }}>{doneSteps}/{totalSteps}</div>
            </div>
          </div>
          <div style={{
            display: "flex", marginTop: 20,
            border: "1px solid #2a2620", borderRadius: 6, overflow: "hidden",
          }}>
            {["pranzo", "cena"].map((s) => (
              <button key={s} onClick={() => setActiveService(s)} style={{
                flex: 1, padding: "10px 0",
                background: activeService === s ? "#c8a96e" : "transparent",
                color: activeService === s ? "#0f0e0c" : "#8a7a5a",
                border: "none", cursor: "pointer", fontSize: 13, letterSpacing: 2,
                textTransform: "uppercase", fontFamily: "inherit", transition: "all 0.2s",
                fontWeight: activeService === s ? "bold" : "normal",
              }}>
                {s === "pranzo" ? "☀ Pranzo" : "☾ Cena"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 0" }}>

        {/* Responsabile + Coperti */}
        <div style={{ ...cardStyle, display: "flex", gap: 24 }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>Responsabile</label>
            <input value={responsabile} onChange={(e) => setResponsabile(e.target.value)}
              placeholder="Nome..." disabled={alreadySubmitted} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Coperti</label>
            <input value={coperti} onChange={(e) => setCoperti(e.target.value)}
              placeholder="0" type="number" min="0" disabled={alreadySubmitted}
              style={{ ...inputStyle, color: "#c8a96e", fontSize: 20, fontWeight: "bold" }} />
          </div>
        </div>

        {/* SALA - doppia conferma */}
        {simpleCategories.map((cat, ci) => (
          <div key={ci} style={{ marginBottom: 16, background: "#1a1712", border: "1px solid #2a2620", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #2a2620", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#c8a96e", fontSize: 16 }}>{cat.icon}</span>
              <span style={{ fontSize: 11, letterSpacing: 3, color: "#8a7a5a", textTransform: "uppercase" }}>{cat.category}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#5a5040" }}>
                {cat.items.filter((_, ii) => checked[`s_${ci}_${ii}`]).length}/{cat.items.length}
              </span>
            </div>
            {cat.items.map((item, ii) => {
              const key = `s_${ci}_${ii}`;
              const isChecked = !!checked[key];
              const ts = timestamps[key];
              return (
                <div key={ii} onClick={() => !alreadySubmitted && requestToggle(ci, ii)} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
                  borderBottom: ii < cat.items.length - 1 ? "1px solid #201e1a" : "none",
                  cursor: alreadySubmitted ? "default" : "pointer",
                  background: isChecked ? "#1e1d18" : "transparent",
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                    border: isChecked ? "2px solid #c8a96e" : "2px solid #3a3020",
                    background: isChecked ? "#c8a96e" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isChecked && <span style={{ color: "#0f0e0c", fontSize: 12, fontWeight: "bold" }}>✓</span>}
                  </div>
                  <span style={{
                    flex: 1, fontSize: 14, color: isChecked ? "#5a5040" : "#c8b898",
                    textDecoration: isChecked ? "line-through" : "none",
                  }}>{item}</span>
                  {isChecked && ts && <span style={{ fontSize: 11, color: "#6a5a3a" }}>{ts}</span>}
                </div>
              );
            })}
          </div>
        ))}

        {/* FOTO obbligatorie */}
        <div style={{ marginBottom: 16, background: "#1a1712", border: "1px solid #2a2620", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #2a2620", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#c8a96e", fontSize: 16 }}>📷</span>
            <span style={{ fontSize: 11, letterSpacing: 3, color: "#8a7a5a", textTransform: "uppercase" }}>Foto Obbligatorie</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#5a5040" }}>{photoCheckedCount}/{PHOTO_CHECKLIST.length}</span>
          </div>
          {PHOTO_CHECKLIST.map((p, idx) => {
            const hasPhoto = !!photos[p.key];
            const ts = timestamps[`p_${p.key}`];
            return (
              <div key={p.key} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
                borderBottom: idx < PHOTO_CHECKLIST.length - 1 ? "1px solid #201e1a" : "none",
                background: hasPhoto ? "#1e1d18" : "transparent",
              }}>
                <div onClick={() => !alreadySubmitted && triggerPhotoUpload(p.key)} style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0, cursor: alreadySubmitted ? "default" : "pointer",
                  border: hasPhoto ? "2px solid #c8a96e" : "2px solid #3a3020",
                  background: hasPhoto ? "#c8a96e" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {hasPhoto && <span style={{ color: "#0f0e0c", fontSize: 12, fontWeight: "bold" }}>✓</span>}
                </div>
                <span onClick={() => !alreadySubmitted && triggerPhotoUpload(p.key)} style={{
                  flex: 1, fontSize: 14, cursor: alreadySubmitted ? "default" : "pointer",
                  color: hasPhoto ? "#5a5040" : "#c8b898",
                }}>{p.label}</span>
                {ts && <span style={{ fontSize: 11, color: "#6a5a3a" }}>{ts}</span>}
                {hasPhoto && (
                  <img src={photos[p.key]} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover" }} />
                )}
                {hasPhoto && !alreadySubmitted && (
                  <button onClick={(e) => { e.stopPropagation(); removePhoto(p.key); }} style={{
                    background: "none", border: "none", color: "#a05050", fontSize: 11, cursor: "pointer",
                  }}>✕</button>
                )}
              </div>
            );
          })}
        </div>

        {/* GESTIONALE */}
        <div style={{ marginBottom: 16, background: "#1a1712", border: "1px solid #2a2620", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #2a2620", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#c8a96e", fontSize: 16 }}>⌬</span>
            <span style={{ fontSize: 11, letterSpacing: 3, color: "#8a7a5a", textTransform: "uppercase" }}>Gestionale</span>
          </div>
          <div onClick={() => !alreadySubmitted && setReportInviato(!reportInviato)} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
            borderBottom: activeService === "pranzo" ? "1px solid #201e1a" : "none",
            cursor: alreadySubmitted ? "default" : "pointer",
            background: reportInviato ? "#1e1d18" : "transparent",
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 4, flexShrink: 0,
              border: reportInviato ? "2px solid #c8a96e" : "2px solid #3a3020",
              background: reportInviato ? "#c8a96e" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {reportInviato && <span style={{ color: "#0f0e0c", fontSize: 12, fontWeight: "bold" }}>✓</span>}
            </div>
            <span style={{ fontSize: 14, color: reportInviato ? "#5a5040" : "#c8b898" }}>Report inviato dal gestionale</span>
          </div>
          {activeService === "pranzo" && (
            <div onClick={() => !alreadySubmitted && setReportResettato(!reportResettato)} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
              cursor: alreadySubmitted ? "default" : "pointer",
              background: reportResettato ? "#1e1d18" : "transparent",
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                border: reportResettato ? "2px solid #c8a96e" : "2px solid #3a3020",
                background: reportResettato ? "#c8a96e" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {reportResettato && <span style={{ color: "#0f0e0c", fontSize: 12, fontWeight: "bold" }}>✓</span>}
              </div>
              <span style={{ fontSize: 14, color: reportResettato ? "#5a5040" : "#c8b898" }}>Report resettato (solo pranzo)</span>
            </div>
          )}
        </div>

        {/* CASSA */}
        <div style={cardStyle}>
          <label style={labelStyle}>Contanti totali (senza fondo cassa) — €</label>
          <input value={contantiTotali} onChange={(e) => setContantiTotali(e.target.value)}
            type="number" placeholder="0.00" disabled={alreadySubmitted}
            style={{ ...inputStyle, marginBottom: 16 }} />

          <label style={labelStyle}>Fondo cassa — €</label>
          <input value={fondoCassa} onChange={(e) => setFondoCassa(e.target.value)}
            type="number" placeholder="0.00" disabled={alreadySubmitted}
            style={{ ...inputStyle, marginBottom: 16 }} />

          <label style={labelStyle}>Totale ticket restaurant — €</label>
          <input value={totaleTicket} onChange={(e) => setTotaleTicket(e.target.value)}
            type="number" placeholder="0.00" disabled={alreadySubmitted}
            style={{ ...inputStyle, marginBottom: 16 }} />

          <label style={labelStyle}>Pagamento extra — € (opzionale)</label>
          <div style={{ display: "flex", gap: 16, marginBottom: 4 }}>
            <input value={pagamentoExtraImporto} onChange={(e) => setPagamentoExtraImporto(e.target.value)}
              type="number" placeholder="Importo" disabled={alreadySubmitted}
              style={{ ...inputStyle, flex: 1 }} />
            <input value={pagamentoExtraNome} onChange={(e) => setPagamentoExtraNome(e.target.value)}
              type="text" placeholder="Nome / motivo" disabled={alreadySubmitted}
              style={{ ...inputStyle, flex: 2 }} />
          </div>
        </div>

        {/* SARATOGA - solo pranzo */}
        {activeService === "pranzo" && (
          <div style={cardStyle}>
            <label style={labelStyle}>Numero clienti Saratoga</label>
            <input value={numeroSaratoga} onChange={(e) => setNumeroSaratoga(e.target.value)}
              type="number" min="0" placeholder="0" disabled={alreadySubmitted}
              style={{ ...inputStyle, color: "#c8a96e", fontWeight: "bold", fontSize: 18 }} />
          </div>
        )}

        {/* Note prodotti in esaurimento */}
        <div style={cardStyle}>
          <label style={labelStyle}>Prodotti in esaurimento</label>
          <textarea value={noteProdotti} onChange={(e) => setNoteProdotti(e.target.value)}
            placeholder="Elenca i prodotti che stanno per finire..."
            disabled={alreadySubmitted} rows={2}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        {/* Note generali */}
        <div style={cardStyle}>
          <label style={labelStyle}>Note / Anomalie generali</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Problemi, comunicazioni per il prossimo turno..."
            disabled={alreadySubmitted} rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        {!alreadySubmitted ? (
          <button onClick={handleSubmit} disabled={!allDone || sending} style={{
            width: "100%", padding: "16px",
            background: allDone && !sending ? "#c8a96e" : "#2a2620",
            color: allDone && !sending ? "#0f0e0c" : "#5a5040",
            border: "none", borderRadius: 8, fontSize: 13, letterSpacing: 3,
            textTransform: "uppercase", cursor: allDone && !sending ? "pointer" : "not-allowed",
            fontFamily: "inherit", fontWeight: "bold",
          }}>
            {sending ? "Invio in corso..." : allDone
              ? "✓ Conferma Chiusura Servizio"
              : `Completa tutti i punti (${totalSteps - doneSteps} mancanti)`}
          </button>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{
              background: "#1a2418", border: "1px solid #2a4020", borderRadius: 8,
              padding: "20px", marginBottom: 12, color: "#6ab06a", fontSize: 14,
            }}>
              ✓ Servizio {activeService} chiuso da <strong>{responsabile}</strong>
            </div>
            <button onClick={reset} style={{
              background: "transparent", border: "1px solid #3a3020", color: "#8a7a5a",
              padding: "10px 24px", borderRadius: 6, cursor: "pointer",
              fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontFamily: "inherit",
            }}>Azzera</button>
          </div>
        )}
      </div>

      {/* Popup doppia conferma */}
      {confirmPopup && (
        <div onClick={() => setConfirmPopup(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#1a1712", border: "1px solid #c8a96e", borderRadius: 12,
            padding: 28, maxWidth: 320, width: "100%", textAlign: "center",
          }}>
            <p style={{ color: "#e8e0d0", fontSize: 15, margin: "0 0 20px", lineHeight: 1.6 }}>
              Confermi di aver controllato personalmente questo punto?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmPopup(null)} style={{
                flex: 1, background: "transparent", border: "1px solid #3a3020", color: "#8a7a5a",
                padding: "10px 0", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
              }}>Annulla</button>
              <button onClick={confirmCheck} style={{
                flex: 1, background: "#c8a96e", border: "none", color: "#0f0e0c",
                padding: "10px 0", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "bold", fontFamily: "inherit",
              }}>Confermo</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#1a1712", border: "1px solid #c8a96e", borderRadius: 12,
            padding: 32, maxWidth: 340, width: "100%", textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: "normal", color: "#c8a96e" }}>Servizio Chiuso</h2>
            <p style={{ color: "#8a7a5a", fontSize: 14, margin: "0 0 8px", lineHeight: 1.6 }}>
              Chiusura <strong style={{ color: "#e8e0d0", textTransform: "capitalize" }}>{activeService}</strong> registrata da <strong style={{ color: "#e8e0d0" }}>{responsabile}</strong>
              {coperti && <><br /><span style={{ color: "#c8a96e" }}>{coperti} coperti</span></>}
            </p>
            <p style={{ color: "#5a6a50", fontSize: 12, margin: "0 0 24px" }}>📧 Report inviato via email</p>
            <button onClick={() => setShowModal(false)} style={{
              background: "#c8a96e", color: "#0f0e0c", border: "none", borderRadius: 6,
              padding: "12px 32px", cursor: "pointer", fontSize: 12, letterSpacing: 2,
              textTransform: "uppercase", fontFamily: "inherit", fontWeight: "bold",
            }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
