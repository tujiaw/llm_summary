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
  
  // 从存储中获取API key
  chrome.storage.local.get(['apiKey'], function(result) {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });
  
  // 保存API key
  saveApiKeyBtn.addEventListener('click', function() {
    const apiKey = apiKeyInput.value;
    if (!apiKey) {
      showToast('请输入API Key');
      return;
    }
    chrome.storage.local.set({apiKey: apiKey}, function() {
      showToast('API Key已保存');
    });
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
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 500);
    }, 2000);
  }
  
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
    summaryContent.innerHTML = '';
    
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
      
<<<<<<< HEAD
      // 获取Markdown内容
      let markdown = results[0].result;
=======
      // 显示Markdown内容
      const markdown = results[0].result;
      markdownContent.textContent = markdown;
      
      // 切换到Markdown标签
      tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === 'markdown') {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById('markdown-tab').classList.add('active');
>>>>>>> parent of 0386b93 (优化网页摘要扩展的名称和描述，调整弹出页面样式，移除标签切换功能，简化用户界面，增强加载提示信息。)
      
      // 获取API key
      const apiKey = apiKeyInput.value;
      if (!apiKey) {
        showToast('请先设置API Key');
        loading.style.display = 'none';
        return;
      }
      
      // 获取内容精华
      summaryContent.innerHTML = '<p>正在提取核心内容...</p>';
      let summary = await getSummary(markdown, apiKey);
      
      // 如果遇到token超限，则逐步优化内容长度并重试
      if (summary === 'TOKEN_LIMIT_EXCEEDED') {
        summaryContent.innerHTML = '<p>内容过长，正在优化处理...</p>';
        
        // 尝试预处理内容并重新获取摘要
        markdown = preprocessMarkdown(markdown);
        summary = await getSummary(markdown, apiKey);
        
        // 如果仍然超过限制，进一步减少内容
        let reductionLevel = 1;
        while (summary === 'TOKEN_LIMIT_EXCEEDED' && reductionLevel <= 3) {
          summaryContent.innerHTML = `<p>继续优化内容 (${reductionLevel}/3)...</p>`;
          
          // 增加裁剪强度
          markdown = reduceMarkdownContent(markdown, reductionLevel);
          summary = await getSummary(markdown, apiKey);
          reductionLevel++;
        }
        
        // 如果经过多次尝试仍然失败
        if (summary === 'TOKEN_LIMIT_EXCEEDED') {
          summary = '# 内容过长，无法处理\n\n网页内容太长，即使经过多次优化仍超出处理限制。建议选择较小的内容块进行处理。';
        }
      }
      
      // 使用marked.js渲染Markdown格式的摘要
      summaryContent.innerHTML = marked.parse(summary);
      
      // 获取完摘要后自动切换到摘要标签
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      document.querySelector('[data-tab="summary"]').classList.add('active');
      document.getElementById('summary-tab').classList.add('active');
      
    } catch (error) {
      console.error('Error:', error);
      markdownContent.textContent = '发生错误: ' + error.message;
      showToast('操作失败: ' + error.message);
    } finally {
      loading.style.display = 'none';
    }
  });
  
  // 预处理Markdown，去除明显无关内容但不大幅减少内容
  function preprocessMarkdown(markdown) {
    // 创建一个克隆，避免修改原始内容
    let processed = markdown;
    
    // 移除导航、页脚等常见不相关内容
    const sectionsToRemove = [
      /(?:nav|navigation|navbar|menu)[\s\S]*?(?:\n#{1,3}|\n\n)/ig,
      /(?:footer|copyright|版权|备案)[\s\S]*?(?:$|\n#{1,3})/ig,
      /广告[\s\S]*?(?:\n#{1,3}|\n\n)/g,
      /comments?[\s\S]*?(?:\n#{1,3}|\n\n)/ig
    ];
    
    for (const pattern of sectionsToRemove) {
      processed = processed.replace(pattern, '\n\n');
    }
    
    // 删除多余空行
    processed = processed.replace(/\n{3,}/g, '\n\n');
    
    return processed;
  }
  
  // 根据不同级别减少Markdown内容量
  function reduceMarkdownContent(markdown, level) {
    // 保留标题
    const titleMatch = markdown.match(/^# .+/m);
    const title = titleMatch ? titleMatch[0] : '';
    
    // 根据不同级别裁剪内容
    switch (level) {
      case 1: // 第一级裁剪：保留60%的内容
        return title + '\n\n' + truncateContent(markdown, 0.6);
        
      case 2: // 第二级裁剪：保留40%的内容，并优先保留重要段落
        return title + '\n\n' + keepImportantSections(markdown, 0.4);
        
      case 3: // 第三级裁剪：仅保留20%的核心内容
        return title + '\n\n' + extractCoreContent(markdown, 0.2);
        
      default:
        return markdown;
    }
  }
  
  // 简单截断内容到指定百分比
  function truncateContent(markdown, percentage) {
    const contentWithoutTitle = markdown.replace(/^# .+\n\n/, '');
    const targetLength = Math.floor(contentWithoutTitle.length * percentage);
    return contentWithoutTitle.substring(0, targetLength) + 
           '\n\n...(内容已截断)...';
  }
  
  // 保留重要段落，减少到指定比例
  function keepImportantSections(markdown, percentage) {
    const contentWithoutTitle = markdown.replace(/^# .+\n\n/, '');
    const paragraphs = contentWithoutTitle.split('\n\n');
    
    // 关键词模式，用于识别重要段落
    const keywordPatterns = [
      /概述|摘要|介绍|简介|总结|结论|背景|方法|结果|讨论|分析/i,
      /summary|overview|introduction|conclusion|abstract|background|method|result|discussion/i,
      /主要|重点|关键|核心|特点|特征|优势|优点/i,
      /main|key|core|feature|advantage|highlight|important/i
    ];
    
    // 标记每个段落的重要性
    const markedParagraphs = paragraphs.map(p => {
      let importance = 0;
      
      // 检查是否包含标题
      if (/^#{1,5} /.test(p)) {
        importance += 3; // 标题很重要
      }
      
      // 检查是否包含关键词
      for (const pattern of keywordPatterns) {
        if (pattern.test(p)) {
          importance += 2;
          break;
        }
      }
      
      // 检查段落长度（通常中等长度的段落更有信息量）
      const wordCount = p.split(/\s+/).length;
      if (wordCount > 10 && wordCount < 100) {
        importance += 1;
      }
      
      return { text: p, importance };
    });
    
    // 根据重要性排序
    markedParagraphs.sort((a, b) => b.importance - a.importance);
    
    // 保留总内容的percentage比例
    const targetCount = Math.max(5, Math.floor(paragraphs.length * percentage));
    const selectedParagraphs = markedParagraphs.slice(0, targetCount).map(p => p.text);
    
    // 按原顺序重新排列选定的段落
    const originalOrder = [];
    for (const para of paragraphs) {
      if (selectedParagraphs.includes(para)) {
        originalOrder.push(para);
      }
    }
    
    return originalOrder.join('\n\n') + '\n\n...(内容已优化)...';
  }
  
  // 提取核心内容
  function extractCoreContent(markdown, percentage) {
    const contentWithoutTitle = markdown.replace(/^# .+\n\n/, '');
    
    // 将内容分为开始、中间和结束三部分
    const totalLength = contentWithoutTitle.length;
    const startLength = Math.floor(totalLength * percentage * 0.6); // 60%的预算给开头
    const endLength = Math.floor(totalLength * percentage * 0.2);   // 20%的预算给结尾
    const middleLength = Math.floor(totalLength * percentage * 0.2); // 20%的预算给中间
    
    // 提取三个部分
    const startContent = contentWithoutTitle.substring(0, startLength);
    
    const middleStartPos = Math.floor(totalLength / 2) - Math.floor(middleLength / 2);
    const middleContent = contentWithoutTitle.substring(
      middleStartPos, 
      middleStartPos + middleLength
    );
    
    const endContent = contentWithoutTitle.substring(totalLength - endLength);
    
    // 组合内容
    return startContent + 
           '\n\n...(中间内容已省略)...\n\n' + 
           middleContent + 
           '\n\n...(中间内容已省略)...\n\n' + 
           endContent;
  }
  
  // 获取网页内容并转换为Markdown的函数
  function getPageContent() {
    try {
      // 预先过滤掉不需要的元素
      const elementsToRemove = [
        'script', 'style', 'iframe', 'nav', 'footer',
        'aside', 'advertisement', '.ad', '.ads', '.advert',
        '.comment', '.comments', '#comments', '.sidebar'
      ];
      
      // 创建一个文档的克隆，以便我们可以修改它而不影响原始页面
      const docClone = document.cloneNode(true);
      
      // 移除不需要的元素
      elementsToRemove.forEach(selector => {
        const elements = docClone.querySelectorAll(selector);
        elements.forEach(el => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      });
      
      // 尝试识别并保留主要内容区域
      let mainContent = docClone.querySelector('main, article, .content, .post, .entry, #content, #main');
      
      // 如果找不到明确的主要内容区，则使用整个body
      const contentToConvert = mainContent || docClone.body;
      
      // 配置turndown
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        hr: '---',
        bulletListMarker: '-'
      });
      
      // 添加一些自定义规则来忽略某些元素
      turndownService.addRule('ignoreHiddenElements', {
        filter: function(node) {
          // 忽略隐藏元素和空元素
          const style = window.getComputedStyle(node);
          return style.display === 'none' || style.visibility === 'hidden' || node.offsetHeight === 0;
        },
        replacement: function() {
          return '';
        }
      });
      
      // 使用turndown转换HTML到Markdown
      let markdown = turndownService.turndown(contentToConvert);
      
      // 在前面添加标题
      const title = document.title;
      markdown = `# ${title}\n\n${markdown}`;
      
      return markdown;
    } catch (error) {
      console.error('转换内容时出错:', error);
      return `# ${document.title}\n\n转换内容时出错: ${error.message}`;
    }
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
              content: '你是一个网页内容理解助手。请直接用Markdown格式提取并输出页面的核心内容和重点信息。使用标题、段落、列表来组织内容，使用**粗体**标记关键词。不要使用"摘要"、"概述"等元描述词，直接以第三人称客观地呈现内容。不要说"这篇文章"、"本文"等，就像你在写一篇独立的短文。即使输入内容被截断，也请基于可用信息提取核心内容。'
            },
            {
              role: 'user',
              content: `请为以下网页内容提取核心信息，直接用Markdown格式输出，不要使用"摘要"、"文章"等描述性词语：\n\n${markdown}`
            }
          ]
        })
      });
      
      const data = await response.json();
      
      // 检查是否有错误
      if (data.error) {
        // 检查是否是token超限错误
        if (data.error.message && (
            data.error.message.includes('token limit') || 
            data.error.message.includes('超出') || 
            data.error.message.includes('too long') ||
            data.error.message.includes('exceed') ||
            data.error.message.includes('limit')
          )) {
          console.log('Token超限，需要优化内容长度');
          return 'TOKEN_LIMIT_EXCEEDED';
        }
        
        throw new Error(data.error.message);
      }
      
      return data.choices[0].message.content;
    } catch (error) {
      console.error('获取摘要失败:', error);
      
      // 对于网络错误或API错误，也返回一个特定标识
      if (error.message && error.message.includes('fetch') || 
          error.message.includes('network') ||
          error.message.includes('API')) {
        showToast('API调用失败，请检查网络和API Key');
        return '# 处理失败\n\n请检查您的网络连接和API Key是否正确。\n\n详细错误: ' + error.message;
      }
      
      showToast('处理失败');
      return '# 处理失败\n\n' + error.message;
    }
  }
}); 