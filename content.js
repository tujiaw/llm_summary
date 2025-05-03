// 此脚本将被注入到所有页面中
// 记录扩展加载状态
console.log("网页内容精华扩展已加载");

// 监听来自popup的消息并响应
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    sendResponse({success: true});
  }
}); 