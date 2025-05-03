// 此脚本将被注入到所有页面中
// 记录扩展加载状态
<<<<<<< HEAD
console.log("网页内容精华扩展已加载");
=======
console.log("网页Markdown摘要扩展已加载");
>>>>>>> parent of 0386b93 (优化网页摘要扩展的名称和描述，调整弹出页面样式，移除标签切换功能，简化用户界面，增强加载提示信息。)

// 监听来自popup的消息并响应
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    sendResponse({success: true});
  }
}); 