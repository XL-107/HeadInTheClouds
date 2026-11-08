const input = document.getElementById("domainInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("ruleList");
const overviewPanel = document.getElementById("overviewPanel");
const limitList = document.getElementById("limitList");
const limitEmpty = document.getElementById("limitEmpty");
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
  if (selectedTab.id === "otherTab") renderLimits();
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
  await renderLimits();
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
  const heading = document.createElement("h2");
  heading.className = "panel-title";
  heading.textContent = "Time Distracted";

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
  overviewPanel.append(heading, overviewList);
  resizePopup();
}

async function renderLimits() {
  const { blacklist = [], siteLimits = {} } = await chrome.storage.local.get(["blacklist", "siteLimits"]);
  limitList.innerHTML = "";
  limitEmpty.hidden = blacklist.length > 0;

  blacklist.forEach(site => {
    const item = document.createElement("li");
    item.className = "limit-row";

    const name = document.createElement("span");
    name.className = "limit-site";
    name.textContent = site;

    const minutesInput = document.createElement("input");
    minutesInput.type = "number";
    minutesInput.min = "1";
    minutesInput.step = "1";
    minutesInput.placeholder = "Minutes";
    minutesInput.setAttribute("aria-label", `Allowed distraction minutes for ${site}`);
    const limitMilliseconds = Number(siteLimits[site]) || 0;
    minutesInput.value = limitMilliseconds ? String(Math.ceil(limitMilliseconds / 60000)) : "";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save";
    saveButton.setAttribute("aria-label", `Save limit for ${site}`);
    saveButton.onclick = async () => {
      const { siteLimits: currentLimits = {} } = await chrome.storage.local.get("siteLimits");
      const updatedLimits = { ...currentLimits };
      const minutes = minutesInput.value.trim();

      if (!minutes) {
        delete updatedLimits[site];
      } else {
        const parsedMinutes = Number(minutes);
        if (!Number.isFinite(parsedMinutes) || parsedMinutes < 1) {
          minutesInput.reportValidity();
          return;
        }
        updatedLimits[site] = parsedMinutes * 60000;
      }

      await chrome.storage.local.set({ siteLimits: updatedLimits });
      await renderLimits();
    };

    item.append(name, minutesInput, saveButton);
    limitList.append(item);
  });

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