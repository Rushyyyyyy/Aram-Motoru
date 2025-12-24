import fs from "fs";
import path from "path";

const WEBHOOK = "https://discord.com/api/webhooks/XXXX/XXXX";

export default async function handler(req, res) {
  const { nick, pass } = req.query;
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  if (!nick || !pass) {
    return res.json({ success: false, error: "Eksik bilgi" });
  }

  const filePath = path.join(process.cwd(), "users.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  const user = data.users.find(
    u => u.nickname === nick && u.password === pass
  );

  if (!user) {
    return res.json({ success: false, error: "Lisans bulunamadı" });
  }

  // IP bind
  if (!user.ip) {
    user.ip = ip; // ilk girişte bağla
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } else if (user.ip !== ip) {
    return res.json({ success: false, error: "IP uyuşmuyor" });
  }

  // Süre kontrol
  const today = new Date();
  const end = new Date(user.end);
  const daysLeft = Math.ceil((end - today) / 86400000);

  if (daysLeft <= 0) {
    return res.json({ success: false, error: "Lisans süresi dolmuş" });
  }

  // Discord webhook
  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content:
        `🔓 **Giriş Yapıldı**\n` +
        `👤 ${user.nickname}\n` +
        `🌍 IP: ${ip}\n` +
        `⏳ Kalan gün: ${daysLeft}`
    })
  });

  res.json({
    success: true,
    nickname: user.nickname,
    daysLeft
  });
}
