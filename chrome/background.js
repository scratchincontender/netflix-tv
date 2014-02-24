// Called when the url of a tab changes.
function checkForValidUrl(tabId, changeInfo, tab) {
  if (changeInfo.status == 'complete') {
    if (tab.url.indexOf('netflix') > -1) {
      chrome.tabs.executeScript(null, {file: "content_script.js"});
    }
  }
}

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForValidUrl);
