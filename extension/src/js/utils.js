export function post(endpoint, data) {
  let opts = {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  };
  return fetch(endpoint, opts)
    .catch(handleError) // handle network issues
    .then(checkStatus)
    .then(parseJSON)
    .catch((error) => {
      throw error;
    });
}

const checkStatus = (response) => {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }

  return response.json().then((json) => {
    return Promise.reject({
      status: response.status,
      ok: false,
      statusText: response.statusText,
      body: json,
    });
  });
};

const parseJSON = (response) => {
  if (response.status === 204 || response.status === 205) {
    return null;
  }
  return response.json();
};

const handleError = (error) => {
  error.response = {
    status: 0,
    statusText: "Cannot connect. Please make sure you are connected to internet.",
  };
  throw error;
};
