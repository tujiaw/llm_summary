document.addEventListener('DOMContentLoaded', function() {
  // 获取元素
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('modelSelect');
  const maxLengthInput = document.getElementById('maxLength');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const backButton = document.getElementById('backButton');
  
  // 从存储中获取设置
  chrome.storage.local.get(['apiKey', 'model', 'maxLength'], function(result) {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    if (result.model) {
      modelSelect.value = result.model;
    }
    if (result.maxLength) {
      maxLengthInput.value = result.maxLength;
    }
  });
  
  // 保存设置
  saveSettingsBtn.addEventListener('click', function() {
    const apiKey = apiKeyInput.value;
    const model = modelSelect.value;
    const maxLength = maxLengthInput.value;
    
    if (!apiKey) {
      showToast('请输入API Key');
      return;
    }
    
    chrome.storage.local.set({
      apiKey: apiKey,
      model: model,
      maxLength: maxLength
    }, function() {
      showToast('设置已保存');
      
      // 延迟返回主页面
      setTimeout(() => {
        window.location.href = 'popup.html';
      }, 1000);
    });
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