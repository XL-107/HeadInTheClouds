const contBtn = document.getElementById("contBtn");
const totalDistracted = document.getElementById("totalDistracted");

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map(value => String(value).padStart(2, "0")).join(":");
}

async function renderTotalDistracted() {
  const response = await chrome.runtime.sendMessage({ type: "getOverview" });
  if (!response?.ok) return;

  const totalMilliseconds = response.sites.reduce(
    (total, site) => total + Math.max(0, Number(site.milliseconds) || 0),
    0
  );
  totalDistracted.textContent = formatDuration(totalMilliseconds);
}

renderTotalDistracted().catch(() => {
  totalDistracted.textContent = "--:--:--";
});

contBtn.onclick = async () => {
  const target = location.hash.slice(1); // everything after the #

  let url;
  try {
    url = new URL(target);
  } catch {
    return;
  }
  if (!["http:", "https:"].includes(url.protocol)) return;

  await chrome.runtime.sendMessage({ type: "continue", url: url.href });
  location.href = url.href;
};