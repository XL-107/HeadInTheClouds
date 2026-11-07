document.getElementById('addBtn').addEventListener('click', async () => {
  const domain = document.getElementById('domainInput').value.trim();
  if (!domain) return;

  chrome.storage.local.get({ blockedDomains: [] }, (data) => {
    const updatedDomains = [...new Set([...data.blockedDomains, domain])];
    chrome.storage.local.set({ blockedDomains: updatedDomains }, () => {
      document.getElementById('domainInput').value = '';
      updateDynamicRules(updatedDomains);
      renderList(updatedDomains);
    });
  });
});

function updateDynamicRules(domains) {
  // Convert domains into declarativeNetRequest rules
  const newRules = domains.map((domain, index) => ({
    id: index + 1, // Unique ID per rule (must be integer > 0)
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `*://${domain}/*`,
      resourceTypes: ['main_frame']
    }
  }));

  // Get existing dynamic rule IDs to remove them before adding updated ones
  chrome.declarativeNetRequest.getDynamicRules((oldRules) => {
    const oldRuleIds = oldRules.map(r => r.id);
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: newRules
    });
  });
}
