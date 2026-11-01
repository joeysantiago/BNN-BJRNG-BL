/* Atrium HR page. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Atrium HR (the real demo app, embedded as it is)

const HR_FEATURES = [
  { h: 'Employees', p: 'Profiles, departments, employment types and documents in one directory.' },
  { h: 'Attendance', p: 'Daily attendance, a monthly muster and employee check-in with a selfie and geofence.' },
  { h: 'Leave', p: 'Leave types, balances, requests and approvals with a clear policy.' },
  { h: 'Payroll', p: 'Monthly pay runs with basic pay, HRA, PF, ESI, professional tax and TDS, plus payslips.' },
  { h: 'Hiring', p: 'Job openings, a candidate pipeline, interviews with feedback, and offers with onboarding.' },
  { h: 'Reports', p: 'Attendance trends, headcount by department, hiring funnel and cost charts.' },
];
let atriumDoc = null;

function hrPage() {
  const html = `<iframe class="app" id="hr-frame" title="Atrium HR: sign in and workspace" allow="geolocation; camera; clipboard-write; fullscreen"></iframe>
    <div class="wrap about"><article class="card prose">
      <h1>Atrium HR: attendance, leave and payroll in one place</h1>
      <p>Atrium is a demo HR workspace. Sign in above to open the admin console or the employee mobile app and try employees, attendance, leave, payroll, hiring and reports with sample data.</p>
      <h2>What you can try</h2><ul>${HR_FEATURES.map((f) => `<li><strong>${f.h}:</strong> ${f.p}</li>`).join('')}</ul>
      <h2>Admin console and employee app</h2>
      <p>HR admins manage people, approve leave, run payroll and read reports in the console. Employees use a phone-sized app to check in with a selfie inside the office geofence, apply for leave and view payslips.</p>
      <h2>About the demo data</h2>
      <p>Everything runs in your browser and uses sample data. Changes stay on your device. Do not enter real employee or payroll information.</p>
      <p class="back"><a href="${link('/')}">Internet speed test</a> · <a href="${link('/about')}">About</a> · <a href="${link('/privacy')}">Privacy</a></p>
    </article></div>`;
  return {
    title: traw('seo.hr.title'),
    html: host('sc-hr', html),
    after() {
      if (!atriumDoc) {
        const bytes = Uint8Array.from(atob(ATRIUM_B64), (ch) => ch.charCodeAt(0));
        atriumDoc = new TextDecoder().decode(bytes);
      }
      document.getElementById('hr-frame').srcdoc = atriumDoc;
    },
  };
}

// #endregion

