// Debounce: delays execution to avoid excessive triggering (e.g., search input)
export function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Capitalize the first letter of a string
export function capitalize(str) {
  if (typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Truncate text with ellipsis
export function truncate(str, maxLength = 100) {
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str;
}

// Format phone number
export function formatPhone(number) {
  return number?.replace?.(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') ?? '';
}

export function showMapsPrompt(shop, callback) {
  const modal = document.createElement('div');
  modal.id = 'maps-prompt-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '10000';

  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 15px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 0 10px rgba(0,0,0,0.2);
    ">
      <p>Open directions to <strong>${shop.name}</strong> in:</p>
      <button id="google-maps-btn" style="margin: 10px;">Google Maps</button>
      <button id="apple-maps-btn" style="margin: 10px;">Apple Maps</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('google-maps-btn').onclick = () => {
    callback(true); // use Google Maps
    modal.remove();
  };

  document.getElementById('apple-maps-btn').onclick = () => {
    callback(false); // use Apple Maps
    modal.remove();
  };

  // Optional: click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

