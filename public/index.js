const logoutBtn = document.getElementById('logoutBtn');
const errorMsgEl = document.getElementById('errorMsg');
const loginBtn = document.getElementById('loginBtn');
const dataDiv = document.getElementById('data');

main();

async function main() {
  let isAuthenticated = await checkAuthStatus();

  if (isAuthenticated) {
    loginBtn?.classList.add('hidden');
    logoutBtn?.classList.remove('hidden');
  
    if (window.location.pathname === '/data') {
      const dataObj = await getSecretData();
  
      if (dataDiv) {
        dataDiv.innerHTML = dataObj.secretData;
        dataDiv?.classList.remove('hidden');
      }
    }
  } else {
    loginBtn?.classList.remove('hidden');
    logoutBtn?.classList.add('hidden');
  }
}

async function checkAuthStatus() {
  const response = await fetch('/api/auth/status');
  const data = await response.json();
  return data.isAuthenticated;
}

// The user attempts to access protected content
async function getSecretData() {
  const response = await fetch('/api/secret', {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Request failed');
  }

  const data = await response.json();
  return data;
}
