import fs from "fs";
import path from "path";

const WEBHOOK = "https://discord.com/api/webhooks/XXX/YYY";

export default async function handler(req, res) {

  // CORS (başka siteler çağırabilsin)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.json({ success:false, error:"Method not allowed" });
  }

  const { nickname, password } = req.body;

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  const file = path.join(process.cwd(), "licenses.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  const user = data.licenses.find(
    u => u.nickname === nickname && u.password === password
  );

  if (!user || !user.active) {
    return res.json({ success:false, error:"Lisans geçersiz" });
  }

  const now = new Date();
  const end = new Date(user.end_date);
  const daysLeft = Math.ceil((end - now) / 86400000);

  if (daysLeft <= 0) {
    return res.json({ success:false, error:"Lisans süresi dolmuş" });
  }

  // IP bind
  if (!user.ip) {
    user.ip = ip;
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } else if (user.ip !== ip) {
    return res.json({ success:false, error:"IP uyuşmuyor" });
  }

  // Discord webhook
  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      content:
        `🔓 Lisans Girişi\n👤 ${nickname}\n🌍 ${ip}\n⏱ ${daysLeft} gün`
    })
  });

  return res.json({
    success:true,
    daysLeft
  });
}
