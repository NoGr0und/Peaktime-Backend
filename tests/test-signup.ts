import { supabase } from '../src/lib/supabase.js';

async function test() {
  const email = `test.direct.${Math.floor(Math.random() * 1000000)}@example.com`;
  const password = 'Password123!';
  console.log('Signing up:', email);
  try {
    const res = await supabase.auth.signUp({
      email,
      password,
    });
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
