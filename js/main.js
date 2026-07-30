/* ── Form backend configuration ─────────────────────────────────────────────
 * ENDPOINT empty → graceful mailto fallback to CONTACT_EMAIL (drafts an email
 * in the visitor's mail client) so no lead is ever silently dropped.
 *
 * To wire up Zoho CRM Web-to-Lead: in Zoho CRM create a Web-to-Lead form,
 * set ENDPOINT to 'https://crm.zoho.com/crm/WebToLeadForm', copy the hidden
 * xnQsjsdp / xmIwtLD token values from the generated snippet into
 * HIDDEN_FIELDS, and map our field names to Zoho's via FIELD_MAP.
 */
var FORM_CONFIG = {
  ENDPOINT: '',
  CONTACT_EMAIL: 'info@surgentlcp.com',
  HIDDEN_FIELDS: {
    // xnQsjsdp: '…', xmIwtLD: '…', actionType: 'TGVhZHM=', returnURL: 'https://www.surgentlcp.com/request-a-plan/'
  },
  FIELD_MAP: {
    // our name → endpoint's expected name (Zoho examples shown)
    // first_name: 'First Name', last_name: 'Last Name', email: 'Email',
    // phone: 'Phone', organization: 'Company', description: 'Description'
  }
};

/* ── Nav scroll state + mobile menu ───────────────────────────────────────── */
window.addEventListener('scroll', function () {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 8);
});

var navToggle = document.getElementById('nav-toggle');
if (navToggle) {
  navToggle.addEventListener('click', function () {
    var nav = document.getElementById('nav');
    var open = nav.classList.toggle('menu-open');
    this.setAttribute('aria-expanded', String(open));
    this.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
}

/* ── Request a Plan form (present only on /request-a-plan/) ──────────────── */
var form = document.getElementById('request-form');

function setError(name, on) {
  var field = document.getElementById(name);
  var err = document.getElementById('err-' + name);
  if (!field || !err) return;
  err.hidden = !on;
  field.setAttribute('aria-invalid', String(on));
  field.classList.toggle('invalid', on);
}

function validate() {
  var ok = true;
  ['first_name', 'last_name', 'organization', 'service', 'description'].forEach(function (name) {
    var bad = !document.getElementById(name).value.trim();
    setError(name, bad);
    if (bad) ok = false;
  });
  var email = document.getElementById('email').value.trim();
  var badEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  setError('email', badEmail);
  return ok && !badEmail;
}

function setStatus(kind, msg) {
  var status = document.getElementById('form-status');
  status.hidden = false;
  status.className = 'form-status ' + kind;
  status.textContent = msg;
}

if (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (document.getElementById('company_website').value) return; // honeypot hit — drop silently
    if (!validate()) {
      setStatus('error', 'Please fix the highlighted fields and try again.');
      return;
    }

    var btn = document.getElementById('form-submit-btn');
    var data = {};
    ['first_name', 'last_name', 'email', 'phone', 'organization', 'service', 'description', 'referral_source'].forEach(function (name) {
      var el = document.getElementById(name);
      if (el) data[name] = el.value.trim();
    });

    if (!FORM_CONFIG.ENDPOINT) {
      var body = Object.keys(data).map(function (k) {
        return k.replace(/_/g, ' ') + ': ' + data[k];
      }).join('\n');
      location.href = 'mailto:' + FORM_CONFIG.CONTACT_EMAIL +
        '?subject=' + encodeURIComponent('Plan request — ' + data.first_name + ' ' + data.last_name + ', ' + data.organization) +
        '&body=' + encodeURIComponent(body + '\n\nSubmitted via surgentlcp.com');
      setStatus('ok', 'Your email app has opened with your request drafted — press send to complete it, or email us directly at ' + FORM_CONFIG.CONTACT_EMAIL + '.');
      return;
    }

    var payload = new URLSearchParams();
    Object.keys(FORM_CONFIG.HIDDEN_FIELDS).forEach(function (k) { payload.append(k, FORM_CONFIG.HIDDEN_FIELDS[k]); });
    Object.keys(data).forEach(function (k) { payload.append(FORM_CONFIG.FIELD_MAP[k] || k, data[k]); });

    btn.disabled = true;
    btn.textContent = 'Sending…';
    fetch(FORM_CONFIG.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString()
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      form.reset();
      btn.textContent = 'Request submitted ✓';
      setStatus('ok', 'Thank you — your request has been received. We respond within one business day.');
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = 'Submit Request →';
      setStatus('error', 'Something went wrong sending your request. Please try again, or email us at ' + FORM_CONFIG.CONTACT_EMAIL + '.');
    });
  });
}
