const errorMsgEl = document.getElementById('errorMsg');
const loginForm = document.getElementById('loginForm');
const dataDiv = document.getElementById('data');
const logoutBtn = document.getElementById('logoutBtn');
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');

loginBtn.addEventListener('click', () => loginModal.showModal());
loginForm.addEventListener('submit', formSubmitHandler);
logoutBtn.addEventListener('click', logout);

checkAuthStatus();

async function checkAuthStatus() {
  const response = await fetch('/api/auth/status');
  const data = await response.json();
  if (data.isAuthenticated) {
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    const dataObj = await getSecretData();
    dataDiv.innerHTML = dataObj.secretData;
    dataDiv.classList.remove('hidden');
  } else {
    // Once logged out, show the login form...
    loginBtn.classList.remove('hidden');

    // ...then clear and hide the data, along with a logout button.
    dataDiv.innerHTML = '';
    dataDiv.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }
}

async function formSubmitHandler(e) {
  const username = e.target.username.value;
  const password = e.target.password.value;
  
  try {
    // Try to authenticate. Only throws error if existing user's password doesn't match.
    await login(username, password);

    // ...then get the data and display it, along with a logout button.
    await checkAuthStatus();
  } catch (err) {
    // Let the user know that their login was unsuccessful.
    errorMsgEl.innerHTML = err;
    errorMsgEl.classList.remove('hidden');
  } finally {
    // Reset the form and hide the message.
    e.target.reset();
    setTimeout(() => {
      errorMsgEl.classList.add('hidden');
      errorMsgEl.innerHTML = '';
    }, 5000);
  }
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

// The user attempts to log in
async function login(username, password) {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }
}

// The user logs out
async function logout() {
  // Try to log the user out, which will remove JWT from cookies.
  await fetch('/api/logout');
  await checkAuthStatus();
}
