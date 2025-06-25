#!/usr/bin/env node

/**
 * Test Base64 Image Upload Functionality
 * Simulates how AI agents will upload images pasted in UI
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { AuthManager } = require('./src/auth');
const { StockSparkClient } = require('./src/api/client');
const { ImageAPI } = require('./src/api/images');

// Simple test image as base64 (1x1 red pixel PNG)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9h2/M8AAAAABJRU5ErkJggg==';

async function testBase64Upload() {
  console.log('🧪 Testing Base64 Image Upload Functionality...\n');
  
  try {
    // Initialize services
    const authManager = new AuthManager();
    const apiClient = new StockSparkClient(authManager);
    const imageAPI = new ImageAPI(apiClient);
    
    // Test authentication
    console.log('1. Testing authentication...');
    await authManager.getToken();
    console.log('✅ Authentication successful\n');
    
    // Test 1: Upload single base64 image
    console.log('2. Testing single base64 image upload...');
    
    const testImageData = [
      {
        data: TEST_IMAGE_BASE64,
        mimeType: 'image/png',
        filename: 'test_image.png'
      }
    ];
    
    // Use a test vehicle ID (you might need to change this)
    const testVehicleId = process.env.TEST_VEHICLE_ID || 1749481980272;
    
    console.log(`Uploading to vehicle ID: ${testVehicleId}`);
    
    const result = await imageAPI.uploadImagesFromData(testVehicleId, testImageData, 0);
    
    if (result.success) {
      console.log('✅ Base64 upload successful!');
      console.log(`📸 Uploaded ${result.uploadedCount} image(s)`);
      result.uploadedImages.forEach(img => {
        console.log(`   - ${img.filename} (ID: ${img.imageId})${img.main ? ' [MAIN]' : ''}`);
      });
    } else {
      console.log('❌ Base64 upload failed');
      result.errors.forEach(err => {
        console.log(`   Error: ${err.error}`);
      });
    }
    
    // Test 2: Test error handling with invalid data
    console.log('\n3. Testing error handling...');
    try {
      const invalidImageData = [
        {
          data: 'invalid-base64-data',
          mimeType: 'image/png',
          filename: 'invalid.png'
        }
      ];
      
      const errorResult = await imageAPI.uploadImagesFromData(testVehicleId, invalidImageData, 0);
      
      if (errorResult.success) {
        console.log('⚠️ Expected error but upload succeeded');
      } else {
        console.log('✅ Error handling working correctly');
        errorResult.errors.forEach(err => {
          console.log(`   Expected error: ${err.error}`);
        });
      }
    } catch (error) {
      console.log('✅ Error handling working correctly');
      console.log(`   Expected error: ${error.message}`);
    }
    
    console.log('\n🎉 Base64 upload functionality test completed!');
    console.log('\nUsage for AI agents:');
    console.log('When users paste images in Claude UI, extract the base64 data and call:');
    console.log('upload_vehicle_images_from_data({ vehicleId, imageData: [{ data, mimeType, filename }] })');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Make sure you have valid credentials and a test vehicle ID');
    
    if (error.message.includes('401') || error.message.includes('authentication')) {
      console.error('\n💡 Check your environment variables:');
      console.error('- STOCKSPARK_USERNAME');
      console.error('- STOCKSPARK_PASSWORD');
      console.error('- STOCKSPARK_CLIENT_ID');
      console.error('- STOCKSPARK_AUTH_URL');
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testBase64Upload();
}

module.exports = { testBase64Upload };