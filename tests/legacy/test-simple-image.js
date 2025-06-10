const { AuthManager } = require('./src/auth');
const { StockSparkClient } = require('./src/api/client');

// Set up test environment variables
process.env.STOCKSPARK_USERNAME = 'lucas.gros+demo@motork.io';
process.env.STOCKSPARK_PASSWORD = 'ZDU8qty4fjg-qwx7apv';
process.env.STOCKSPARK_CLIENT_ID = 'carspark-api';
process.env.STOCKSPARK_AUTH_URL = 'https://auth.motork.io/realms/prod/protocol/openid-connect/token';
process.env.STOCKSPARK_API_URL = 'https://carspark-api.dealerk.com';
process.env.STOCKSPARK_COUNTRY = 'it';
process.env.STOCKSPARK_COMPANY_ID = '35430';
process.env.STOCKSPARK_DEALER_ID = '196036';

async function testImageStructure() {
  console.log('=== Testing Image Structure ===\n');
  
  const authManager = new AuthManager();
  const apiClient = new StockSparkClient(authManager);
  
  try {
    // Get vehicle with images (9476301 has 17 images)
    console.log('Getting vehicle 9476301 (has images)...');
    const vehicleWithImages = await apiClient.get('/vehicle/9476301');
    
    console.log('\nImage structure:');
    if (vehicleWithImages.images) {
      console.log('- Has images object:', !!vehicleWithImages.images);
      console.log('- Has GALLERY_ITEM:', !!vehicleWithImages.images.GALLERY_ITEM);
      console.log('- Image count:', vehicleWithImages.images.GALLERY_ITEM?.length || 0);
      
      if (vehicleWithImages.images.GALLERY_ITEM?.length > 0) {
        const firstImage = vehicleWithImages.images.GALLERY_ITEM[0];
        console.log('\nFirst image structure:');
        Object.keys(firstImage).forEach(key => {
          console.log(`  - ${key}:`, firstImage[key]);
        });
      }
    }
    
    // Test updating vehicle with simple image structure
    console.log('\n\nTesting simplified image upload for vehicle 9476352...');
    const testVehicle = await apiClient.get('/vehicle/9476352');
    
    // Add a simple image URL
    if (!testVehicle.images) {
      testVehicle.images = { GALLERY_ITEM: [] };
    }
    if (!testVehicle.images.GALLERY_ITEM) {
      testVehicle.images.GALLERY_ITEM = [];
    }
    
    // Add a test image with minimal structure
    testVehicle.images.GALLERY_ITEM = [
      {
        index: 1,
        main: true,
        url: "https://www.fiat.com/content/dam/fiat/products/500/bev/trims/hero/500e-trim-hero-red-desktop.jpg"
      }
    ];
    
    console.log('Updating vehicle with test image...');
    const updateResult = await apiClient.put('/vehicle/9476352', testVehicle);
    console.log('Update successful:', !!updateResult);
    
    // Verify the image was saved
    const updatedVehicle = await apiClient.get('/vehicle/9476352');
    console.log('\nVerification:');
    console.log('- Has images:', !!updatedVehicle.images?.GALLERY_ITEM);
    console.log('- Image count:', updatedVehicle.images?.GALLERY_ITEM?.length || 0);
    
    if (updatedVehicle.images?.GALLERY_ITEM?.length > 0) {
      console.log('- First image URL:', updatedVehicle.images.GALLERY_ITEM[0].url);
    }
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    if (error.body) {
      console.error('Error body:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

testImageStructure();