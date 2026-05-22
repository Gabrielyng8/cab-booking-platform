// CabBook - Demo Autofill Panel

(function () {

  // Data
  const USERS = {
    regGabriel: {
      label: 'Register gabriel@cabbook.test',
      firstName: 'Gabriel', surname: 'Borg',
      email: 'gabriel@cabbook.test', password: 'Test1234!'
    },
    valid: {
      label: 'Valid user (existing)',
      firstName: 'Gabriel', surname: 'Borg',
      email: 'gabriel@cabbook.test', password: 'Test1234!'
    },
    invalid: {
      label: 'Invalid credentials',
      email: 'nobody@cabbook.test', password: 'WrongPass!'
    },
    newReg: {
      label: 'New registration',
      firstName: 'Maria', surname: 'Camilleri',
      email: `new_${Date.now()}@cabbook.test`, password: 'Register99!'
    }
  };

  // Passenger multiplier bands (Task 3)
  // 1-4 = x1   |   5-8 = x2   |   >8 = not allowed
  const BOOKINGS = [
    {
      label: 'Valletta → Sliema · Economic · 2 pax · daytime',
      note: 'cab x1 · day x1 · pax x1',
      start: 'Valletta', end: 'Sliema',
      depLat: '35.8989', depLng: '14.5146',
      arrLat: '35.9042', arrLng: '14.5023',
      passengers: '2', cabType: 'Economic',
      hour: 10   // 10:00 = daytime multiplier x1
    },
    {
      label: 'Msida → Mosta · Premium · 5 pax · daytime',
      note: 'cab x1.2 · day x1 · pax x2',
      start: 'Msida', end: 'Mosta',
      depLat: '35.8993', depLng: '14.4895',
      arrLat: '35.9095', arrLng: '14.4244',
      passengers: '5', cabType: 'Premium',
      hour: 14   // 14:00 = daytime multiplier x1
    },
    {
      label: 'Birgu → Bugibba · Executive · 3 pax · night',
      note: 'cab x1.4 · night x1.2 · pax x1',
      start: 'Birgu', end: 'Bugibba',
      depLat: '35.8869', depLng: '14.5226',
      arrLat: '35.9516', arrLng: '14.4170',
      passengers: '3', cabType: 'Executive',
      hour: 2    // 02:00 = night multiplier x1.2
    },
    {
      label: 'Sliema → Airport · Economic · 8 pax · daytime',
      note: 'cab x1 · day x1 · pax x2 (max band)',
      start: 'Sliema', end: 'Malta International Airport',
      depLat: '35.9042', depLng: '14.5023',
      arrLat: '35.8574', arrLng: '14.4775',
      passengers: '8', cabType: 'Economic',
      hour: 9
    },
    {
      label: 'Valletta → Mdina · Executive · 9 pax · ERROR',
      note: '>8 passengers - should be rejected',
      start: 'Valletta', end: 'Mdina',
      depLat: '35.8989', depLng: '14.5146',
      arrLat: '35.8885', arrLng: '14.4025',
      passengers: '9', cabType: 'Executive',
      hour: 12
    }
  ];

  const LOCATIONS = [
    { label: 'Home - Valletta', name: 'Home', address: '1 Triq ir-Repubblika, Valletta', lat: '35.8989', lng: '14.5146' },
    { label: 'Work - Sliema', name: 'Work', address: '45 Triq ix-Xatt, Sliema', lat: '35.9125', lng: '14.5015' },
    { label: 'Airport - Luqa', name: 'Airport', address: 'Malta International Airport', lat: '35.8574', lng: '14.4775' }
  ];

  // Helpers

  function set(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Build a datetime-local string for today at a given hour
  function atHour(hour) {
    const d = new Date();
    d.setDate(d.getDate() + 1); // tomorrow, avoid past-date issues
    d.setHours(hour, 0, 0, 0);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:00`;
  }

  function flash(btn) {
    const orig = btn.style.background;
    btn.style.background = '#2a6e2a';
    setTimeout(() => btn.style.background = orig, 600);
  }

  // Fill functions

  function fillRegister(u) {
    showSection('register');
    setTimeout(() => {
      set('reg-fname', u.firstName || '');
      set('reg-surname', u.surname || '');
      set('reg-email', u.email);
      set('reg-password', u.password);
    }, 80);
  }

  function fillLogin(u) {
    showSection('login');
    setTimeout(() => {
      set('login-email', u.email);
      set('login-password', u.password);
    }, 80);
  }

  function fillBooking(b) {
    // Only navigate if the section is accessible (user is logged in)
    const bookBtn = document.getElementById('nav-book');
    if (bookBtn && bookBtn.style.display === 'none') {
      alert('Please log in first before filling a booking.');
      return;
    }
    showSection('book');
    // Reset fare estimate state
    document.getElementById('fare-estimate').textContent = '';
    document.getElementById('confirm-btn').style.display = 'none';
    setTimeout(() => {
      set('book-start', b.start);
      set('book-end', b.end);
      set('book-dep-lat', b.depLat);
      set('book-dep-lng', b.depLng);
      set('book-arr-lat', b.arrLat);
      set('book-arr-lng', b.arrLng);
      set('book-datetime', atHour(b.hour));
      set('book-passengers', b.passengers);
      set('book-cabtype', b.cabType);
    }, 80);
  }

  function fillLocation(l) {
    const locBtn = document.getElementById('nav-locations');
    if (locBtn && locBtn.style.display === 'none') {
      alert('Please log in first before filling a location.');
      return;
    }
    // Navigate and let loadLocations() run first, then fill the form
    locBtn.click();
    setTimeout(() => {
      set('loc-name', l.name);
      set('loc-address', l.address);
      set('loc-lat', l.lat);
      set('loc-lng', l.lng);
    }, 120);
  }

  // Build UI
  const styles = `
    #af-panel {
      position: fixed; bottom: 16px; right: 16px; z-index: 99999;
      width: 300px; font-family: Arial, sans-serif; font-size: 12px;
      background: #fff; border: 1px solid #ccc; border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,.18); overflow: hidden;
    }
    #af-header {
      background: #1a1a2e; color: #fff; padding: 8px 12px;
      display: flex; justify-content: space-between; align-items: center;
      cursor: pointer; user-select: none;
    }
    #af-header span { font-weight: bold; font-size: 12px; letter-spacing:.03em; }
    #af-header small { color:#aaa; font-size:10px; }
    #af-toggle { background:none; border:none; color:#fff; font-size:16px; cursor:pointer; padding:0; }
    #af-body { padding: 10px; display:flex; flex-direction:column; gap:8px; max-height:75vh; overflow-y:auto; }
    .af-section-label {
      font-size: 10px; font-weight: bold; letter-spacing: .06em;
      text-transform: uppercase; color: #888; margin: 4px 0 2px;
    }
    .af-btn-group { display:flex; flex-direction:column; gap:4px; }
    .af-btn {
      background: #f4f4f4; border: 1px solid #ddd; border-radius: 5px;
      padding: 6px 10px; cursor: pointer; text-align: left;
      font-size: 11px; color: #222; transition: background .15s;
      display: flex; flex-direction: column; gap: 2px;
    }
    .af-btn:hover { background: #e8e8e8; border-color: #bbb; }
    .af-btn.green  { border-left: 3px solid #2d8a2d; }
    .af-btn.red    { border-left: 3px solid #c0392b; }
    .af-btn.blue   { border-left: 3px solid #2563ae; }
    .af-btn.orange { border-left: 3px solid #c97c00; }
    .af-btn.purple { border-left: 3px solid #7c3aed; }
    .af-btn .af-note { color: #888; font-size: 10px; }
    .af-divider { border:none; border-top:1px solid #eee; margin:2px 0; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  const panel = document.createElement('div');
  panel.id = 'af-panel';

  panel.innerHTML = `
    <div id="af-header">
      <span>🧪 Demo autofill</span>
      <small>click to fill forms</small>
      <button id="af-toggle" title="Collapse/expand">▼</button>
    </div>
    <div id="af-body">

      <div class="af-section-label">Register (Task 1)</div>
      <div class="af-btn-group">
        <button class="af-btn blue" data-action="reg-gabriel">
          Register gabriel@cabbook.test
          <span class="af-note">fixed account for demo</span>
        </button>
        <button class="af-btn green" data-action="reg-new">
          Register new user
          <span class="af-note">unique email each time</span>
        </button>
      </div>

      <hr class="af-divider">
      <div class="af-section-label">Login (Task 1)</div>
      <div class="af-btn-group">
        <button class="af-btn green" data-action="login-valid">
          Valid credentials
          <span class="af-note">${USERS.valid.email}</span>
        </button>
        <button class="af-btn red" data-action="login-invalid">
          Invalid credentials
          <span class="af-note">wrong password → should show error</span>
        </button>
      </div>

      <hr class="af-divider">
      <div class="af-section-label">Book a cab (Tasks 2 &amp; 3)</div>
      <div class="af-btn-group" id="af-bookings"></div>

      <hr class="af-divider">
      <div class="af-section-label">Favourite locations (Task 4)</div>
      <div class="af-btn-group" id="af-locations"></div>

    </div>
  `;

  document.body.appendChild(panel);

  // Populate booking buttons
  const bookingContainer = document.getElementById('af-bookings');
  const colours = ['blue', 'blue', 'purple', 'orange', 'red'];
  BOOKINGS.forEach((b, i) => {
    const btn = document.createElement('button');
    btn.className = `af-btn ${colours[i]}`;
    btn.dataset.bookingIndex = i;
    btn.innerHTML = `${b.label}<span class="af-note">${b.note}</span>`;
    bookingContainer.appendChild(btn);
  });

  // Populate location buttons
  const locationContainer = document.getElementById('af-locations');
  LOCATIONS.forEach((l, i) => {
    const btn = document.createElement('button');
    btn.className = 'af-btn blue';
    btn.dataset.locationIndex = i;
    btn.textContent = l.label;
    locationContainer.appendChild(btn);
  });

  // Event delegation
  document.getElementById('af-body').addEventListener('click', function (e) {
    const btn = e.target.closest('.af-btn');
    if (!btn) return;

    const action = btn.dataset.action;
    const bi = btn.dataset.bookingIndex;
    const li = btn.dataset.locationIndex;

    if (action === 'reg-gabriel') {
      fillRegister(USERS.regGabriel);
    }
    else if (action === 'reg-new') {
      // Generate a fresh email each click so re-runs don't collide
      USERS.newReg.email = `new_${Date.now()}@cabbook.test`;
      fillRegister(USERS.newReg);
    }
    else if (action === 'login-valid') fillLogin(USERS.valid);
    else if (action === 'login-invalid') fillLogin(USERS.invalid);
    else if (bi !== undefined) fillBooking(BOOKINGS[parseInt(bi)]);
    else if (li !== undefined) fillLocation(LOCATIONS[parseInt(li)]);

    flash(btn);
  });

  // Collapse / expand
  let collapsed = false;
  document.getElementById('af-header').addEventListener('click', () => {
    collapsed = !collapsed;
    document.getElementById('af-body').style.display = collapsed ? 'none' : '';
    document.getElementById('af-toggle').textContent = collapsed ? '▲' : '▼';
  });

})();
