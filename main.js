const input = document.getElementById("domainInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("ruleList");
const overviewPanel = document.getElementById("overviewPanel");
const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = [...document.querySelectorAll(".tab-panel")];

function resizePopup() {
  const activePanel = panels.find(panel => !panel.hidden);
  if (!activePanel) return;

  const bottomPadding = parseFloat(getComputedStyle(document.body).paddingBottom);
  const height = Math.ceil(activePanel.getBoundingClientRect().bottom + bottomPadding);
  document.documentElement.style.height = `${height}px`;
  document.body.style.height = `${height}px`;
}

const panelObserver = new ResizeObserver(resizePopup);
panels.forEach(panel => panelObserver.observe(panel));

function activateTab(selectedTab) {
  tabs.forEach(tab => {
    const selected = tab === selectedTab;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !selected;
  });
  resizePopup();
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateTab(tab));
  tab.addEventListener("keydown", event => {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    tabs[nextIndex].focus();
    activateTab(tabs[nextIndex]);
  });
});

async function render() {
  const { blacklist = [] } = await chrome.storage.local.get("blacklist");
  list.innerHTML = "";

  blacklist.forEach(domain => {
    const li = document.createElement("li");
    li.textContent = domain + " ";

    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.onclick = async () => {
      await chrome.storage.local.set({
        blacklist: blacklist.filter(d => d !== domain)
      });
      render();
    };

    li.append(btn);
    list.append(li);
  });

  await renderOverview();
  resizePopup();
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map(value => String(value).padStart(2, "0")).join(":");
}

async function renderOverview() {
  const response = await chrome.runtime.sendMessage({ type: "getOverview" });
  if (!response?.ok) return;

  overviewPanel.innerHTML = "";
  const overviewList = document.createElement("ul");
  overviewList.id = "overviewList";
  response.sites.forEach(({ site, milliseconds, live }) => {
    const item = document.createElement("li");
    item.className = live ? "live" : "";
    item.textContent = site;

    const time = document.createElement("span");
    time.textContent = formatDuration(milliseconds);
    time.setAttribute("aria-label", `${formatDuration(milliseconds)} spent`);
    item.append(time);
    overviewList.append(item);
  });
  overviewPanel.append(overviewList);
  resizePopup();
}

addBtn.onclick = async () => {
  const domain = input.value.trim().toLowerCase()
    .replace(/^https?:\/\//, "")  // strip protocol
    .replace(/\/.*$/, "");        // strip path

  if (!domain) return;

  const { blacklist = [] } = await chrome.storage.local.get("blacklist");
  if (!blacklist.includes(domain)) {
    await chrome.storage.local.set({ blacklist: [...blacklist, domain] });
  }

  input.value = "";
  await render();
};

// Allow pressing Enter to add
input.addEventListener("keydown", e => {
  if (e.key === "Enter") addBtn.click();
});

render();

setInterval(() => {
  const overviewTab = document.getElementById("overviewTab");
  if (overviewTab.getAttribute("aria-selected") === "true") renderOverview();
}, 1000);