const { spawn } = require('child_process');

async function runMCPCommand(requestData) {
    return new Promise((resolve, reject) => {
        const child = spawn('node', ['test-mcp-server.js']);
        let output = '';
        let error = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            error += data.toString();
        });

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Process exited with code ${code}: ${error}`));
            } else {
                try {
                    const response = JSON.parse(output);
                    resolve(response);
                } catch (e) {
                    reject(new Error(`Failed to parse output: ${output}`));
                }
            }
        });

        // Send the request
        child.stdin.write(JSON.stringify(requestData));
        child.stdin.end();
    });
}

async function simulateAIAgent() {
    console.log("=== AI Agent Simulation: Creating Mercedes-Benz S 500 2021 ===\n");

    try {
        // Step 1: Find Mercedes-Benz models
        console.log("Step 1: Starting vehicle creation - Finding Mercedes-Benz models");
        console.log("---------------------------------------------------------------");
        
        const step1Request = {
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "start_vehicle_creation",
                arguments: {
                    brand: "Mercedes-Benz"
                }
            },
            id: 1
        };
        
        console.log("Request:", JSON.stringify(step1Request, null, 2));
        const step1Response = await runMCPCommand(step1Request);
        console.log("\nResponse:", JSON.stringify(step1Response, null, 2));
        
        // Extract S-Class model ID
        let sClassModelId = null;
        if (step1Response.result && step1Response.result[0] && step1Response.result[0].content) {
            const content = JSON.parse(step1Response.result[0].content);
            if (content.models) {
                const sClass = content.models.find(m => m.name.includes('Classe S') || m.name.includes('S-Class'));
                if (sClass) {
                    sClassModelId = sClass.id;
                    console.log(`\n✓ Found S-Class model: ${sClass.name} (ID: ${sClassModelId})`);
                }
            }
        }

        if (!sClassModelId) {
            throw new Error("Could not find S-Class model");
        }

        // Step 2: Find S 500 trim from 2021
        console.log("\n\nStep 2: Finding S 500 trim from 2021");
        console.log("-------------------------------------");
        
        const step2Request = {
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "find_vehicle_trim",
                arguments: {
                    model_id: sClassModelId,
                    manufacture_date: "01-2021"
                }
            },
            id: 2
        };
        
        console.log("Request:", JSON.stringify(step2Request, null, 2));
        const step2Response = await runMCPCommand(step2Request);
        console.log("\nResponse:", JSON.stringify(step2Response, null, 2));
        
        // Extract S 500 trim ID
        let s500TrimId = null;
        if (step2Response.result && step2Response.result[0] && step2Response.result[0].content) {
            const content = JSON.parse(step2Response.result[0].content);
            if (content.trims) {
                const s500 = content.trims.find(t => t.name.includes('S 500'));
                if (s500) {
                    s500TrimId = s500.id;
                    console.log(`\n✓ Found S 500 trim: ${s500.name} (ID: ${s500TrimId})`);
                }
            }
        }

        if (!s500TrimId) {
            throw new Error("Could not find S 500 trim from 2021");
        }

        // Step 3: Create vehicle with specifications
        console.log("\n\nStep 3: Creating vehicle with specifications");
        console.log("-------------------------------------------");
        
        const step3Request = {
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "create_vehicle_from_trim",
                arguments: {
                    trim_id: s500TrimId,
                    price: 34000,
                    mileage: 87000,
                    color: "nero",
                    condition: "USED"
                }
            },
            id: 3
        };
        
        console.log("Request:", JSON.stringify(step3Request, null, 2));
        const step3Response = await runMCPCommand(step3Request);
        console.log("\nResponse:", JSON.stringify(step3Response, null, 2));
        
        // Extract created vehicle info
        if (step3Response.result && step3Response.result[0] && step3Response.result[0].content) {
            const content = JSON.parse(step3Response.result[0].content);
            if (content.vehicle) {
                console.log("\n✓ Vehicle created successfully!");
                console.log("\nCreated Vehicle Summary:");
                console.log("------------------------");
                console.log(`ID: ${content.vehicle.id}`);
                console.log(`Brand: ${content.vehicle.brand}`);
                console.log(`Model: ${content.vehicle.model}`);
                console.log(`Trim: ${content.vehicle.trim}`);
                console.log(`Year: ${content.vehicle.year}`);
                console.log(`Price: €${content.vehicle.price}`);
                console.log(`Mileage: ${content.vehicle.mileage} km`);
                console.log(`Color: ${content.vehicle.color}`);
                console.log(`Condition: ${content.vehicle.condition}`);
                console.log(`Status: ${content.vehicle.status}`);
            }
        }

        console.log("\n=== AI Agent Simulation Complete ===");

    } catch (error) {
        console.error("\n❌ Error:", error.message);
    }
}

// Run the simulation
simulateAIAgent();