const errorMsgEl = document.getElementById('errorMsg');
const loginForm = document.getElementById('loginForm');
const dataDiv = document.getElementById('data');
const logoutBtn = document.getElementById('logoutBtn');

loginForm.addEventListener('submit', formSubmitHandler);
logoutBtn.addEventListener('click', logout);

async function formSubmitHandler(e) {
  e.preventDefault();
  
  const username = e.target.username.value;
  const password = e.target.password.value;
  
  try {
    // Try to authenticate. Only throws error if existing user's password doesn't match.
    await login(username, password);

    // Once authenticated successfully, hide the login form...
    loginForm.classList.add('hidden');

    // ...then get the data and display it, along with a logout button.
    const dataObj = await getSecretData();
    dataDiv.innerHTML = dataObj.secretData;
    dataDiv.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
  } catch (err) {
    // Let the user know that their login was unsuccessful.
    errorMsgEl.innerHTML = err;
  } finally {
    // Reset the form and hide the message.
    e.target.reset();
    setTimeout(() => (errorMsgEl.innerHTML = ''), 5000);
  }
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

// The user logs out
async function logout() {
  // Try to log the user out, which will remove JWT from cookies.
  await fetch('/api/logout');

  // Once logged out, show the login form...
  loginForm.classList.remove('hidden');

  // ...then clear and hide the data, along with a logout button.
  dataDiv.innerHTML = '';
  dataDiv.classList.add('hidden');
  logoutBtn.classList.add('hidden');
}