import express from "express";
import axios from "axios";
import cheerio from "cheerio";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public")); // خدمة ملفات HTML و CSS و JS من مجلد public

// دالة السكراب
const scrapeInstagram = async (url) => {
  try {
    const { data } = await axios.get(
      `https://insta-save.net/content.php?url=${encodeURIComponent(url)}`,
      {
        headers: {
          accept: "*/*",
          "User -Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        },
      }
    );

    const $ = cheerio.load(data.html);
    const results = [];

    $("#download_content .col-md-4.position-relative").each((index, element) => {
      const el = $(element);

      const downloadLink = el.find("a.btn.bg-gradient-success").attr("href") || "";
      const imgSrc = el.find("img.load").attr("src") || el.find("img").attr("src") || "";
      const description = el.find("p.text-sm").text().trim() || "No caption";
      const profileName = el.find("p.text-sm a").text().trim() || "Unknown";
      const stats = el.find(".stats small").toArray().map((s) => $(s).text().trim());
      const likes = stats[0] || "0";
      const comments = stats[1] || "0";

      if (downloadLink) {
        results.push({
          downloadLink,
          imgSrc,
          description,
          profileName,
          likes,
          comments,
        });
      }
    });

    return results;
  } catch (error) {
    console.error("Scraper Error:", error);
    throw new Error("فشل في جلب المحتوى. قد يكون المنشور خاصًا أو الرابط غير صالح.");
  }
};

// API endpoint لاستقبال رابط انستجرام وإرجاع روابط الفيديوهات
app.post("/download", async (req, res) => {
  const { url } = req.body;

  if (!url || !url.match(/instagram\.com\/(p|reel|tv)\//)) {
    return res.status(400).json({ error: "الرجاء إدخال رابط منشور انستجرام صحيح." });
  }

  try {
    const results = await scrapeInstagram(url);

    if (!results || results.length === 0) {
      return res.status(404).json({ error: "لم يتم العثور على محتوى قابل للتحميل." });
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message || "حدث خطأ أثناء المعالجة." });
  }
});

// تقديم ملف HTML الرئيسي
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
