# Image Upload Guide

This guide covers all methods for uploading vehicle images using the StockSpark MCP tools.

## 📸 Available Upload Methods

### Method 1: Direct File Path Upload (Recommended)
The simplest and most efficient method when you have local image files.

```javascript
// Using upload_vehicle_images tool
{
  "vehicle_id": "abc123",
  "images": [
    {
      "path": "/path/to/exterior1.jpg",
      "category": "exterior",
      "position": 1
    },
    {
      "path": "/path/to/interior1.jpg",
      "category": "interior", 
      "position": 2
    }
  ]
}
```

### Method 2: URL-Based Upload
For images already hosted online.

```javascript
{
  "vehicle_id": "abc123",
  "images": [
    {
      "path": "https://example.com/car-image.jpg",
      "category": "exterior",
      "position": 1
    }
  ]
}
```

### Method 3: Base64 Upload
For programmatically generated images or when working with image data directly.

```javascript
{
  "vehicle_id": "abc123",
  "images": [
    {
      "path": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
      "category": "exterior",
      "position": 1
    }
  ]
}
```

## 🚀 Performance Optimization

### Real Performance Solutions

1. **Image Compression Before Upload**
   - Reduce file size without losing quality
   - Target 1-2MB per image for optimal performance
   - JPEG quality 85-90% is usually sufficient

2. **Optimal Image Dimensions**
   - Maximum dimensions: 4096x4096 pixels
   - Recommended: 1920x1080 for web display
   - Images are automatically resized server-side

3. **Batch Upload Strategy**
   - Upload multiple images in a single request
   - Maximum 20 images per batch
   - Reduces API calls and improves overall speed

### Performance Benchmarks

Based on real-world testing:
- **Single image (2MB)**: ~2-3 seconds
- **Batch of 5 images (10MB total)**: ~8-10 seconds
- **Batch of 20 images (40MB total)**: ~30-35 seconds

## 📋 Image Categories

Supported categories for vehicle images:

- `exterior` - External vehicle views
- `interior` - Inside cabin views
- `engine` - Engine compartment
- `trunk` - Cargo area
- `wheel` - Wheels and tires
- `damage` - Any damage documentation
- `document` - Vehicle documents
- `other` - Miscellaneous images

## 🎯 Best Practices

### 1. Use AI Analysis First
Always analyze images before uploading to ensure proper categorization:

```javascript
// First: Analyze images
{
  "tool": "analyze_vehicle_images",
  "images": ["path1.jpg", "path2.jpg"],
  "vehicle_context": {
    "brand": "BMW",
    "model": "Series 3"
  }
}

// Then: Upload with proper categories
{
  "tool": "upload_vehicle_images",
  "vehicle_id": "abc123",
  "images": [/* analyzed images with categories */]
}
```

### 2. Image Ordering
- Position 1 should be the main exterior shot
- Follow a logical flow (exterior → interior → details)
- Use the `update_image_order` tool to reorder after upload

### 3. Error Handling
Common errors and solutions:

- **"File too large"**: Compress images before upload
- **"Invalid format"**: Ensure JPEG, PNG, or WebP format
- **"Upload timeout"**: Reduce batch size or file sizes

## 🔧 Complete Workflow Example

```javascript
// Step 1: Analyze images
const analysis = await analyze_vehicle_images({
  images: [
    "/photos/bmw_front.jpg",
    "/photos/bmw_interior.jpg",
    "/photos/bmw_side.jpg"
  ],
  vehicle_context: {
    brand: "BMW",
    model: "Series 3"
  }
});

// Step 2: Upload analyzed images
const upload = await upload_vehicle_images({
  vehicle_id: "vehicle_123",
  images: [
    {
      path: "/photos/bmw_front.jpg",
      category: "exterior",
      position: 1
    },
    {
      path: "/photos/bmw_side.jpg",
      category: "exterior",
      position: 2
    },
    {
      path: "/photos/bmw_interior.jpg",
      category: "interior",
      position: 3
    }
  ]
});

// Step 3: Verify gallery
const gallery = await get_vehicle_gallery({
  vehicle_id: "vehicle_123"
});
```

## 📌 Important Notes

1. **Automatic Optimization**: All uploaded images are automatically optimized server-side
2. **No Pre-processing Required**: The system handles format conversion and resizing
3. **Concurrent Uploads**: The system supports parallel processing for batch uploads
4. **Progress Tracking**: Large uploads return progress information

## 🆘 Troubleshooting

### Slow Uploads
- Check your internet connection speed
- Reduce image file sizes
- Upload in smaller batches

### Failed Uploads
- Verify the vehicle_id exists
- Check image format compatibility
- Ensure proper authentication

### Missing Images
- Use `get_vehicle_gallery` to verify upload
- Check returned image IDs from upload response
- Verify no errors in upload response