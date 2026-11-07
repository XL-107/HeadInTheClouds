async function syncRules() {
    const { blacklist = [] } = await chrome.storage.local.get("blacklist");

    // Remove all existing dynamic rules, then re-add from the list
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing.map(r => r.id);

    const addRules = blacklist.map((domain, i) => ({
        id: i + 1,                      // IDs must be unique positive integers
        priority: 1,
        action: {
            type: "redirect",
            // Redirect to your own page...
            redirect: { extensionPath: "/blocked.html" }
            // ...or to any URL:
            // redirect: { url: "https://example.com" }
        },
        condition: {
            urlFilter: `||${domain}`,     // matches domain and all subdomains
            resourceTypes: ["main_frame"] // only top-level page navigations
        }
    }));

    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

// Re-sync whenever the list changes, and on install/startup
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.blacklist) syncRules();
});
chrome.runtime.onInstalled.addListener(syncRules);
chrome.runtime.onStartup.addListener(syncRules);