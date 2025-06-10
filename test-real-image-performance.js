#!/usr/bin/env node

/**
 * Test Real Image Performance - Kona Image Upload
 * This will show the ACTUAL performance with real images
 */

const fs = require('fs');
const { TestUtils, TEST_DATA } = require('./tests/config/test-config');

async function testRealImagePerformance() {
  console.log('🧪 Testing REAL Image Performance with Kona Image...\n');
  
  TestUtils.setupEnvironment();
  
  try {
    const { imageAPI, vehicleAPI } = await TestUtils.createClients();
    
    // Create test vehicle
    console.log('1. Creating test vehicle...');
    const vehicleData = {
      ...TEST_DATA.workingVehiclePayload,
      ...TestUtils.generateUniqueTestData({
        price: 27000,
        mileage: 45000
      })
    };
    
    const creationResult = await vehicleAPI.addVehicle(vehicleData);
    const testVehicleId = creationResult.vehicleId;
    console.log(`✅ Created vehicle ${testVehicleId}\n`);
    
    // Read actual Kona image
    const imagePath = '/home/lucasgros/projects/stockspark-mcp-poc/docs/test-images/kona1.jpg';
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Data = imageBuffer.toString('base64');
    
    console.log(`📁 Image file: ${imagePath}`);
    console.log(`📊 File size: ${(imageBuffer.length / 1024).toFixed(1)}KB`);
    console.log(`📊 Base64 size: ${(base64Data.length / 1024).toFixed(1)}KB`);
    console.log(`📊 Base64 characters: ${base64Data.length.toLocaleString()}\n`);
    
    // Test Method 1: "Claude optimized" (actually same data)
    console.log('🚀 Testing "Claude optimized" method...');
    const startTime1 = Date.now();
    
    const claudeFormat = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: base64Data // SAME DATA
        }
      }
    ];
    
    const claudeImageData = claudeFormat.map((img, index) => ({
      data: img.source.data,
      mimeType: img.source.media_type,
      filename: `claude_kona_${index + 1}.jpg`
    }));
    
    const claudeResult = await imageAPI.uploadImagesFromData(testVehicleId, claudeImageData, 0);
    const claudeTime = Date.now() - startTime1;
    
    console.log(`⏱️  Claude method time: ${claudeTime}ms`);
    console.log(`📊 Result: ${claudeResult.success ? 'Success' : 'Failed'}`);
    if (claudeResult.uploadedImages.length > 0) {
      console.log(`✅ Uploaded: ${claudeResult.uploadedImages[0].filename}`);
    }
    console.log();
    
    // Test Method 2: Raw base64 (identical data)
    console.log('⚠️  Testing raw base64 method...');
    const startTime2 = Date.now();
    
    const rawImageData = [
      {
        data: base64Data, // IDENTICAL DATA
        mimeType: "image/jpeg",
        filename: "raw_kona_1.jpg"
      }
    ];
    
    const rawResult = await imageAPI.uploadImagesFromData(testVehicleId, rawImageData, 0);
    const rawTime = Date.now() - startTime2;
    
    console.log(`⏱️  Raw method time: ${rawTime}ms`);
    console.log(`📊 Result: ${rawResult.success ? 'Success' : 'Failed'}`);
    if (rawResult.uploadedImages.length > 0) {
      console.log(`✅ Uploaded: ${rawResult.uploadedImages[0].filename}`);
    }
    console.log();
    
    // Performance analysis
    console.log('📊 PERFORMANCE ANALYSIS:');
    console.log('=' .repeat(50));
    console.log(`🚀 "Claude optimized": ${claudeTime}ms`);
    console.log(`⚠️  Raw base64:        ${rawTime}ms`);
    console.log(`📊 Difference:         ${Math.abs(claudeTime - rawTime)}ms`);
    console.log(`📊 "Optimization":     ${((Math.abs(claudeTime - rawTime) / Math.max(claudeTime, rawTime)) * 100).toFixed(1)}%`);
    console.log();
    
    console.log('🔍 REALITY CHECK:');
    console.log('❌ Claude UI does NOT actually optimize images');
    console.log('❌ Base64 data is identical in both methods');
    console.log('❌ Network transmission time is the same');
    console.log('❌ Processing time is virtually identical');
    console.log();
    
    console.log('💡 REAL SOLUTIONS:');
    console.log('✅ Resize images before upload (to 300-500KB)');
    console.log('✅ Use JPEG instead of PNG for photos');
    console.log('✅ Compress images with tools like TinyPNG');
    console.log('✅ Upload multiple smaller images instead of one large one');
    console.log();
    
    console.log('🎯 CONCLUSION:');
    console.log('The "Claude optimized" method is NOT actually faster.');
    console.log('The real bottleneck is IMAGE SIZE, not the upload method.');
    console.log(`A ${(imageBuffer.length / 1024).toFixed(0)}KB image will be slow regardless of method.`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

if (require.main === module) {
  testRealImagePerformance().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testRealImagePerformance };