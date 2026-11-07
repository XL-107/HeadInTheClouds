const contBtn = document.getElementById("contBtn");

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