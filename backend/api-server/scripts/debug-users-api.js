
import axios from 'axios';

async function main() {
    const API_URL = 'http://localhost:3000/api';

    console.log('1. Logging in...');
    try {
        const loginRes = await axios.post(`${API_URL}/v2/auth/login`, {
            email: 'admin@sena.co.th',
            password: 'Sena#1775',
            tenantId: 1  // SENA tenant
        });

        const token = loginRes.data.data.token;
        console.log('✅ Login successful. Token obtained.');

        // Debug decoded token if possible, but let's just use it

        console.log('\n2. Fetching Users...');
        const usersRes = await axios.get(`${API_URL}/users?limit=20`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Users API Response Status:', usersRes.status);

        // Detailed check of response structure
        const responseData = usersRes.data;

        let users = [];
        if (Array.isArray(responseData)) {
            users = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
            users = responseData.data;
        } else {
            console.log('⚠️ Unexpected response structure:', JSON.stringify(responseData).substring(0, 200));
        }

        console.log(`✅ Found ${users.length} users.`);

        if (users.length > 0) {
            users.forEach(u => {
                console.log(` - [${u.id}] ${u.email} (Tenant: ${u.tenantId || 'N/A'}) - Roles: ${JSON.stringify(u.userRoles || u.roles)}`);
            });
        } else {
            console.log('❌ No users found in response!');
        }

    } catch (e) {
        console.error('❌ Error:', e.response ? JSON.stringify(e.response.data) : e.message);
    }
}

main();
