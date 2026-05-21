export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwmh9ltQGRNTD9roY6tpsq09e4BCJvZzNlRaqxJDQDVOibHt-a2n-V2hTCmUIiXOxfQ/exec";

  if (req.method === "GET") {
    const response = await fetch(SCRIPT_URL);
    const data = await response.json();
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const form = new URLSearchParams();
    form.append("data", JSON.stringify(req.body));
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: form,
    });
    const data = await response.json();
    return res.status(200).json(data);
  }
}
