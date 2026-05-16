import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const OUTPUT_DIR = path.join(process.cwd(), 'outputs');

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure output directory exists
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create output directory:", err);
  }

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/prd/generate", async (req, res) => {
    const { idea, context } = req.body;

    if (!idea) {
      return res.status(400).json({ error: "Idea is required" });
    }

    try {
      const prompt = `
        Anda adalah Senior Product Architect dan Manager berpengalaman yang ahli dalam Asy-Syifaa Framework.
        Hasilkan Product Requirement Document (PRD) yang komprehensif dan terstruktur untuk ide produk berikut:
        
        IDE: ${idea}
        KONTEKS/INFO TAMBAHAN: ${context || 'Tidak ada'}

        PRD WAJIB mengikuti 14 bagian dari Asy-Syifaa Framework dan ditulis dalam BAHASA INDONESIA:
        1. Ringkasan Eksekutif (Termasuk Pernyataan Masalah, Solusi, dan Hasil yang Diharapkan)
        2. Visi & Tujuan Produk (Gunakan framework OKR dan roadmap lini masa)
        3. Pengguna Target & Persona (Detail pain points, kebutuhan, dan Kriteria Keberhasilan)
        4. Analisis Pasar (Lanskap kompetitif singkat dan diferensiasi)
        5. Fitur & Fungsionalitas (Persyaratan fungsional yang dipecah per modul)
        6. Pengalaman Pengguna & Desain (Sistem desain, aksesibilitas, dan alur UX tingkat tinggi)
        7. Arsitektur Teknis (Frontend, Backend, Infra, skema Database, spesifikasi API)
        8. Metrik Keberhasilan & KPI (KPI Bisnis, UX, dan Teknis)
        9. Risiko & Mitigasi (Register risiko dengan probabilitas/dampak dan mitigasi)
        10. Rencana Peluncuran & Lini Masa (Fase berbasis Sprint dan milestone)
        11. Proyeksi Keuangan (Estimasi ukuran tim, biaya infrastruktur)
        12. Batasan & Asumsi (Anggaran, tenggat waktu, batasan tech stack)
        13. Ketergantungan & Pemangku Kepentingan (Orang-orang kunci dan sistem yang terlibat)
        14. Glosarium (Istilah-istilah kunci yang digunakan dalam dokumen)

        Gunakan nada profesional. Format output dalam Markdown.
        Pastikan detail namun tetap mudah dipindai (scannable).
        Seluruh konten harus dalam Bahasa Indonesia.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const prdMarkdown = response.text || "";
      
      // Auto-save to server filesystem (mocking the "output folder" requirement)
      const filename = `${Date.now()}_${idea.substring(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      const filePath = path.join(OUTPUT_DIR, filename);
      await fs.writeFile(filePath, prdMarkdown);

      res.json({ prd: prdMarkdown, savedAs: filename });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate PRD" });
    }
  });

  // Vite config
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
