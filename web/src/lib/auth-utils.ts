import { cookies } from 'next/headers';

// Simple function to get auth session from cookies
// export async function getAuthSession() {
//   const cookieStore = cookies();
//   const token = cookieStore.get('auth_token');
  
//   // If token exists, user is considered authenticated
//   return token ? { token: token.value } : null;
// } 