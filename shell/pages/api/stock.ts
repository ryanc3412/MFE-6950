import type { NextApiRequest, NextApiResponse } from "next";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const raw = req.query.symbol;
  const symbol =
    typeof raw === "string" ? raw.trim().toUpperCase() : Array.isArray(raw) ? raw[0]?.trim().toUpperCase() : "";

  if (!symbol) {
    return res.status(400).json({ error: "Please provide a 'symbol' query param (e.g. AAPL)." });
  }

  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    return res.status(500).json({ error: "FINNHUB_API_KEY is not configured." });
  }

  const params = new URLSearchParams({ symbol, token });

  try {
    const [quoteRes, profileRes] = await Promise.all([
      fetch(`${FINNHUB_BASE}/quote?${params}`),
      fetch(`${FINNHUB_BASE}/stock/profile2?${params}`),
    ]);

    const [quote, profile] = await Promise.all([
      quoteRes.json(),
      profileRes.json().catch(() => null),
    ]);

    const price = quote?.c;
    if (price == null || typeof price !== "number") {
      return res.status(404).json({ error: "Quote not found for this symbol." });
    }

    const name = profile?.name && typeof profile.name === "string" ? profile.name : null;

    return res.status(200).json({
      symbol,
      name,
      price,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream request failed";
    return res.status(502).json({ error: message });
  }
}
