/**
 * Sun Logic Algorithm - SAFE & REALISTIC IMPLEMENTATION
 * Based on dermatology guidelines for safe sun exposure
 */

/**
 * Get base time in minutes based on UV Index
 * Updated to more conservative, safer values
 */
const getBaseTime = (uvIndex) => {
    if (uvIndex >= 0 && uvIndex <= 2) return 60;  // Low UV
    if (uvIndex >= 3 && uvIndex <= 5) return 30;  // Moderate UV (reduced from 45)
    if (uvIndex >= 6 && uvIndex <= 7) return 15;  // High UV (reduced from 30)
    if (uvIndex >= 8 && uvIndex <= 10) return 8;  // Very High UV (reduced from 15)
    if (uvIndex >= 11) return 3;                   // EXTREME UV (reduced from 10) - DANGEROUS!
    return 60; // Default fallback
};

/**
 * Get skin type multiplier (Fitzpatrick Scale)
 * Lower multipliers for fairer skin = safer
 */
const getSkinMultiplier = (skinType) => {
    const multipliers = {
        1: 0.5,  // Type I - Very Fair (MOST sensitive - reduced from 1.0)
        2: 0.7,  // Type II - Fair (reduced from 1.2)
        3: 1.0,  // Type III - Medium (baseline)
        4: 1.5,  // Type IV - Olive (reduced from 2.0)
        5: 2.0,  // Type V - Brown (reduced from 3.0)
        6: 2.5,  // Type VI - Dark Brown/Black (reduced from 4.0)
    };
    return multipliers[skinType] || 1.0;
};

/**
 * Calculate environment factor
 * Sunscreen and clouds provide some protection
 */
const getEnvironmentFactor = (isCloudy, hasSunscreen) => {
    let factor = 1.0;
    if (isCloudy) factor *= 1.3;       // Clouds reduce UV by ~30%
    if (hasSunscreen) factor *= 1.5;   // SPF adds protection (increased from 1.2)
    return factor;
};

/**
 * Calculate safe sun exposure time - MAIN FUNCTION
 */
export const calculateSafeTime = (uvIndex, skinType, isCloudy = false, hasSunscreen = false) => {
    const baseTime = getBaseTime(uvIndex);
    const skinMultiplier = getSkinMultiplier(skinType);
    const environmentFactor = getEnvironmentFactor(isCloudy, hasSunscreen);

    const safeTime = baseTime * skinMultiplier * environmentFactor;

    // Ensure minimum of 2 minutes and maximum of 90 minutes
    const clampedTime = Math.max(2, Math.min(90, Math.round(safeTime)));

    console.log('Safe Time Calculation:', {
        uvIndex,
        skinType,
        isCloudy,
        hasSunscreen,
        baseTime,
        skinMultiplier,
        environmentFactor,
        rawResult: safeTime,
        finalTime: clampedTime
    });

    return clampedTime;
};

/**
 * Get skin type description
 */
export const getSkinTypeDescription = (skinType) => {
    const descriptions = {
        1: 'Type I - Very Fair (Always burns, never tans)',
        2: 'Type II - Fair (Usually burns, tans minimally)',
        3: 'Type III - Medium (Sometimes burns, tans gradually)',
        4: 'Type IV - Olive (Rarely burns, tans easily)',
        5: 'Type V - Brown (Very rarely burns, tans darkly)',
        6: 'Type VI - Dark Brown/Black (Never burns, deeply pigmented)',
    };
    return descriptions[skinType] || 'Unknown';
};

/**
 * Get UV level category
 */
export const getUVCategory = (uvIndex) => {
    if (uvIndex >= 0 && uvIndex <= 2) {
        return { level: 'Low', color: '#4CAF50' };
    }
    if (uvIndex >= 3 && uvIndex <= 5) {
        return { level: 'Moderate', color: '#FFB800' };
    }
    if (uvIndex >= 6 && uvIndex <= 7) {
        return { level: 'High', color: '#FF9800' };
    }
    if (uvIndex >= 8 && uvIndex <= 10) {
        return { level: 'Very High', color: '#FF5722' };
    }
    if (uvIndex >= 11) {
        return { level: 'Extreme', color: '#9C27B0' };
    }
    return { level: 'Unknown', color: '#9E9E9E' };
};
