
/**
 * Helper to handle Supabase response
 * @param {Object} response - The response object from Supabase { data, error }
 * @returns {any} - The data from response
 * @throws {Error} - If error is present
 */
export const handleResponse = ({ data, error }) => {
    if (error) {
        console.error("Supabase API Error:", error);
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
