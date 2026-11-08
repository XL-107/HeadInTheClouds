const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const trackingKey = "siteTimes";
const sessionsKey = "timerSessions";
let operationQueue = Promise.resolve();

function enqueue(operation) {
  const result = operationQueue.then(operation);
  operationQueue = result.catch(() => {});
  return result;
}

function siteForHost(host, blacklist) {
  return [...blacklist]
    .filter(domain => host === domain || host.endsWith(`.${domain}`))
    .sort((a, b) => b.length - a.length)[0] || host;
}

function hostForTab(tab) {
  try {
    return new URL(tab.url).hostname;
  } catch {
    return "";
  }
}

async function getFocusedTab() {
  const focusedWindow = await chrome.windows.getLastFocused();
  if (!focusedWindow.focused) return null;
  const tabs = await chrome.tabs.query({ active: true, windowId: focusedWindow.id });
  return tabs[0];
}

async function reconcileTimers() {
  const now = Date.now();
  const { blacklist = [], [trackingKey]: siteTimes = {}, [sessionsKey]: sessions = {} } =
    await chrome.storage.local.get(["blacklist", trackingKey, sessionsKey]);
  const focusedTab = await getFocusedTab();
  let changed = false;

  for (const [tabId, session] of Object.entries(sessions)) {
    const tab = focusedTab && String(focusedTab.id) === tabId ? focusedTab : null;
    const shouldRun = Boolean(tab && siteForHost(hostForTab(tab), blacklist) === session.site);

    if (shouldRun && session.startedAt === null) {
      session.startedAt = now;
      changed = true;
    } else if (!shouldRun && session.startedAt !== null) {
      siteTimes[session.site] = (siteTimes[session.site] || 0) + now - session.startedAt;
      session.startedAt = null;
      changed = true;
    }
  }

  if (changed) {
    await chrome.storage.local.set({ [trackingKey]: siteTimes, [sessionsKey]: sessions });
  }
  return { siteTimes, sessions };
}

async function startTimer(tabId, host) {
  return enqueue(async () => {
    const { blacklist = [], [sessionsKey]: sessions = {} } =
      await chrome.storage.local.get(["blacklist", sessionsKey]);
    sessions[tabId] = {
      site: siteForHost(host, blacklist),
      startedAt: null
    };
    await chrome.storage.local.set({ [sessionsKey]: sessions });
  });
}

async function stopTimer(tabId) {
  return enqueue(async () => {
    const { [trackingKey]: siteTimes = {}, [sessionsKey]: sessions = {} } =
      await chrome.storage.local.get([trackingKey, sessionsKey]);
    const session = sessions[tabId];
    if (!session) return;

    if (session.startedAt !== null) {
      siteTimes[session.site] = (siteTimes[session.site] || 0) + Date.now() - session.startedAt;
    }
    delete sessions[tabId];
    await chrome.storage.local.set({ [trackingKey]: siteTimes, [sessionsKey]: sessions });
  });
}

async function getOverview() {
  return enqueue(async () => {
    const { blacklist = [], [trackingKey]: siteTimes = {}, [sessionsKey]: sessions = {} } =
      await chrome.storage.local.get(["blacklist", trackingKey, sessionsKey]);
    const now = Date.now();
    const liveSites = new Set(
      Object.values(sessions)
        .filter(session => session.startedAt !== null)
        .map(session => session.site)
    );
    const sites = blacklist.map(site => ({
      site,
      milliseconds: (siteTimes[site] || 0) + [...Object.values(sessions)]
        .filter(session => session.site === site && session.startedAt !== null)
        .reduce((total, session) => total + now - session.startedAt, 0),
      live: liveSites.has(site)
    }));

    sites.sort((a, b) => Number(b.live) - Number(a.live) || b.milliseconds - a.milliseconds);
    return sites;
  });
}

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
  }).then(async () => {
    await startTimer(sender.tab.id, host);
    sendResponse({ ok: true });
  }).catch(error => {
    console.error("Unable to start timer:", error);
    sendResponse({ ok: false });
  });

  return true; // keep the channel open for the async response
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "getOverview") return;
  getOverview()
    .then(sites => sendResponse({ ok: true, sites }))
    .catch(error => {
      console.error("Unable to load timer overview:", error);
      sendResponse({ ok: false });
    });
  return true;
});

chrome.tabs.onActivated.addListener(() => enqueue(reconcileTimers).catch(console.error));
chrome.windows.onFocusChanged.addListener(windowId => {
  // WINDOW_ID_NONE fires when focus moves to things outside any browser
  // window's tab strip (our own popup, devtools, the omnibox) -- not a real
  // "user left the tab" signal, so ignore it rather than pausing timers.
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  enqueue(reconcileTimers).catch(console.error);
});
chrome.tabs.onUpdated.addListener(() => enqueue(reconcileTimers).catch(console.error));
chrome.tabs.onRemoved.addListener(tabId => stopTimer(tabId).catch(console.error));

// Re-sync whenever the list changes, and on install/startup
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.blacklist) {
    syncRules();
    enqueue(reconcileTimers).catch(console.error);
  }
});
chrome.runtime.onInstalled.addListener(() => {
  syncRules();
  enqueue(reconcileTimers).catch(console.error);
});
chrome.runtime.onStartup.addListener(() => {
  syncRules();
  enqueue(reconcileTimers).catch(console.error);
});