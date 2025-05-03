document.addEventListener('DOMContentLoaded', function() {
  // 获取元素
  const convertBtn = document.getElementById('convertBtn');
  const markdownContent = document.getElementById('markdown-content');
  const summaryContent = document.getElementById('summary-content');
  const loading = document.getElementById('loading');
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // 从存储中获取API key
  chrome.storage.local.get(['apiKey'], function(result) {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });
  
  // 保存API key
  saveApiKeyBtn.addEventListener('click', function() {
    const apiKey = apiKeyInput.value;
    chrome.storage.local.set({apiKey: apiKey}, function() {
      alert('API Key已保存');
    });
  });
  
  // 标签切换功能
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // 移除所有标签的活动状态
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // 添加当前标签的活动状态
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
  
  // 获取并转换网页内容
  convertBtn.addEventListener('click', async function() {
    loading.style.display = 'block';
    markdownContent.textContent = '';
    summaryContent.textContent = '';
    
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
      
      // 显示Markdown内容
      const markdown = results[0].result;
      markdownContent.textContent = markdown;
      
      // 获取API key
      const apiKey = apiKeyInput.value;
      if (!apiKey) {
        alert('请先设置API Key');
        loading.style.display = 'none';
        return;
      }
      
      // 获取摘要
      const summary = await getSummary(markdown, apiKey);
      summaryContent.innerHTML = summary;
      
      // 切换到摘要标签
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      document.querySelector('[data-tab="summary"]').classList.add('active');
      document.getElementById('summary-tab').classList.add('active');
      
    } catch (error) {
      console.error('Error:', error);
      markdownContent.textContent = '发生错误: ' + error.message;
    } finally {
      loading.style.display = 'none';
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
  async function getSummary(markdown, apiKey) {
    try {
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'THUDM/GLM-4-9B-0414',
          messages: [
            {
              role: 'system',
              content: '你是一个网页内容摘要助手，请为用户提供的网页内容生成一个简洁清晰的摘要，突出重点信息。'
            },
            {
              role: 'user',
              content: `请为以下网页内容提供一个简明扼要的摘要，帮助我快速了解网页的主要内容：\n\n${markdown.substring(0, 8000)}`
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
      return '获取摘要失败: ' + error.message;
    }
  }
}); 