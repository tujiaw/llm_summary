// 此脚本将被注入到所有页面中
console.log("网页Markdown摘要扩展已加载");

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getPageContent") {
    // 这部分工作已在popup.js中通过executeScript实现
    sendResponse({success: true});
  }
}); 