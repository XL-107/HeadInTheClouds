const GEMINI_MODEL = "gemini-2.5-flash"; // check Google's docs for the current model name

async function getFocusTip(context = "") {
  const { geminiKey } = await chrome.storage.local.get("geminiKey");
  if (!geminiKey) throw new Error("Add your Gemini API key in the Other tab first.");

  const prompt =
    "You are a supportive focus coach inside a website-blocker extension. " +
    "The user just got distracted. Give ONE short, practical, non-judgmental " +
    "focus tip (max 2 sentences) based on evidence-backed habits such as " +
    "time-boxing, the Pomodoro technique, removing friction, or taking a short walk. " +
    (context ? `Context: ${context}` : "");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );

  if (!res.ok) throw new Error(`Gemini request failed (${res.status})`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No tip returned.";
}