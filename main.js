const input = document.getElementById("domainInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("ruleList");

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