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
 * VITAMIN D LOGIC - CLINICAL RANGES
 */
export const getVitaminDStatus = (level) => {
    if (level < 12) return { status: 'Severe Deficiency', adjustment: 30, message: 'Increase safe exposure by 30 mins.' };
    if (level < 20) return { status: 'Deficiency', adjustment: 20, message: 'Increase safe exposure by 20 mins.' };
    if (level < 30) return { status: 'Insufficient', adjustment: 15, message: 'Increase safe exposure by 15 mins.' };
    if (level <= 50) return { status: 'Sufficient', adjustment: 0, message: 'Maintain normal exposure.' };
    return { status: 'High', adjustment: -10, message: 'Reduce exposure time.' }; // > 50
};

/**
 * Calculate safe sun exposure time - MAIN FUNCTION
 * Now accepts optional vitaminDAdjustment (in minutes)
 */
export const calculateSafeTime = (uvIndex, skinType, isCloudy = false, hasSunscreen = false, vitaminDAdjustment = 0) => {
    const baseTime = getBaseTime(uvIndex);
    const skinMultiplier = getSkinMultiplier(skinType);
    const environmentFactor = getEnvironmentFactor(isCloudy, hasSunscreen);

    let safeTime = baseTime * skinMultiplier * environmentFactor;

    // Apply Vitamin D Adjustment
    // CRITICAL SAFETY RULE: If UV is HIGH (>7), IGNORE positive adjustments to prevent burning.
    if (uvIndex >= 7 && vitaminDAdjustment > 0) {

    } else {
        safeTime += vitaminDAdjustment;
    }

    // Ensure minimum/maximum bounds
    // Min 2 minutes, Max 300 minutes
    const clampedTime = Math.max(2, Math.min(300, Math.round(safeTime)));




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
    if (uvIndex < 3) {
        return { level: 'Low', color: '#4CAF50' };
    }
    if (uvIndex >= 3 && uvIndex < 6) {
        return { level: 'Moderate', color: '#FFB800' };
    }
    if (uvIndex >= 6 && uvIndex < 8) {
        return { level: 'High', color: '#FF9800' };
    }
    if (uvIndex >= 8 && uvIndex < 11) {
        return { level: 'Very High', color: '#FF5722' };
    }
    if (uvIndex >= 11) {
        return { level: 'Extreme', color: '#9C27B0' };
    }
    return { level: 'Unknown', color: '#9E9E9E' };
};

// ==========================================
// UV EXPOSURE SCORE CALCULATION - V2 (SCIENTIFIC)
// ==========================================

const SKIN_FACTORS = {
    1: 1.4,
    2: 1.2,
    3: 1.0,
    4: 0.8,
    5: 0.6,
    6: 0.5
};

const SAFE_LIMITS = {
    1: 80,
    2: 100,
    3: 120,
    4: 150,
    5: 180,
    6: 220
};

/**
 * Calculate UV Exposure Score (Normalized)
 * 
 * Formula:
 * RawExposure = UV * Time * SkinFactor * Protection
 * Score = (RawExposure / SafeLimit) * 100
 */
export const calculateExposureScore = (
    duration,
    uvIndex = 5,
    skinType = 3,
    hasSunscreen = false,
    isCloudy = false
) => {
    // 1. Calculate Raw Exposure
    const skinFactor = SKIN_FACTORS[skinType] || 1.0;

    let protectionFactor = 1.0;
    if (hasSunscreen && isCloudy) {
        protectionFactor = 0.35;
    } else if (hasSunscreen) {
        protectionFactor = 0.5;
    } else if (isCloudy) {
        protectionFactor = 0.7;
    }

    const rawExposure = uvIndex * duration * skinFactor * protectionFactor;

    // 2. Normalize Score
    const safeLimit = SAFE_LIMITS[skinType] || 120;
    const exposureScore = (rawExposure / safeLimit) * 100;

    // 3. Classification
    let status, color, statusEmoji;

    // Using rounded score for Classification to match UI
    const scoreForClass = Math.round(exposureScore);

    if (scoreForClass < 40) {
        status = 'Low'; // "Low Exposure" to "Low" for brevity if needed, but keeping verbose is safer for UI
        color = '#2196F3'; // Blue
        statusEmoji = '🌤️';
    } else if (scoreForClass <= 80) {
        status = 'Optimal';
        color = '#4CAF50'; // Green
        statusEmoji = '☀️';
    } else if (scoreForClass <= 120) {
        status = 'High';
        color = '#FF9800'; // Orange
        statusEmoji = '🔆';
    } else {
        status = 'Excessive';
        color = '#F44336'; // Red
        statusEmoji = '⚠️';
    }

    // Recommendation
    const recommendation = getExposureRecommendation(scoreForClass);

    return {
        score: Math.round(exposureScore), // The display score
        rawExposure: Math.round(rawExposure), // The raw units
        status,
        color,
        statusEmoji,
        recommendation: recommendation.message, // For saving
        shortRecommendation: recommendation.shortMessage,
        safeLimit // Useful for debug
    };
};

/**
 * Get personalized recommendation based on exposure score
 */
export const getExposureRecommendation = (score) => {
    if (score < 40) {
        return {
            message: "Consider getting a bit more sun exposure for Vitamin D production.",
            shortMessage: "Consider more sun",
            icon: '🌤️',
            priority: 'low'
        };
    }
    if (score <= 80) {
        return {
            message: "Great! You have reached an optimal level of sun exposure. Maintain this routine.",
            shortMessage: "Good! Maintain routine.",
            icon: '✅',
            priority: 'optimal'
        };
    }
    if (score <= 120) {
        return {
            message: "Your exposure is high. Use protection (sunscreen/hat) if going out again.",
            shortMessage: "Use protection if going out",
            icon: '🔆',
            priority: 'caution'
        };
    }
    return {
        message: "Your sun exposure is excessive. Please reduce sun exposure to avoid skin damage.",
        shortMessage: "Reduce exposure immediately",
        icon: '⚠️',
        priority: 'warning'
    };
};

/**
 * Calculate daily exposure score from multiple sessions
 * Sums up Raw Exposure and recalculates score against limit.
 */
export const calculateDailyExposureScore = (sessions) => {
    if (!sessions || sessions.length === 0) {
        return {
            score: 0,
            status: 'Low',
            color: '#2196F3',
            statusEmoji: '🌤️',
            totalMinutes: 0,
            sessionCount: 0,
            recommendation: getExposureRecommendation(0)
        };
    }

    // Sum up RAW exposure from all sessions
    let totalRawExposure = 0;
    let totalMinutes = 0;
    // Assume skinType is consistent, take from last session or first
    const skinType = sessions[0].skinType || 3;

    sessions.forEach(session => {
        const duration = session.duration || session.exposureTime || 0;
        const uvIndex = session.uvIndex || 0;
        const sType = session.skinType || skinType; // Use session skin type if available
        const hasSunscreen = session.sunscreen || false;
        const isCloudy = session.cloudy || false;

        // Re-calculate raw for accuracy (since we save it, we could just sum it, but safe to recalc)
        const skinFactor = SKIN_FACTORS[sType] || 1.0;
        let protectionFactor = 1.0;
        if (hasSunscreen && isCloudy) protectionFactor = 0.35;
        else if (hasSunscreen) protectionFactor = 0.5;
        else if (isCloudy) protectionFactor = 0.7;

        const raw = uvIndex * duration * skinFactor * protectionFactor;

        totalRawExposure += raw;
        totalMinutes += duration;
    });

    // Normalize Total
    const safeLimit = SAFE_LIMITS[skinType] || 120;
    const totalScore = (totalRawExposure / safeLimit) * 100;
    const roundedScore = Math.round(totalScore);

    // Classify
    let status, color, statusEmoji;
    if (roundedScore < 40) {
        status = 'Low';
        color = '#2196F3';
        statusEmoji = '🌤️';
    } else if (roundedScore <= 80) {
        status = 'Optimal';
        color = '#4CAF50';
        statusEmoji = '☀️';
    } else if (roundedScore <= 120) {
        status = 'High';
        color = '#FF9800';
        statusEmoji = '🔆';
    } else {
        status = 'Excessive';
        color = '#F44336';
        statusEmoji = '⚠️';
    }

    return {
        score: roundedScore,
        rawExposure: Math.round(totalRawExposure),
        status,
        color,
        statusEmoji,
        totalMinutes,
        sessionCount: sessions.length,
        recommendation: getExposureRecommendation(roundedScore)
    };
};
