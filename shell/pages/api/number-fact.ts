import type { NextApiRequest, NextApiResponse } from "next";

const NUMBERS_API = "https://numbersapi.com";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const raw = req.query.number;
  const num =
    typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? raw[0] : "";
  const parsed = num === "" ? NaN : Number(num);

  if (num === "" || Number.isNaN(parsed) || !Number.isInteger(parsed)) {
    return res.status(400).json({ error: "Please provide a valid integer 'number' query param." });
  }

  try {
    const apiRes = await fetch(
      `${NUMBERS_API}/${encodeURIComponent(parsed)}?json`
    );
    const data = await apiRes.json();

    if (!apiRes.ok) {
      return res.status(apiRes.status).json(data);
    }

    return res.status(200).json({
      number: data.number ?? parsed,
      text: data.text ?? data.message ?? "No fact found.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream request failed";
    return res.status(502).json({ error: message });
  }
}
