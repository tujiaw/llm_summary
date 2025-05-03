document.addEventListener('DOMContentLoaded', function() {
  // 获取元素
  const convertBtn = document.getElementById('convertBtn');
  const summaryContent = document.getElementById('summary-content');
  const loading = document.getElementById('loading');
  const settingsToggle = document.getElementById('settingsToggle');
  
  // 配置marked选项
  marked.setOptions({
    renderer: new marked.Renderer(),
    gfm: true,
    breaks: true,
    sanitize: false,
    smartLists: true,
    smartypants: false,
    xhtml: false
  });
  
  // 设置按钮点击事件 - 导航到设置页面
  settingsToggle.addEventListener('click', function() {
    window.location.href = 'settings.html';
  });
  
  // 简单的提示信息函数
  function showToast(message) {
    // 移除现有的toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      document.body.removeChild(existingToast);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 添加显示动画
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px) translateX(-50%)';
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0) translateX(-50%)';
    }, 10);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px) translateX(-50%)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 2000);
  }
  
  // 获取并转换网页内容
  convertBtn.addEventListener('click', async function() {
    summaryContent.innerHTML = '<p>准备处理...</p>';
    
    try {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 注入turndown脚本
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['turndown.js']
      });
      
      // 执行内容脚本
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: getPageContent
      });
      
      // 获取Markdown内容
      const markdown = results[0].result;
      
      // 获取存储的设置
      const settings = await new Promise(resolve => {
        chrome.storage.local.get(['apiKey', 'model', 'maxLength'], resolve);
      });
      
      if (!settings.apiKey) {
        showToast('请先设置API Key');
        // 重定向到设置页面
        setTimeout(() => {
          window.location.href = 'settings.html';
        }, 1000);
        summaryContent.innerHTML = '<p>请设置API Key后再试</p>';
        return;
      }
      
      const apiKey = settings.apiKey;
      const model = settings.model || 'THUDM/GLM-4-9B-0414';
      const maxLength = parseInt(settings.maxLength) || 8000;
      
      // 获取摘要
      summaryContent.innerHTML = '<p>正在生成摘要...</p>';
      const summary = await getSummary(markdown, apiKey, model, maxLength);
      
      // 使用marked.js渲染Markdown格式的摘要
      summaryContent.innerHTML = marked.parse(summary);
      
    } catch (error) {
      console.error('Error:', error);
      summaryContent.innerHTML = marked.parse('# 发生错误\n\n' + error.message);
      showToast('操作失败: ' + error.message);
    } finally {
      if (loading) {
        loading.style.display = 'none';
      }
    }
  });
  
  // 获取网页内容并转换为Markdown的函数
  function getPageContent() {
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
    
    // 使用turndown转换HTML到Markdown
    let markdown = turndownService.turndown(document.body);
    
    // 在前面添加标题
    const title = document.title;
    markdown = `# ${title}\n\n${markdown}`;
    
    return markdown;
  }
  
  // 获取摘要的函数
  async function getSummary(markdown, apiKey, model, maxLength) {
    try {
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: '你是一个网页内容摘要助手，请为用户提供的网页内容生成一个简洁清晰的摘要，突出重点信息。请使用Markdown格式输出，包括标题、段落、列表，以及使用**粗体**或*斜体*标记关键词和重要概念。可以使用引用块>来突出重要段落。'
            },
            {
              role: 'user',
              content: `请为以下网页内容提供一个结构清晰、易于阅读的Markdown格式摘要，帮助我快速理解网页的核心内容：\n\n${markdown.substring(0, maxLength)}`
            }
          ]
        })
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      return data.choices[0].message.content;
    } catch (error) {
      console.error('获取摘要失败:', error);
      showToast('获取摘要失败');
      return '# 获取摘要失败\n\n' + error.message;
    }
  }
}); 