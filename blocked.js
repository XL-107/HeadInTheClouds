const contBtn = document.getElementById("contBtn");
const totalDistracted = document.getElementById("totalDistracted");
const limitMessage = document.getElementById("limitMessage");

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

function getTargetUrl() {
  try {
    const url = new URL(location.hash.slice(1));
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

async function updateContinueAvailability(url) {
  const status = await chrome.runtime.sendMessage({ type: "getLimitStatus", url: url.href });
  const limitReached = Boolean(status?.ok && status.exceeded);
  contBtn.hidden = limitReached;
  limitMessage.hidden = !limitReached;

  if (limitReached) {
    limitMessage.textContent = `Your distraction limit for ${status.site} has been reached.`;
  }
  return limitReached;
}

async function checkLimitOnLoad() {
  const target = getTargetUrl();
  if (!target) {
    contBtn.hidden = false;
    return;
  }

  try {
    await updateContinueAvailability(target);
  } catch {
    contBtn.hidden = false;
  }
}

contBtn.hidden = true;
checkLimitOnLoad();

contBtn.onclick = async () => {
  const target = getTargetUrl();
  if (!target) return;

  try {
    if (await updateContinueAvailability(target)) return;
    const response = await chrome.runtime.sendMessage({ type: "continue", url: target.href });
    if (response?.ok) location.href = target.href;
  } catch (error) {
    console.error("Unable to check distraction limit:", error);
  }
};