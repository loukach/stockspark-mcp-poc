# MCP Tool Prioritization Guide

## 🎯 **How to Control AI Tool Selection Priority**

In MCP, there's no direct "priority" config, but we control prioritization through several strategies:

## 🛠️ **Strategy 1: Tool Description Hierarchy**

### **Priority Indicators in Tool Names**
```javascript
// ✅ AI will prefer these based on clear priority signals
"🚀 PRIORITY METHOD: Upload images from Claude UI (FASTEST)"
"⚡ RECOMMENDED: Upload images from file paths or URLs"  
"⚠️ FALLBACK ONLY: Upload from raw base64 data (SLOW)"
```

### **Performance Indicators**
```javascript
// ✅ AI understands speed implications
"70-90% faster than other methods"
"use this first when users paste images"
"only use if upload_vehicle_images_claude fails"
```

## 📋 **Strategy 2: Tool Registration Order**

### **In `imageTools` Array (Priority Order):**
```javascript
const imageTools = [
  // 1st: Highest priority - Claude optimized
  {
    name: "upload_vehicle_images_claude",
    description: "🚀 PRIORITY METHOD: ...",
  },
  
  // 2nd: Standard method  
  {
    name: "upload_vehicle_images",
    description: "⚡ RECOMMENDED: ...",
  },
  
  // 3rd: Fallback only
  {
    name: "upload_vehicle_images_from_data", 
    description: "⚠️ FALLBACK ONLY: ...",
  }
];
```

### **Server Registration Order:**
```javascript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Tools appear in order of preference
      ...imageTools, // Claude method appears first
      ...vehicleTools,
      ...publishTools,
      ...analyticsTools,
      ...referenceTools,
    ],
  };
});
```

## 🔧 **Strategy 3: Clear Usage Conditions**

### **When-to-Use Guidance:**
```javascript
// ✅ Clear conditions help AI choose correctly

// Priority 1: Claude UI images
"use this first when users paste images"
"Pre-optimized by Claude for faster uploads"

// Priority 2: File paths/URLs  
"use when you have file paths/URLs, not pasted images"
"for pre-existing files or URLs"

// Priority 3: Raw base64
"SLOW - only use if upload_vehicle_images_claude fails"
"This method is 70-90% slower"
```

## 🚨 **Strategy 4: Warning Indicators**

### **Deterrent Language:**
```javascript
// ✅ Discourages use of slow methods
"⚠️ FALLBACK ONLY"
"SLOW - only use if ... fails"  
"70-90% slower than the Claude optimized method"
"This will take 15+ seconds vs 1-2 seconds"
```

## 📊 **Strategy 5: Performance Metrics**

### **Speed Comparisons:**
```javascript
// ✅ AI can reason about performance trade-offs
upload_vehicle_images_claude:     "1-2 seconds"
upload_vehicle_images:           "2-5 seconds"  
upload_vehicle_images_from_data: "5-15+ seconds"
```

## 🎯 **Strategy 6: AI Reasoning Guidance**

### **Decision Tree in Tool Description:**
```javascript
description: `
🚀 PRIORITY METHOD: Use this FIRST for Claude UI images
✅ When: User pastes images in conversation
⚡ Speed: 70-90% faster than other methods
🔄 Fallback: If this fails, try upload_vehicle_images_from_data
`
```

## 📋 **Strategy 7: MCP Server Behavior**

### **Smart Error Messages:**
```javascript
// ✅ Guide AI to better methods
if (methodUsed === 'upload_vehicle_images_from_data') {
  message += `\n💡 TIP: Next time, try upload_vehicle_images_claude for 70% faster uploads!`;
}
```

### **Performance Logging:**
```javascript
// ✅ Help AI learn from performance data
console.log(`📸 Processing image: ${sizeMB}MB (${filename}) - Method: ${methodUsed}`);
```

## 🎯 **Complete Prioritization Example**

### **How AI Should Reason:**
```
1. User pastes images in Claude UI
2. AI sees "🚀 PRIORITY METHOD" in upload_vehicle_images_claude
3. AI reads "use this first when users paste images"
4. AI chooses upload_vehicle_images_claude
5. Upload completes in 1-2 seconds ✅
```

### **Fallback Logic:**
```
1. upload_vehicle_images_claude fails
2. AI sees "🔄 Fallback: try upload_vehicle_images_from_data"
3. AI warns user: "Using slower method..."
4. AI uses fallback method
5. Still works, just slower ⚠️
```

## 🔧 **Configuration Best Practices**

### **1. Clear Hierarchy**
- Use emojis and caps for priority (🚀, ⚡, ⚠️)
- Include performance metrics
- State conditions clearly

### **2. Descriptive Names**
- `_claude` suffix indicates optimized method
- `_from_data` suffix indicates manual/slow method
- Clear semantic meaning

### **3. Order Matters**
- Most preferred tools first in arrays
- Registration order affects AI preference
- Consistent ordering across files

### **4. Performance Context**
- Always include speed comparisons
- Mention file size impacts
- Explain when methods work best

## 📈 **Measuring Success**

### **Metrics to Track:**
```javascript
// Tool usage frequency (want high Claude usage)
upload_vehicle_images_claude:     80% usage ✅
upload_vehicle_images:           15% usage ⚡
upload_vehicle_images_from_data:  5% usage ⚠️

// Performance metrics
Average upload time: 1.5 seconds ✅ (vs 12 seconds before)
Success rate: 98% ✅
User satisfaction: High ✅
```

This prioritization system ensures AI **always chooses the fastest method first** and only falls back to slower methods when necessary!