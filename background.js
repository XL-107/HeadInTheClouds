const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function syncRules() {
  const { blacklist = [] } = await chrome.storage.local.get("blacklist");

  // Build the rules here, where blacklist is in scope
  const addRules = blacklist.map((domain, i) => ({
    id: i + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        // \0 = the entire URL that matched the regex
        regexSubstitution: `chrome-extension://${chrome.runtime.id}/blocked.html#\\0`
      }
    },
    condition: {
      regexFilter: `^https?://([^/]*\\.)?${escapeRegex(domain)}(:\\d+)?(/.*)?$`,
      resourceTypes: ["main_frame"]
    }
  }));

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map(r => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

// Handle the Continue button's message from blocked.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "continue" || !sender.tab) return;

  const host = new URL(msg.url).hostname;
  const ruleId = sender.tab.id + 100000; // one rule per tab

  chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ruleId],
    addRules: [{
      id: ruleId,
      priority: 10, // must beat the redirect rules
      action: { type: "allow" },
      condition: {
        requestDomains: [host],
        resourceTypes: ["main_frame"],
        tabIds: [sender.tab.id]
      }
    }]
  }).then(() => sendResponse({ ok: true }));

  return true; // keep the channel open for the async response
});

// Re-sync whenever the list changes, and on install/startup
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.blacklist) syncRules();
});
chrome.runtime.onInstalled.addListener(syncRules);
chrome.runtime.onStartup.addListener(syncRules);