const { login } = require('./src/app/actions/auth.actions');

async function testLogin() {
  try {
    const user = await login('admin', 'admin123');
    console.log('Login successful:', user);
  } catch (err) {
    console.error('Login failed:', err.message);
  }
}

testLogin();
