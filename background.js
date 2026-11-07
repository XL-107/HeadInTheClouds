chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ blockedDomains: [] }, (data) => {
    if (data.blockedDomains.length > 0) {
      const rules = data.blockedDomains.map((domain, index) => ({
        id: index + 1,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: `*://${domain}/*`,
          resourceTypes: ['main_frame']
        }
      }));

      chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules
      });
    }
  });
});
