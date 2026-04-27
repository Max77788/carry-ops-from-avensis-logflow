/**
 * Utility script to set passwords for carriers
 * 
 * Usage:
 * 1. Import this in your browser console or create a temporary admin page
 * 2. Call setPasswordForCarrier(carrierName, password)
 * 
 * Example:
 * import { setPasswordForCarrier } from './utils/setCarrierPassword';
 * await setPasswordForCarrier('4HR Trucking', 'SecurePassword123');
 */

import { carrierService } from "@/lib/carrierService";

export async function setPasswordForCarrier(
  carrierName: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Setting password for carrier: ${carrierName}`);

    // Get carrier by name
    const carrier = await carrierService.getCarrierByName(carrierName);

    if (!carrier) {
      return {
        success: false,
        message: `Carrier "${carrierName}" not found`,
      };
    }

    // Set password
    const result = await carrierService.setCarrierPassword(carrier.id, password);

    if (result.success) {
      return {
        success: true,
        message: `Password set successfully for "${carrierName}"`,
      };
    } else {
      return {
        success: false,
        message: result.error || "Failed to set password",
      };
    }
  } catch (error: any) {
    console.error("Error setting password:", error);
    return {
      success: false,
      message: error.message || "An error occurred",
    };
  }
}

/**
 * Set passwords for multiple carriers at once
 */
export async function setPasswordsForMultipleCarriers(
  carriers: Array<{ name: string; password: string }>
): Promise<void> {
  console.log(`Setting passwords for ${carriers.length} carriers...`);

  for (const carrier of carriers) {
    const result = await setPasswordForCarrier(carrier.name, carrier.password);
    console.log(
      `${carrier.name}: ${result.success ? "✅ Success" : "❌ Failed"} - ${result.message}`
    );
  }

  console.log("Done!");
}

/**
 * Example usage - uncomment and modify as needed:
 * 
 * const carriersToSetup = [
 *   { name: '4HR Trucking', password: 'SecurePass123' },
 *   { name: 'ABC Transport', password: 'AnotherPass456' },
 * ];
 * 
 * setPasswordsForMultipleCarriers(carriersToSetup);
 */

