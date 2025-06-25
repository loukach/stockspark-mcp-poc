# Image Upload Guide for AI Agents

## 🎯 **High-Performance Image Upload Process**

The StockSpark MCP server accepts **ONLY file paths and URLs** for maximum speed. 

**CRITICAL:** Never pass base64 data in tool arguments - it causes massive slowdowns.

## 📸 **Handling Different Image Types**

### **1. File Paths (Fastest)**
```javascript
upload_vehicle_images({
  vehicleId: 123,
  images: [
    "/path/to/image1.jpg",
    "/path/to/image2.png"
  ]
});
```

### **2. URLs (Fast)**
```javascript
upload_vehicle_images({
  vehicleId: 123,
  images: [
    "https://example.com/car1.jpg",
    "https://example.com/car2.png"
  ]
});
```

### **3. Pasted Images (Filesystem-First Workflow)**

For pasted images, **MANDATORY two-step process**:

**Step 1:** Save pasted images to filesystem using filesystem MCP
```javascript
// Use filesystem MCP to save the image
write_file({
  path: "/tmp/pasted_image_1.jpg", 
  content: pastedImageData  // Filesystem MCP handles base64
})
```

**Step 2:** Upload using ONLY the file path
```javascript
// Our tool only accepts the file path (no base64!)
upload_vehicle_images({
  vehicleId: 123,
  images: ["/tmp/pasted_image_1.jpg"]  // Fast - just a string!
})
```

**Why this works:** Base64 processing happens in filesystem MCP, not our tool arguments.

## 🔄 **Complete Workflow Example**

```javascript
// For maximum performance - only file paths and URLs
await upload_vehicle_images({
  vehicleId: 123,
  images: [
    "/tmp/saved_pasted_image.jpg",   // Saved via filesystem MCP
    "/path/to/local/car.jpg",        // Local file path
    "https://example.com/car.jpg"    // Online URL
  ],
  mainImageIndex: 0
});
```

## ⚡ **Performance Benefits**

### **Why This Approach is Better**
- **One tool for everything** - no complex agent logic needed
- **Automatic temp file handling** - pasted images just work
- **Self-contained** - no external MCP dependencies
- **POC-friendly** - simple and reliable

### **Upload Speed**
- **File paths**: 1-3 seconds (streaming upload)
- **URLs**: 2-5 seconds (download + upload)
- **Saved pasted images**: 1-3 seconds (same as file paths)

## 🚨 **Error Handling**

### **Invalid Input Error**
```
❌ Image 2: Must be a file path or URL string. For pasted images, save to filesystem first using filesystem MCP.
```

**Solution**: Save pasted images to filesystem before calling upload_vehicle_images.

### **Troubleshooting: Pasted Images Not Working**
If pasted images aren't uploading:

**Problem**: Agent isn't passing the image objects correctly
**Solution**: Make sure to pass the full image object from Claude UI:

```javascript
// ✅ Correct - pass the full image object
upload_vehicle_images({
  vehicleId: 123,
  images: [imageFromUser] // Full { type: "image", source: {...} } object
});

// ❌ Wrong - trying to extract data manually
upload_vehicle_images({
  vehicleId: 123, 
  images: [imageFromUser.source.data] // Just the base64 string
});
```

### **File Not Found Error**
```
❌ File not found: /invalid/path/image.jpg
```

**Solution**: Verify the file path exists after saving with filesystem MCP.

### **URL Download Error**
```
❌ Failed to download image: 404 Not Found
```

**Solution**: Verify the URL is accessible and returns an image.

## 📋 **Best Practices**

### **1. File Naming**
- Use descriptive names: `vehicle_123_exterior_front.jpg`
- Include timestamps to avoid conflicts: `car_${Date.now()}.jpg`
- Use proper extensions: `.jpg`, `.png`, `.webp`

### **2. File Paths**
- Always use **absolute paths**: `/tmp/car_image.jpg`
- Avoid relative paths: `./image.jpg` ❌

### **3. Cleanup**
- Temporary files are automatically cleaned by filesystem MCP
- No manual cleanup needed in our MCP server

### **4. Batch Operations**
- Upload multiple images in one call for efficiency
- Maximum 50 images per batch
- Set `mainImageIndex` for the primary image

## 🛠️ **Required MCP Servers**

Only one MCP server needed:

1. **StockSpark MCP** (this server) - handles everything automatically

## 📖 **Related Documentation**

- [Vehicle Creation Guide](VEHICLE_CREATION_FLOW_PRESENTATION.md)
- [API Reference](API_REFERENCE.md)
- [MCP Tool Simplification](MCP_TOOL_SIMPLIFICATION.md)

This approach provides the cleanest, most performant image upload experience while maintaining clear separation between filesystem operations and vehicle management!