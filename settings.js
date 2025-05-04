// 配置管理模块与设置页面整合

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
    promptTemplate: `请为以下网页内容提供一个结构清晰、易于阅读的中文 Markdown格式摘要，帮助我快速理解网页的核心内容。请突出重点信息，使用Markdown格式输出，包括标题、段落、列表，以及使用**粗体**或*斜体*标记关键词和重要概念。可以使用引用块>来突出重要段落。`
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
   * 获取默认配置
   * @returns {object} 默认配置对象的副本
   */
  static getDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  /**
   * 重置配置为默认值
   * @returns {Promise<object>} 重置后的配置对象
   */
  static async reset() {
    await this.save(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  /**
   * 获取当前选择的模型信息
   * @param {object} config - 配置对象
   * @returns {object} 当前选择的模型信息
   */
  static getCurrentModelInfo(config) {
    if (config.customModel && config.customModel.enabled && config.currentModel === 'custom') {
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

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', async function() {
  // 获取元素
  const modelSelect = document.getElementById('modelSelect');
  const maxLengthInput = document.getElementById('maxLength');
  const promptTemplateInput = document.getElementById('promptTemplate');
  const apiKeyInput = document.getElementById('apiKey');
  const apiKeyLabel = document.getElementById('apiKeyLabel');
  const customModelNameInput = document.getElementById('customModelName');
  const customApiEndpointInput = document.getElementById('customApiEndpoint');
  const customModelContainer = document.getElementById('customModelContainer');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const backButton = document.getElementById('backButton');
  
  // 当前选中的模型类型
  let currentModelType = 'silicon-flow';
  
  // 根据模型类型更新API密钥标签和输入框
  function updateApiKeyUI(modelType) {
    currentModelType = modelType;
    
    // 更新标签
    switch(modelType) {
      case 'silicon-flow':
        apiKeyLabel.textContent = '智谱AI密钥:';
        apiKeyInput.placeholder = '输入智谱AI API Key';
        break;
      case 'zhipu':
        apiKeyLabel.textContent = '中科院密钥:';
        apiKeyInput.placeholder = '输入中科院 API Key';
        break;
      case 'custom':
        apiKeyLabel.textContent = '自定义模型密钥:';
        apiKeyInput.placeholder = '输入自定义模型 API Key';
        break;
      default:
        apiKeyLabel.textContent = 'API密钥:';
        apiKeyInput.placeholder = '输入API Key';
    }
  }
  
  // 加载配置
  try {
    const config = await ConfigService.load();
    
    // 填充表单
    modelSelect.value = config.currentModel;
    maxLengthInput.value = config.summary.maxLength;
    promptTemplateInput.value = config.summary.promptTemplate;
    
    // 确定当前模型类型并设置对应的API Key
    const modelInfo = config.modelDefinitions[config.currentModel] || {type: 'custom'};
    const modelType = config.currentModel === 'custom' ? 'custom' : modelInfo.type;
    updateApiKeyUI(modelType);
    
    // 设置对应的API密钥
    apiKeyInput.value = config.apiKeys[modelType] || '';
    
    // 自定义模型设置
    customModelNameInput.value = config.customModel.name || '';
    customApiEndpointInput.value = config.customModel.apiEndpoint || '';
    
    // 控制自定义模型界面
    toggleCustomModelUI();
  } catch (error) {
    console.error('加载配置失败:', error);
    showToast('加载配置失败: ' + error.message);
  }
  
  // 监听模型选择变化
  modelSelect.addEventListener('change', async function() {
    // 获取当前配置
    const config = await ConfigService.load();
    
    // 确定新选择的模型类型
    let modelType = 'silicon-flow';
    if (this.value === 'custom') {
      modelType = 'custom';
    } else {
      const modelInfo = config.modelDefinitions[this.value];
      if (modelInfo) {
        modelType = modelInfo.type;
      }
    }
    
    // 更新API密钥UI
    updateApiKeyUI(modelType);
    
    // 设置对应的API密钥
    apiKeyInput.value = config.apiKeys[modelType] || '';
    
    // 控制自定义模型界面
    toggleCustomModelUI();
  });
  
  // 控制自定义模型部分的显示/隐藏
  function toggleCustomModelUI() {
    const isCustomSelected = modelSelect.value === 'custom';
    
    // 显示或隐藏自定义模型设置
    if (isCustomSelected) {
      customModelContainer.style.display = 'block';
    } else {
      customModelContainer.style.display = 'none';
    }
  }
  
  // 保存设置
  saveSettingsBtn.addEventListener('click', async function() {
    try {
      // 获取当前配置
      const config = await ConfigService.load();
      
      // 更新配置
      config.currentModel = modelSelect.value;
      config.summary.maxLength = parseInt(maxLengthInput.value) || 8000;
      config.summary.promptTemplate = promptTemplateInput.value;
      
      // 保存当前类型的API密钥
      config.apiKeys[currentModelType] = apiKeyInput.value;
      
      // 自定义模型设置
      if (modelSelect.value === 'custom') {
        config.customModel.enabled = true;
        config.customModel.name = customModelNameInput.value;
        config.customModel.apiEndpoint = customApiEndpointInput.value;
        
        // 验证自定义模型设置
        if (!customModelNameInput.value) {
          showToast('请输入自定义模型名称');
          return;
        }
        if (!customApiEndpointInput.value) {
          showToast('请输入自定义API端点');
          return;
        }
      } else {
        // 非自定义模型时，禁用自定义模型设置
        config.customModel.enabled = false;
      }
      
      // 验证API密钥
      if (!apiKeyInput.value) {
        const modelType = currentModelType === 'silicon-flow' ? '智谱AI' : 
                         (currentModelType === 'zhipu' ? '中科院' : '自定义模型');
        showToast(`请输入${modelType} API Key`);
        return;
      }
      
      // 保存配置
      await ConfigService.save(config);
      showToast('设置已保存');
      
      // 延迟返回主页面
      setTimeout(() => {
        window.location.href = 'popup.html';
      }, 1000);
    } catch (error) {
      console.error('保存配置失败:', error);
      showToast('保存失败: ' + error.message);
    }
  });
  
  // 返回按钮
  backButton.addEventListener('click', function() {
    window.location.href = 'popup.html';
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
}); 