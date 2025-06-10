const publishTools = [
  {
    name: "publish_vehicle",
    description: "Publish vehicle to specified portals (MyPortal and/or automobile.it)",
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { 
          type: "number",
          description: "Vehicle ID to publish"
        },
        portals: { 
          type: "array", 
          items: { 
            type: "string", 
            enum: ["myportal", "automobile.it"] 
          },
          description: "Portals to publish to",
          minItems: 1
        }
      },
      required: ["vehicleId", "portals"]
    }
  },
  
  {
    name: "unpublish_vehicle",
    description: "Remove vehicle from specified portals",
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { 
          type: "number",
          description: "Vehicle ID to unpublish"
        },
        portals: { 
          type: "array", 
          items: { 
            type: "string", 
            enum: ["myportal", "automobile.it", "all"] 
          },
          description: "Portals to unpublish from (use 'all' to remove from all portals)",
          minItems: 1
        }
      },
      required: ["vehicleId", "portals"]
    }
  },
  
  {
    name: "get_publication_status",
    description: "Check where a vehicle is currently published",
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { 
          type: "number",
          description: "Vehicle ID to check publication status"
        }
      },
      required: ["vehicleId"]
    }
  },

  {
    name: "list_available_portals",
    description: "Get list of available portals for publication",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

module.exports = { publishTools };