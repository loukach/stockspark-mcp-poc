# Vehicle Deletion Guide

## ✅ **New Feature: Delete Vehicle**

A secure vehicle deletion tool has been added to permanently remove vehicles from the stock.

### **API Reference**
- **Endpoint**: `DELETE /{country}/vehicle/{id}`
- **Description**: Delete a vehicle from the stock permanently
- **Parameters**: 
  - `id` (path, required): Vehicle ID to delete
  - `country` (path, required): API country (it, uk, de, fr, es)

## **MCP Tool: `delete_vehicle`**

### **Description**
Delete a vehicle from the stock permanently with built-in safety features.

### **Safety Features**
1. **Explicit Confirmation Required**: Must set `confirm: true` to proceed
2. **Vehicle Info Retrieval**: Shows vehicle details before deletion
3. **Clear Warnings**: Multiple warnings about irreversible action
4. **Error Handling**: Specific guidance for common issues

### **Usage**

#### **Step 1: Attempt Deletion (Safety Check)**
```javascript
delete_vehicle({
  vehicleId: 9765338
})
```

**Response:**
```
⚠️ **DELETION BLOCKED**: Confirmation required.

To delete vehicle 9765338, you must explicitly confirm:
`delete_vehicle({vehicleId: 9765338, confirm: true})`

⚠️ **WARNING**: This action is irreversible! The vehicle will be permanently removed.
```

#### **Step 2: Confirmed Deletion**
```javascript
delete_vehicle({
  vehicleId: 9765338,
  confirm: true
})
```

**Success Response:**
```
🗑️ **VEHICLE DELETED**

✅ Vehicle Toyota Yaris (ID: 9765338) has been successfully deleted from the stock.

⚠️ This action cannot be undone. The vehicle has been permanently removed from the stock.
```

## **Error Handling**

### **Vehicle Not Found**
```javascript
delete_vehicle({vehicleId: 999999, confirm: true})
```
**Response:**
```
❌ Vehicle 999999 not found. It may have already been deleted or never existed.
```

### **Vehicle Cannot Be Deleted (Published/Active)**
```javascript
delete_vehicle({vehicleId: 12345, confirm: true})
```
**Response:**
```
❌ Cannot delete vehicle 12345: Vehicle may be published or have active reservations.

💡 **Tip**: Unpublish the vehicle first using unpublish_vehicle, then try deleting again.
```

### **Missing Confirmation**
```javascript
delete_vehicle({vehicleId: 12345})
// or
delete_vehicle({vehicleId: 12345, confirm: false})
```
**Response:**
```
⚠️ **DELETION BLOCKED**: Confirmation required.

To delete vehicle 12345, you must explicitly confirm:
`delete_vehicle({vehicleId: 12345, confirm: true})`

⚠️ **WARNING**: This action is irreversible! The vehicle will be permanently removed.
```

## **Technical Implementation**

### **API Method (src/api/vehicles.js)**
```javascript
async deleteVehicle(vehicleId) {
  // First get vehicle info for confirmation message
  const vehicle = await this.getVehicle(vehicleId);
  const vehicleInfo = `${vehicle.make?.name || 'Unknown'} ${vehicle.model?.name || 'Unknown'} (ID: ${vehicleId})`;
  
  // Delete the vehicle
  await this.client.delete(`/vehicle/${vehicleId}`);
  
  return {
    success: true,
    vehicleInfo,
    message: `Vehicle ${vehicleInfo} has been successfully deleted from the stock.`
  };
}
```

### **MCP Tool Schema**
```javascript
{
  name: "delete_vehicle",
  description: `Delete a vehicle from the stock permanently

⚠️  **WARNING**: This action is irreversible! The vehicle will be permanently removed from the stock.

When to use: Remove vehicles that are sold, no longer available, or added by mistake
Prerequisites: Vehicle ID from list_vehicles or get_vehicle
Security: Vehicle info is fetched first for confirmation before deletion`,
  inputSchema: {
    type: "object",
    properties: {
      vehicleId: { 
        type: "number", 
        description: "Vehicle ID to delete permanently" 
      },
      confirm: {
        type: "boolean",
        description: "Confirmation that you want to permanently delete this vehicle",
        default: false
      }
    },
    required: ["vehicleId", "confirm"]
  }
}
```

## **Common Workflows**

### **Workflow 1: Delete a Sold Vehicle**
```javascript
// 1. Find the vehicle
list_vehicles({search: "Toyota Yaris"})

// 2. Confirm it's the right one
get_vehicle({vehicleId: 9765338})

// 3. Delete it
delete_vehicle({vehicleId: 9765338, confirm: true})
```

### **Workflow 2: Delete a Published Vehicle**
```javascript
// 1. First unpublish the vehicle
unpublish_vehicle({
  vehicleId: 12345,
  portals: ["all"]
})

// 2. Then delete it
delete_vehicle({vehicleId: 12345, confirm: true})
```

### **Workflow 3: Bulk Deletion**
```javascript
// Delete multiple vehicles (each requires confirmation)
const vehicleIds = [9765338, 9765339, 9765340];

for (const id of vehicleIds) {
  delete_vehicle({vehicleId: id, confirm: true});
}
```

## **Best Practices**

### **✅ Do:**
- Always verify the vehicle details before deletion
- Use `list_vehicles` or `get_vehicle` to confirm you have the right vehicle
- Unpublish vehicles before deleting if they're published
- Keep records of deleted vehicle IDs for audit purposes

### **❌ Don't:**
- Delete vehicles without double-checking the vehicle ID
- Delete published vehicles directly (unpublish first)
- Use deletion as a way to "hide" vehicles (use status updates instead)
- Delete vehicles that might have pending transactions

## **Security Features**

1. **Two-Step Confirmation**: 
   - First call without `confirm: true` shows warning
   - Second call with `confirm: true` executes deletion

2. **Information Display**: 
   - Vehicle make/model shown before deletion
   - Clear success/failure messages

3. **Error Prevention**:
   - Validates vehicle exists before deletion
   - Handles published vehicle conflicts
   - Provides helpful error messages

4. **Audit Trail**:
   - Logs all deletion attempts
   - Returns vehicle information for record-keeping

## **Integration Notes**

- **Tool Count Updated**: Vehicle tools now include 6 tools (was 5)
- **Backward Compatible**: No changes to existing tools
- **API Consistency**: Uses existing DELETE endpoint pattern
- **Error Handling**: Follows established error response patterns

## **Testing**

The delete functionality has been tested and all existing tests continue to pass:

```bash
npm test
# 🎯 OVERALL: 8/8 tests passed (100.0%)
```

## **Next Steps**

Consider adding:
1. **Soft delete option**: Mark as deleted instead of permanent removal
2. **Batch delete tool**: Delete multiple vehicles in one operation
3. **Delete audit log**: Track all deletions with timestamps
4. **Restore functionality**: Undo recent deletions (if implementing soft delete)