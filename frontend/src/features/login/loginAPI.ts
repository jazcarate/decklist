export async function login(): Promise<string> {
  // Using http-only cookie
  const resp = await fetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const { token } = await resp.json();

  return token;
}
