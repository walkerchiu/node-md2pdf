# 測試文件標題

這是一個測試 Markdown 文件，用來驗證解析功能。

## 基本格式測試

### 段落和文字格式

這是一個普通段落。支援**粗體**、_斜體_、~~刪除線~~和`行內程式碼`。

這是另一個段落，包含[連結](https://example.com)和自動連結 https://github.com。

### 列表測試

#### 無序列表

- 第一項
- 第二項
  - 子項目 1
  - 子項目 2
    - 更深層的項目
- 第三項

#### 有序列表

1. 第一步
2. 第二步
   1. 子步驟 A
   2. 子步驟 B
3. 第三步

### 程式碼區塊

```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet('World'));
```

```javascript
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map((n) => n * 2);
console.log(doubled);
```

### 表格

| 欄位 1 | 欄位 2 | 欄位 3 |
| ------ | ------ | ------ |
| 資料 A | 資料 B | 資料 C |
| 數值 1 | 數值 2 | 數值 3 |
| 測試   | 內容   | 示例   |

### 引用

> 這是一個引用段落。
>
> 可以包含多行內容。
>
> > 這是巢狀引用。

## 中文測試

### 中文標題測試

這一段落測試中文內容的解析是否正確。包含中文標點符號：「」、，。！？

#### 混合語言

This paragraph mixes English and 中文內容 to test the parsing capability.

## 特殊元素

### 水平分隔線

---

### 圖片

![測試圖片](https://via.placeholder.com/300x200 '這是圖片標題')

### HTML 標籤

<div class="custom-div">
  <p>這是 HTML 內容</p>
</div>

## 結論

這個測試檔案涵蓋了主要的 Markdown 語法元素，用於驗證解析器的功能。
