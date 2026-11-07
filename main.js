const input = document.getElementById("domainInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("ruleList");
const tabs = [...document.querySelectorAll('[role="tab"]')];

function activateTab(selectedTab) {
  tabs.forEach(tab => {
    const selected = tab === selectedTab;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !selected;
  });
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
  render();
};

// Allow pressing Enter to add
input.addEventListener("keydown", e => {
  if (e.key === "Enter") addBtn.click();
});

render();