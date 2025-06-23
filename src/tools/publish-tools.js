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

const publishHandlers = {
  publish_vehicle: async (args, { publicationAPI }) => {
    try {
      if (args.portals.includes('all')) {
        const result = await publicationAPI.publishToAllPortals(args.vehicleId);
        return {
          content: [
            {
              type: 'text',
              text: result.message,
            },
          ],
        };
      } else {
        const result = await publicationAPI.publishToMultiplePortals(args.vehicleId, args.portals);
        let message = `Published vehicle ${args.vehicleId} to ${result.successCount}/${result.totalRequested} portals\n\n`;
        
        result.results.forEach(res => {
          message += `✓ ${res.portal}: ${res.message}\n`;
        });
        
        if (result.errors.length > 0) {
          message += '\nErrors:\n';
          result.errors.forEach(err => {
            message += `✗ ${err.portal}: ${err.error}\n`;
          });
        }
        
        return {
          content: [
            {
              type: 'text',
              text: message,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to publish vehicle: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  unpublish_vehicle: async (args, { publicationAPI }) => {
    try {
      if (args.portals.includes('all')) {
        const result = await publicationAPI.unpublishFromAllPortals(args.vehicleId);
        return {
          content: [
            {
              type: 'text',
              text: result.message,
            },
          ],
        };
      } else {
        const result = await publicationAPI.unpublishFromMultiplePortals(args.vehicleId, args.portals);
        let message = `Unpublished vehicle ${args.vehicleId} from ${result.successCount}/${result.totalRequested} portals\n\n`;
        
        result.results.forEach(res => {
          message += `✓ ${res.portal}: ${res.message}\n`;
        });
        
        if (result.errors.length > 0) {
          message += '\nErrors:\n';
          result.errors.forEach(err => {
            message += `✗ ${err.portal}: ${err.error}\n`;
          });
        }
        
        return {
          content: [
            {
              type: 'text',
              text: message,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to unpublish vehicle: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  get_publication_status: async (args, { publicationAPI }) => {
    try {
      const result = await publicationAPI.getPublicationStatus(args.vehicleId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get publication status: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  list_available_portals: async (args, { publicationAPI }) => {
    try {
      const result = publicationAPI.getAvailablePortals();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get available portals: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
};

module.exports = { publishTools, publishHandlers };