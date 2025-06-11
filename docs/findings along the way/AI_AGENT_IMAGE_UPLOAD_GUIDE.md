# AI Agent Image Upload Guide

## Supporting Images Pasted in Claude UI

This MCP server now supports three methods for uploading vehicle images:

### **Method 1: File Paths (Original)**
```javascript
// Use when images are saved locally
upload_vehicle_images({
  vehicleId: 12345,
  images: [
    "/path/to/image1.jpg",
    "/path/to/image2.png"
  ],
  mainImageIndex: 0
})
```

### **Method 2: URLs (Original)**
```javascript
// Use when images are hosted online
upload_vehicle_images({
  vehicleId: 12345,
  images: [
    "https://example.com/car1.jpg",
    "https://example.com/car2.png"
  ],
  mainImageIndex: 0
})
```

### **Method 3: Base64 Data (NEW - for AI Agent UI)**
```javascript
// Use when images are pasted directly in Claude UI
upload_vehicle_images_from_data({
  vehicleId: 12345,
  imageData: [
    {
      data: "iVBORw0KGgoAAAANSUhEUgAA...", // base64 string
      mimeType: "image/png",
      filename: "exterior_front.png"
    },
    {
      data: "/9j/4AAQSkZJRgABAQEAyADI...", // base64 string
      mimeType: "image/jpeg", 
      filename: "interior_dashboard.jpg"
    }
  ],
  mainImageIndex: 0
})
```

## **How It Works**

1. **User pastes images in Claude UI** → Claude receives base64 encoded data
2. **AI extracts image data** → Gets base64 string, MIME type, optional filename
3. **AI calls upload_vehicle_images_from_data** → New MCP tool handles base64 data
4. **Server converts to buffer** → Base64 → Buffer → FormData
5. **Uploads to StockSpark API** → Same API endpoint as file uploads

## **AI Agent Instructions**

When a user pastes images in the conversation:

1. **Extract image data**: Get base64 string and MIME type from the pasted images
2. **Use the new tool**: Call `upload_vehicle_images_from_data` instead of `upload_vehicle_images`
3. **Provide helpful filenames**: Generate descriptive names like "exterior_front.jpg", "interior_dashboard.png"
4. **Handle errors gracefully**: The tool returns detailed success/error information

## **Example AI Response Flow**

```
User: *pastes 3 car images* "Upload these to vehicle 12345"

AI: "I can see you've shared 3 images. Let me upload them to vehicle 12345:
- Image 1: exterior_front.jpg 
- Image 2: interior_dashboard.jpg
- Image 3: exterior_side.jpg

I'll set the first image as the main image."

*calls upload_vehicle_images_from_data with extracted base64 data*

AI: "✅ Successfully uploaded 3/3 images to vehicle 12345:
- exterior_front.jpg (ID: img_123) [MAIN]
- interior_dashboard.jpg (ID: img_124) 
- exterior_side.jpg (ID: img_125)"
```

## **Technical Implementation**

### New ImageAPI Methods:
- `uploadImageFromBase64()`: Handles single base64 image
- `uploadImagesFromData()`: Batch uploads base64 images
- Enhanced `uploadImages()`: Supports file paths, URLs, and MCP resources

### Enhanced Tool Schema:
- `upload_vehicle_images`: Now accepts mixed file paths/URLs/resources
- `upload_vehicle_images_from_data`: Dedicated base64 upload tool

### Error Handling:
- Validates base64 data format
- Handles MIME type detection
- Provides detailed error messages for each image
- Graceful fallback for invalid data

## **Benefits**

1. **Seamless UX**: Users can paste images directly without saving files
2. **Maintains Security**: No temporary files created
3. **Full Feature Support**: Main image setting, batch uploads, error handling
4. **Backward Compatible**: Existing file/URL uploads still work
5. **Enterprise Ready**: Same validation and logging as existing tools