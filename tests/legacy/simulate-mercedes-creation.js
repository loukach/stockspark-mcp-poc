#!/usr/bin/env node

// Set up environment variables
process.env.STOCKSPARK_USERNAME = 'lucas.gros+demo@motork.io';
process.env.STOCKSPARK_PASSWORD = 'ZDU8qty4fjg-qwx7apv';
process.env.STOCKSPARK_CLIENT_ID = 'carspark-api';
process.env.STOCKSPARK_AUTH_URL = 'https://auth.motork.io/realms/prod/protocol/openid-connect/token';
process.env.STOCKSPARK_API_URL = 'https://carspark-api.dealerk.com';
process.env.STOCKSPARK_COUNTRY = 'it';
process.env.STOCKSPARK_COMPANY_ID = '35430';
process.env.STOCKSPARK_DEALER_ID = '196036';

const { AuthManager } = require('./src/auth');
const { StockSparkClient } = require('./src/api/client');
const { ReferenceAPI } = require('./src/api/reference');
const { VehicleAPI } = require('./src/api/vehicles');

async function simulateAIAgent() {
    console.log("=== AI Agent Simulation: Creating Mercedes-Benz S 500 2021 ===\n");

    try {
        // Initialize services
        const authManager = new AuthManager();
        const apiClient = new StockSparkClient(authManager);
        const referenceAPI = new ReferenceAPI(apiClient);
        const vehicleAPI = new VehicleAPI(apiClient);
        
        // Step 1: Find Mercedes-Benz models
        console.log("Step 1: Starting vehicle creation - Finding Mercedes-Benz models");
        console.log("---------------------------------------------------------------");
        
        console.log("Tool: start_vehicle_creation");
        console.log("Arguments: { make_name: 'Mercedes-Benz' }");
        
        const modelsResult = await referenceAPI.findModelsByMake('it', 'Mercedes-Benz', 'car');
        
        console.log(`\nFound ${modelsResult.count} models for Mercedes-Benz`);
        
        // Find S-Class model
        const sClass = modelsResult.models.find(m => 
            m.name.includes('Classe S') || 
            m.name.includes('S-Class') ||
            m.name.includes('S Klasse')
        );
        
        if (!sClass) {
            throw new Error("Could not find S-Class model");
        }
        
        console.log(`✓ Found S-Class model: ${sClass.name} (ID: ${sClass.id})`);

        // Step 2: Find S 500 trim from 2021
        console.log("\n\nStep 2: Finding S 500 trim from 2021");
        console.log("-------------------------------------");
        
        console.log("Tool: get_vehicle_trims");
        console.log(`Arguments: { model_id: '${sClass.id}', manufacture_date: '01-2021' }`);
        
        const trimsResult = await referenceAPI.getVehicleTrims('it', sClass.id, null, null, '01-2021');
        
        console.log(`\nFound ${trimsResult.count} trims for ${sClass.name} from 01-2021`);
        
        // Find S 500 trim
        const s500Trim = trimsResult.trims.find(t => 
            t.name.includes('S 500') || 
            t.name.includes('S500')
        );
        
        if (!s500Trim) {
            console.log("\nAvailable trims:");
            trimsResult.trims.slice(0, 10).forEach((trim, idx) => {
                console.log(`${idx + 1}. ${trim.name} - ${trim.engineSize}cc, ${trim.powerHp}hp`);
            });
            throw new Error("Could not find S 500 trim from 2021");
        }
        
        console.log(`✓ Found S 500 trim: ${s500Trim.name}`);
        console.log(`  ID: ${s500Trim.id}`);
        console.log(`  Source: ${s500Trim.source}`);
        console.log(`  Engine: ${s500Trim.engineSize}cc`);
        console.log(`  Power: ${s500Trim.powerHp}hp`);
        console.log(`  Fuel: ${s500Trim.fuelType?.name || 'N/A'}`);

        // Step 3: Create vehicle with specifications
        console.log("\n\nStep 3: Creating vehicle with specifications");
        console.log("-------------------------------------------");
        
        console.log("Tool: create_vehicle_from_trim");
        const createArgs = {
            providerCode: s500Trim.id,
            provider: s500Trim.source,
            vehicleClass: 'car',
            price: 34000,
            mileage: 87000,
            color: 'nero',
            condition: 'USED'
        };
        console.log("Arguments:", JSON.stringify(createArgs, null, 2));
        
        // First compile the vehicle template
        const companyId = process.env.STOCKSPARK_COMPANY_ID;
        const compiledVehicle = await referenceAPI.compileVehicleByTrim(
            companyId,
            s500Trim.id,
            'car',
            s500Trim.source
        );
        
        console.log("\n✓ Vehicle template compiled successfully");
        
        // Create the vehicle data
        const dealerId = process.env.STOCKSPARK_DEALER_ID;
        const vehicleData = {
            vehicleId: null,
            companyId: compiledVehicle.companyId,
            companyOwnerId: compiledVehicle.companyOwnerId,
            dealerId: dealerId ? parseInt(dealerId) : null,
            vehicleClass: compiledVehicle.vehicleClass && compiledVehicle.vehicleClass.name 
                ? compiledVehicle.vehicleClass 
                : { name: "car" },
            status: { name: 'FREE' },
            wheelFormula: { name: 'FRONT' },
            vatRate: 0,
            make: compiledVehicle.make,
            model: compiledVehicle.model,
            version: compiledVehicle.version && compiledVehicle.version.name 
                ? compiledVehicle.version 
                : { name: "Standard" },
            constructionYear: compiledVehicle.constructionYear.toString(),
            constructionDate: `${compiledVehicle.constructionYear}-01-01T00:00:00.000+00:00`,
            fuel: compiledVehicle.fuel,
            gearbox: compiledVehicle.gearbox,
            body: compiledVehicle.body,
            doors: compiledVehicle.doors,
            power: compiledVehicle.power,
            powerHp: compiledVehicle.powerHp,
            cubicCapacity: compiledVehicle.cubicCapacity,
            cylinders: compiledVehicle.cylinders,
            seat: compiledVehicle.seat,
            priceGross: {
                ...compiledVehicle.priceGross,
                consumerPrice: createArgs.price
            },
            priceNet: {
                ...compiledVehicle.priceNet,
                consumerPrice: createArgs.price
            },
            condition: { name: createArgs.condition },
            mileage: createArgs.mileage,
            color: { name: createArgs.color }
        };
        
        // Create the vehicle
        const result = await vehicleAPI.addVehicle(vehicleData);
        
        console.log("\n✓ Vehicle created successfully!");
        console.log("\nCreated Vehicle Summary:");
        console.log("------------------------");
        console.log(`ID: ${result.vehicleId}`);
        console.log(`Brand: Mercedes-Benz`);
        console.log(`Model: ${sClass.name}`);
        console.log(`Trim: ${s500Trim.name}`);
        console.log(`Year: 2021`);
        console.log(`Price: €34,000`);
        console.log(`Mileage: 87,000 km`);
        console.log(`Color: nero (black)`);
        console.log(`Condition: USED`);
        
        console.log("\n📋 Complete AI Agent Workflow Summary:");
        console.log("=====================================");
        console.log("1. Used start_vehicle_creation with brand 'Mercedes-Benz' to find models");
        console.log(`   - Found ${modelsResult.count} models`);
        console.log(`   - Selected: ${sClass.name} (ID: ${sClass.id})`);
        console.log("\n2. Used get_vehicle_trims with model_id and manufacture_date '01-2021'");
        console.log(`   - Found ${trimsResult.count} trims`);
        console.log(`   - Selected: ${s500Trim.name} (ID: ${s500Trim.id})`);
        console.log("\n3. Used create_vehicle_from_trim with trim data and specifications:");
        console.log("   - Price: €34,000");
        console.log("   - Mileage: 87,000 km");
        console.log("   - Color: nero (black)");
        console.log("   - Condition: USED");
        console.log(`   - Created vehicle ID: ${result.vehicleId}`);

        console.log("\n=== AI Agent Simulation Complete ===");

    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.response) {
            console.error("API Response:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the simulation
simulateAIAgent().catch(console.error);