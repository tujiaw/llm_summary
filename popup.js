// 配置服务和摘要功能整合

/**
 * 默认配置值
 */
const DEFAULT_CONFIG = {
  // 当前选择的模型
  currentModel: 'glm-4-9b',
  
  // Native language setting
  nativeLanguage: 'zh',
  
  // 模型定义列表
  modelDefinitions: {
    // 免费模型
    'glm-4-9b': {
      name: 'THUDM/GLM-4-9B-0414',
      type: 'silicon-flow',
      apiEndpoint: 'https://api.siliconflow.cn/v1/chat/completions'
    },
    'qwen-7b': {
      name: 'Qwen/Qwen2.5-7B-Instruct',
      type: 'silicon-flow',
      apiEndpoint: 'https://api.siliconflow.cn/v1/chat/completions'
    },
    'qwen-coder-7b': {
      name: 'Qwen/Qwen2.5-Coder-7B-Instruct',
      type: 'silicon-flow',
      apiEndpoint: 'https://api.siliconflow.cn/v1/chat/completions'
    },
    'glm-4-9b-chat': {
      name: 'THUDM/glm-4-9b-chat',
      type: 'silicon-flow',
      apiEndpoint: 'https://api.siliconflow.cn/v1/chat/completions'
    },
    // 新增中科院大模型
    'glm-4-flash': {
      name: 'GLM-4-Flash',
      type: 'zhipu',
      apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
    },
    'glm-4-flash-250414': {
      name: 'GLM-4-Flash-250414',
      type: 'zhipu',
      apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
    }
  },
  
  // API密钥设置
  apiKeys: {
    'silicon-flow': '',
    'zhipu': ''
  },
  
  // 自定义模型设置
  customModel: {
    enabled: false,
    name: '',
    apiEndpoint: '',
    type: 'custom'
  },

  // 摘要设置
  summary: {
    maxLength: 8000,
    promptTemplate: `请为以下网页内容提供一个结构清晰、易于阅读的中文摘要，帮助我快速理解网页的核心内容。请突出重点信息，使用Markdown格式输出，包括标题、段落、列表，以及使用**粗体**或*斜体*标记关键词和重要概念。可以使用引用块>来突出重要段落。不要使用代码块。`
  }
};

/**
 * 配置服务类 - 处理配置的加载、保存和管理
 */
class ConfigService {
  /**
   * 深度合并对象，用于配置更新
   * @param {object} target - 目标对象
   * @param {object} source - 源对象
   * @returns {object} 合并后的对象
   * @private
   */
  static _deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this._deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }
  
  /**
   * 创建安全的配置对象，确保所有必要字段都存在
   * @param {object} config - 用户配置
   * @returns {object} 安全的配置对象
   * @private
   */
  static _createSafeConfig(config) {
    return this._deepMerge(DEFAULT_CONFIG, config || {});
  }

  /**
   * 加载配置
   * @returns {Promise<object>} 配置对象
   */
  static async load() {
    return new Promise((resolve, reject) => {
      try {
        console.log('正在加载配置...');
        chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome存储错误:', chrome.runtime.lastError);
            reject(new Error(`加载设置失败: ${chrome.runtime.lastError.message}`));
            return;
          }
          
          // 使用深度合并创建配置
          const config = this._createSafeConfig(items);
          
          // 确保有效的currentModel
          if (!config.modelDefinitions[config.currentModel] && config.currentModel !== 'custom') {
            config.currentModel = DEFAULT_CONFIG.currentModel;
            console.warn(`无效的模型选择，重置为默认: ${config.currentModel}`);
          }
          
          console.log('配置加载成功', JSON.stringify({
            currentModel: config.currentModel,
            modelDefinitionsCount: Object.keys(config.modelDefinitions).length,
            apiKeySiliconFlow: config.apiKeys['silicon-flow'] ? '已设置' : '未设置',
            apiKeyZhipu: config.apiKeys['zhipu'] ? '已设置' : '未设置',
            customModelEnabled: Boolean(config.customModel.enabled)
          }));
          
          resolve(config);
        });
      } catch (error) {
        console.error('加载配置时发生错误:', error);
        reject(error);
      }
    });
  }

  /**
   * 保存配置
   * @param {object} config - 要保存的配置对象
   * @returns {Promise<void>}
   */
  static async save(config) {
    return new Promise((resolve, reject) => {
      try {
        // 创建安全的配置对象
        const safeConfig = this._createSafeConfig(config);
        
        // 记录日志
        console.log('正在保存配置...');
        
        chrome.storage.sync.set(safeConfig, () => {
          if (chrome.runtime.lastError) {
            console.error('Chrome存储错误:', chrome.runtime.lastError);
            reject(new Error(`保存设置失败: ${chrome.runtime.lastError.message}`));
          } else {
            console.log('配置保存成功');
            resolve();
          }
        });
      } catch (error) {
        console.error('保存配置时发生错误:', error);
        reject(error);
      }
    });
  }

  /**
   * 获取当前选择的模型信息
   * @param {object} config - 配置对象
   * @returns {object} 当前选择的模型信息
   */
  static getCurrentModelInfo(config) {
    if (config.currentModel === 'custom') {
      return config.customModel;
    }
    
    return config.modelDefinitions[config.currentModel];
  }

  /**
   * 获取模型对应的API密钥
   * @param {object} config - 配置对象
   * @param {string} modelType - 模型类型
   * @returns {string} API密钥
   */
  static getApiKeyForModel(config, modelType) {
    return config.apiKeys[modelType] || '';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // 获取元素
  const convertBtn = document.getElementById('convertBtn');
  const markdownContent = document.getElementById('markdown-content');
  const summaryContent = document.getElementById('summary-content');
  const loading = document.getElementById('loading');
  const settingsToggle = document.getElementById('settingsToggle');
  
  // 标记是否正在处理中
  let isProcessing = false;
  
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
  
  // 截流函数 - 防止频繁点击
  function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
      const now = new Date().getTime();
      if (now - lastCall < delay) {
        return;
      }
      lastCall = now;
      return func(...args);
    };
  }
  
  // 提取获取摘要的核心逻辑为独立函数
  async function generateSummary() {
    // 如果正在处理中，则直接返回
    if (isProcessing) {
      showToast('请等待当前操作完成');
      return;
    }
    
    // 设置处理中状态
    isProcessing = true;
    
    // 修改按钮状态
    convertBtn.disabled = true;
    convertBtn.style.opacity = '0.6';
    convertBtn.style.cursor = 'not-allowed';
    
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
      
<<<<<<< HEAD
      // 获取Markdown内容
      let markdown = results[0].result;
=======
      // 显示Markdown内容
      const markdown = results[0].result;
      console.log(markdown);
      
      // 移除Markdown中的链接和图片语法
      const cleanedMarkdown = removeMarkdownLinksAndImages(markdown);
      console.log("清理后的Markdown:", cleanedMarkdown);
      
      // 加载配置
      const config = await ConfigService.load();
      
      // 获取当前模型信息
      const modelInfo = ConfigService.getCurrentModelInfo(config);
      
      if (!modelInfo) {
        showToast('无效的模型配置');
        summaryContent.innerHTML = '<p>请在设置中选择有效的模型</p>';
        return;
      }
      
      // 获取模型类型
      const modelType = config.currentModel === 'custom' ? 'custom' : modelInfo.type;
      
      // 检查API密钥
      const apiKey = config.apiKeys[modelType];
      if (!apiKey) {
        const modelTypeName = modelType === 'silicon-flow' ? '智谱AI' : 
                           (modelType === 'zhipu' ? '中科院' : '自定义模型');
        showToast(`请先设置${modelTypeName}的API Key`);
        // 重定向到设置页面
        setTimeout(() => {
          window.location.href = 'settings.html';
        }, 1000);
        summaryContent.innerHTML = '<p>请设置API Key后再试</p>';
        return;
      }
      
      const maxLength = parseInt(config.summary.maxLength) || 8000;
      const promptTemplate = config.summary.promptTemplate;
      
      // 获取摘要
      summaryContent.innerHTML = '<p>正在生成摘要...</p>';
      const summary = await getSummary(cleanedMarkdown, apiKey, modelInfo, maxLength, promptTemplate);
      
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
      if (loading) {
        loading.style.display = 'none';
      }
      
      // 恢复按钮状态
      convertBtn.disabled = false;
      convertBtn.style.opacity = '1';
      convertBtn.style.cursor = 'pointer';
      
      // 重置处理中状态
      isProcessing = false;
    }
  }
  
  // 获取并转换网页内容 - 添加截流的按钮点击事件
  const throttledGenerate = throttle(generateSummary, 3000);
  convertBtn.addEventListener('click', throttledGenerate);
  
  // 页面加载完成后自动触发摘要生成
  generateSummary();
  
  // 移除Markdown中的链接和图片语法的函数
  function removeMarkdownLinksAndImages(markdown) {
    // 移除图片语法: ![alt text](image-url)
    let cleaned = markdown.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
    
    // 移除链接语法: [link text](url)
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    return cleaned;
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
  async function getSummary(markdown, apiKey, modelInfo, maxLength, promptTemplate) {
    try {
      // 替换模板中的变量
      const prompt = promptTemplate
        .replace(/{{maxLength}}/g, maxLength);
      
      // 构建请求参数
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      };
      
      // 根据不同的模型类型构建不同的请求体
      if (modelInfo.type === 'silicon-flow') {
        // 智谱AI模型
        requestOptions.body = JSON.stringify({
          model: modelInfo.name,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\n${markdown.substring(0, maxLength)}`
            }
          ]
        });
      } else if (modelInfo.type === 'zhipu') {
        // 中科院模型（不同的API格式）
        requestOptions.body = JSON.stringify({
          model: modelInfo.name,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\n${markdown.substring(0, maxLength)}`
            }
          ]
        });
      } else {
        // 自定义模型
        requestOptions.body = JSON.stringify({
          model: modelInfo.name,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\n${markdown.substring(0, maxLength)}`
            }
          ]
        });
      }
      
      const response = await fetch(modelInfo.apiEndpoint, requestOptions);
      
      const data = await response.json();
      
      // 检查是否有错误
      if (data.error) {
        throw new Error(data.error.message || '请求失败');
      }
      
      // 根据不同的模型类型，提取响应中的内容
      let content = '';
      if (modelInfo.type === 'silicon-flow' || modelInfo.type === 'zhipu') {
        content = data.choices[0].message.content;
      } else {
        // 自定义模型，尝试通用格式提取
        if (data.choices && data.choices[0] && data.choices[0].message) {
          content = data.choices[0].message.content;
        } else if (data.response) {
          content = data.response;
        } else {
          content = JSON.stringify(data);
        }
      }
      
      return content;
    } catch (error) {
      console.error('获取摘要失败:', error);
      showToast('获取摘要失败: ' + error.message);
      return '# 获取摘要失败\n\n' + error.message;
    }
  }
}); 