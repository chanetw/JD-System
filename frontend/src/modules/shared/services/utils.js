
/**
 * Helper to handle legacy data/error response objects
 * @param {Object} response - The response object { data, error }
 * @returns {any} - The data from response
 * @throws {Error} - If error is present
 */
export const handleResponse = ({ data, error }) => {
    if (error) {
        console.error("API Error:", error);
        throw new Error(error.message);
    }
    return data;
};

/**
 * Helper to generate random OTP
 * @returns {string} - 6 digit OTP
 */
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
