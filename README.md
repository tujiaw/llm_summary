# 网页Markdown摘要

这是一个Chrome扩展，可以将网页内容转换为Markdown格式，并使用GLM-4-9B模型生成摘要。

## 功能

1. 获取当前网页内容，使用turndown将其转换为Markdown
2. 使用GLM-4-9B模型实现对Markdown内容的总结，帮助用户快速了解网页内容

## 使用方法

1. 安装扩展
2. 在需要摘要的网页上点击扩展图标
3. 输入SiliconFlow API Key
4. 点击"获取并转换网页内容"按钮
5. 等待处理完成后，查看Markdown内容和摘要

## 技术栈

- HTML/CSS/JavaScript
- Turndown.js - 用于HTML到Markdown的转换
- GLM-4-9B - 用于生成摘要

## 注意事项

- 需要拥有SiliconFlow API Key才能使用摘要功能
- 长文本会被截断处理，以适应API的限制