import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { token } = req.body;
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!token || !secret) {
    return res.status(400).json({ message: "Invalid request" });
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${secret}&response=${token}`,
      }
    );
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error verifying CAPTCHA:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
