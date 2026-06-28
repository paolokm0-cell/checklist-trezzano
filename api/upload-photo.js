// /api/upload-photo.js
// Funzione serverless Vercel: riceve una foto (base64) dall'app e la carica
// su Google Drive nella cartella del servizio, usando le credenziali del
// proprietario (refresh token salvato come variabile d'ambiente su Vercel).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { folderName, fileName, base64Data, mimeType, existingFolderId } = req.body;

    if (!base64Data || !fileName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Ottieni un access token fresco usando il refresh token
    const accessToken = await getAccessToken();

    // 2. Trova o crea la cartella del servizio (una cartella per chiusura servizio)
    let folderId = existingFolderId;
    if (!folderId) {
      folderId = await createFolder(accessToken, folderName);
    }

    // 3. Carica il file dentro la cartella
    const fileId = await uploadFile(accessToken, folderId, fileName, base64Data, mimeType);

    // 4. Rendi il file/cartella visibile con link (chiunque abbia il link può vedere)
    await makeShareable(accessToken, folderId);

    const folderLink = `https://drive.google.com/drive/folders/${folderId}`;

    return res.status(200).json({
      success: true,
      folderId,
      fileId,
      folderLink,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
}

async function getAccessToken() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Failed to refresh access token: " + JSON.stringify(data));
  }
  return data.access_token;
}

async function createFolder(accessToken, folderName) {
  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error("Failed to create folder: " + JSON.stringify(data));
  return data.id;
}

async function uploadFile(accessToken, folderId, fileName, base64Data, mimeType) {
  // Rimuove il prefisso data URL se presente (es. "data:image/jpeg;base64,")
  const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const buffer = Buffer.from(cleanBase64, "base64");

  const boundary = "boundary_" + Date.now();
  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const multipartBody = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType || "image/jpeg"}\r\n\r\n`
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  const data = await res.json();
  if (!data.id) throw new Error("Failed to upload file: " + JSON.stringify(data));
  return data.id;
}

async function makeShareable(accessToken, folderId) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
    }),
  });
}
