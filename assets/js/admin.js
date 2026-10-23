/**
 * Kiyo Tak Control Room - Admin Logic
 * Excel Parsing, Duplicate/Error Validation, Canvas Template Rendering,
 * Batch Certificate Generation, ZIP & Excel Exporters, and Reviews Approval.
 */

// Verify Admin Session
if (!sessionStorage.getItem('kiyotak_admin_token')) {
  window.location.href = 'admin-login.html';
}

function handleAdminLogout() {
  sessionStorage.removeItem('kiyotak_admin_token');
  sessionStorage.removeItem('kiyotak_admin_id');
  window.location.href = 'admin-login.html';
}

// Global Admin State
let globalCertificates = [];
let globalParsedRows = [];
let templateConfig = null;
let templateImageObj = new Image();

document.addEventListener('DOMContentLoaded', () => {
  initPaymentToggleListener();
  loadTemplateConfig();
  fetchCertificatesRegistry();
  fetchAdminReviews();
  fetchAdminApplications();
});

function switchAdminTab(tabName, element) {
  document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.admin-tab-pane').forEach(el => el.style.display = 'none');

  if (element) element.classList.add('active');
  const target = document.getElementById(`tab-${tabName}`);
  if (target) target.style.display = 'block';

  const titles = {
    'certificates': 'Internship Certificate Generation & Registry',
    'template-designer': 'Certificate Template Designer & Text Positioning',
    'reviews': 'Public Reviews & Google Ratings Moderation',
    'applications': 'Mentorship Applications & Student Inquiries'
  };
  document.getElementById('adminModuleTitle').innerText = titles[tabName] || 'Control Room';

  if (tabName === 'template-designer') {
    setTimeout(updateLiveCanvas, 100);
  }
}

function initPaymentToggleListener() {
  const chk = document.getElementById('chkPaymentRequired');
  const wrap = document.getElementById('paymentAmountWrap');
  if (chk && wrap) {
    chk.addEventListener('change', () => {
      wrap.style.display = chk.checked ? 'flex' : 'none';
    });
  }
}

// ----------------------------------------------------
// EXCEL UPLOAD, VALIDATION & BATCH GENERATION
// ----------------------------------------------------

function handleExcelFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  const dropzone = document.getElementById('excelDropzone');
  dropzone.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><div style="font-weight:700;">Parsing ${file.name}...</div>`;

  fetch('/api/admin/certificates/parse-excel', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    dropzone.innerHTML = `
      <i class="fa-solid fa-file-circle-check" style="color:var(--admin-teal);"></i>
      <div style="font-weight:700; color:var(--admin-teal);">Loaded ${file.name}</div>
      <div style="font-size:0.85rem; color:#64748b;">Click to upload another file</div>
    `;

    if (data.success) {
      globalParsedRows = data.rows;
      renderParsedExcelTable(data);
    } else {
      alert('Error parsing Excel: ' + (data.message || 'Invalid format'));
      clearExcelUpload();
    }
  })
  .catch(err => {
    console.error('Error:', err);
    alert('Server communication error during file upload.');
    clearExcelUpload();
  });
}

function renderParsedExcelTable(data) {
  const previewSection = document.getElementById('excelPreviewSection');
  previewSection.style.display = 'block';

  document.getElementById('statValidRows').innerText = `${data.validRows} Valid Rows`;
  document.getElementById('statInvalidRows').innerText = `${data.invalidRows} Flagged Rows`;
  document.getElementById('statTotalRows').innerText = `${data.totalRows} Total`;

  const tbody = document.getElementById('excelPreviewTableBody');
  tbody.innerHTML = '';

  data.rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.style.background = r.isValid ? 'transparent' : 'rgba(244, 63, 94, 0.05)';

    let statusBadge = r.isValid 
      ? '<span class="mono-tag teal"><i class="fa-solid fa-check"></i> READY</span>'
      : '<span class="mono-tag coral"><i class="fa-solid fa-triangle-exclamation"></i> INVALID</span>';

    if (r.isDuplicateInDb) {
      statusBadge += ' <span class="mono-tag" style="background:#fef3c7; color:#b45309; border-color:#fde68a;">EXISTS IN DB</span>';
    }

    const notes = r.errors.length > 0 
      ? `<span style="color:var(--admin-coral); font-weight:600;">${r.errors.join(', ')}</span>`
      : '<span style="color:var(--admin-teal);">All fields verified</span>';

    tr.innerHTML = `
      <td>${r.rowIndex}</td>
      <td>${statusBadge}</td>
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td style="font-family:var(--font-mono); font-size:0.82rem;">${escapeHtml(r.email)}</td>
      <td>${escapeHtml(r.course)}</td>
      <td>${escapeHtml(r.startDate)}</td>
      <td>${escapeHtml(r.endDate)}</td>
      <td><strong>${escapeHtml(r.grade)}</strong></td>
      <td style="font-size:0.82rem;">${notes}</td>
    `;
    tbody.appendChild(tr);
  });
}

function clearExcelUpload() {
  globalParsedRows = [];
  document.getElementById('excelFileInput').value = '';
  document.getElementById('excelPreviewSection').style.display = 'none';
  document.getElementById('excelDropzone').innerHTML = `
    <i class="fa-solid fa-cloud-arrow-up"></i>
    <div style="font-size: 1.1rem; font-weight:700; color:var(--admin-text-main); margin-bottom:4px;">
      Click to select or drag and drop your Excel / CSV file
    </div>
    <div style="font-size: 0.85rem; color: var(--admin-text-muted);">
      Supports <span class="mono-tag">.xlsx</span>, <span class="mono-tag">.xls</span>, and <span class="mono-tag">.csv</span>
    </div>
  `;
}

function generateBatchCertificates() {
  const validRows = globalParsedRows.filter(r => r.isValid);
  if (validRows.length === 0) {
    alert('No valid rows found in the uploaded file to generate certificates.');
    return;
  }

  const paymentRequired = document.getElementById('chkPaymentRequired').checked;
  const paymentAmount = parseInt(document.getElementById('txtPaymentAmount').value) || 499;

  const btn = document.getElementById('btnGenerateBatch');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating ${validRows.length} Certificates...`;

  fetch('/api/admin/certificates/generate-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rows: validRows,
      paymentRequired,
      paymentAmount
    })
  })
  .then(res => res.json())
  .then(data => {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Generate All Valid Certificates`;

    if (data.success) {
      alert(`Success! ${data.certificates.length} certificates have been generated. They now appear in each student's dashboard under "My certificates" based on their email.`);
      clearExcelUpload();
      fetchCertificatesRegistry();
    } else {
      alert('Error generating certificates: ' + data.message);
    }
  })
  .catch(err => {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Generate All Valid Certificates`;
    console.error('Error:', err);
    alert('Failed to connect to backend server.');
  });
}

// ----------------------------------------------------
// CERTIFICATE REGISTRY & ACTIONS
// ----------------------------------------------------

function fetchCertificatesRegistry() {
  fetch('/api/admin/certificates/list')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        globalCertificates = data.certificates;
        renderCertificatesTable(globalCertificates);
      }
    })
    .catch(err => console.error('Fetch certs error:', err));
}

function renderCertificatesTable(certs) {
  const countEl = document.getElementById('certRegistryCount');
  if (countEl) countEl.innerText = certs.length;

  // Update Top Executive KPI Metrics
  const elTotal = document.getElementById('kpiTotalCerts');
  const elStudents = document.getElementById('kpiTotalStudents');
  const elUnlocked = document.getElementById('kpiUnlockedCerts');
  if (elTotal) elTotal.innerText = certs.length;
  if (elStudents) elStudents.innerText = new Set(certs.map(c => (c.email || '').toLowerCase().trim())).size;
  if (elUnlocked) elUnlocked.innerText = certs.filter(c => !c.paymentRequired || c.isPaid).length;

  const tbody = document.getElementById('certRegistryTableBody');
  tbody.innerHTML = '';

  if (certs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#94a3b8;">No certificates issued yet. Upload an Excel file above to generate certificates.</td></tr>`;
    return;
  }

  certs.forEach(c => {
    const tr = document.createElement('tr');

    const paymentStatusBadge = c.paymentRequired && !c.isPaid
      ? `<span class="mono-tag coral"><i class="fa-solid fa-lock"></i> Fee Required (₹${c.paymentAmount})</span>`
      : `<span class="mono-tag teal"><i class="fa-solid fa-lock-open"></i> Unlocked / Free</span>`;

    tr.innerHTML = `
      <td style="font-family:var(--font-mono); font-weight:700; color:var(--admin-teal);">${escapeHtml(c.id)}</td>
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td style="font-family:var(--font-mono); font-size:0.8rem;">${escapeHtml(c.email)}</td>
      <td>${escapeHtml(c.course)}</td>
      <td>${escapeHtml(c.issueDate)}</td>
      <td><strong>${escapeHtml(c.grade)}</strong></td>
      <td>
        ${paymentStatusBadge}
        <button onclick="togglePaymentStatus('${c.id}')" style="margin-left:6px; background:none; border:none; cursor:pointer; font-size:0.75rem; color:#64748b;" title="Toggle Paid Status">
          <i class="fa-solid fa-rotate"></i>
        </button>
      </td>
      <td style="text-align:right;">
        <div style="display:inline-flex; gap:6px;">
          <button onclick="previewCertificatePopup('${c.id}')" class="btn-ctrl btn-ctrl-outline" style="padding:4px 8px; font-size:0.78rem;" title="Preview Certificate">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button onclick="downloadSingleCertPng('${c.id}')" class="btn-ctrl btn-ctrl-outline" style="padding:4px 8px; font-size:0.78rem;" title="Download PNG">
            <i class="fa-solid fa-image"></i>
          </button>
          <button onclick="downloadSingleCertPdf('${c.id}')" class="btn-ctrl btn-ctrl-outline" style="padding:4px 8px; font-size:0.78rem;" title="Download PDF">
            <i class="fa-solid fa-file-pdf"></i>
          </button>
          <button onclick="deleteCertificate('${c.id}')" class="btn-ctrl btn-ctrl-outline" style="padding:4px 8px; font-size:0.78rem; color:var(--admin-coral);" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterCertTable() {
  const query = (document.getElementById('certSearchInput').value || '').toLowerCase().trim();
  const paymentFilter = document.getElementById('certFilterPayment').value;

  const filtered = globalCertificates.filter(c => {
    const matchesQuery = !query || 
      c.name.toLowerCase().includes(query) || 
      c.email.toLowerCase().includes(query) || 
      c.id.toLowerCase().includes(query) ||
      c.course.toLowerCase().includes(query);

    let matchesPayment = true;
    if (paymentFilter === 'unlocked') {
      matchesPayment = !c.paymentRequired || c.isPaid;
    } else if (paymentFilter === 'locked') {
      matchesPayment = c.paymentRequired && !c.isPaid;
    }

    return matchesQuery && matchesPayment;
  });

  renderCertificatesTable(filtered);
}

function togglePaymentStatus(certId) {
  fetch(`/api/admin/certificates/${certId}/toggle-payment`, { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fetchCertificatesRegistry();
      }
    });
}

function deleteCertificate(certId) {
  if (!confirm(`Are you sure you want to permanently delete certificate ${certId}?`)) return;

  fetch(`/api/admin/certificates/${certId}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fetchCertificatesRegistry();
      } else {
        alert(data.message);
      }
    });
}

function exportCertificatesToExcel() {
  if (globalCertificates.length === 0) {
    alert('No certificates available to export.');
    return;
  }

  const exportData = globalCertificates.map(c => ({
    "Certificate ID": c.id,
    "Student Name": c.name,
    "Email": c.email,
    "Course Track": c.course,
    "Start Date": c.startDate,
    "End Date": c.endDate,
    "Grade": c.grade,
    "Issue Date": c.issueDate,
    "Payment Required": c.paymentRequired ? "Yes" : "No",
    "Paid Status": c.isPaid ? "Paid / Unlocked" : "Locked (Fee Due)"
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(exportData);
  xlsx.utils.book_append_sheet(wb, ws, "Issued_Certificates");
  xlsx.writeFile(wb, `KiyoTak_Certificates_Registry_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ----------------------------------------------------
// CANVAS TEMPLATE RENDERING ENGINE & DOWNLOADS
// ----------------------------------------------------

function loadTemplateConfig() {
  fetch('/api/admin/template-config')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        templateConfig = data.config;
        syncSlidersFromConfig();
        loadTemplateImage(templateConfig.templateImage);
      }
    });
}

function loadTemplateImage(src) {
  templateImageObj.crossOrigin = "anonymous";
  templateImageObj.onload = () => {
    updateLiveCanvas();
  };
  templateImageObj.onerror = () => {
    // Built-in fallback
    console.warn('Template image load error, using default');
    templateImageObj.src = 'assets/images/certificate-template.png';
  };
  templateImageObj.src = src;
}

function syncSlidersFromConfig() {
  if (!templateConfig || !templateConfig.positions) return;
  const p = templateConfig.positions;

  if (p.name) {
    document.getElementById('slider_name_y').value = p.name.y;
    document.getElementById('slider_name_size').value = p.name.fontSize;
    document.getElementById('picker_name_color').value = p.name.color;
  }
  if (p.course) {
    document.getElementById('slider_course_y').value = p.course.y;
    document.getElementById('slider_course_size').value = p.course.fontSize;
    document.getElementById('picker_course_color').value = p.course.color;
  }
  if (p.date) {
    document.getElementById('slider_date_y').value = p.date.y;
    document.getElementById('slider_date_size').value = p.date.fontSize;
    document.getElementById('picker_date_color').value = p.date.color;
  }
  if (p.certId) {
    document.getElementById('slider_certId_x').value = p.certId.x;
    document.getElementById('slider_certId_y').value = p.certId.y;
  }
}

function updateLiveCanvas(sampleStudent) {
  const canvas = document.getElementById('certCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const width = 1200;
  const height = 850;
  canvas.width = width;
  canvas.height = height;

  // 1. Draw Template Image
  if (templateImageObj.complete && templateImageObj.naturalWidth > 0) {
    ctx.drawImage(templateImageObj, 0, 0, width, height);
  } else {
    // Fallback professional certificate canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#c59b27';
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, width - 40, height - 40);
  }

  // Get current slider values
  const nameYPercent = parseFloat(document.getElementById('slider_name_y').value);
  const nameSize = parseInt(document.getElementById('slider_name_size').value);
  const nameColor = document.getElementById('picker_name_color').value;

  const courseYPercent = parseFloat(document.getElementById('slider_course_y').value);
  const courseSize = parseInt(document.getElementById('slider_course_size').value);
  const courseColor = document.getElementById('picker_course_color').value;

  const dateYPercent = parseFloat(document.getElementById('slider_date_y').value);
  const dateSize = parseInt(document.getElementById('slider_date_size').value);
  const dateColor = document.getElementById('picker_date_color').value;

  const certIdXPercent = parseFloat(document.getElementById('slider_certId_x').value);
  const certIdYPercent = parseFloat(document.getElementById('slider_certId_y').value);

  // Update label indicators
  document.getElementById('val_name_y').innerText = `${nameYPercent}%`;
  document.getElementById('val_course_y').innerText = `${courseYPercent}%`;
  document.getElementById('val_date_y').innerText = `${dateYPercent}%`;
  document.getElementById('val_certId_pos').innerText = `${certIdXPercent}% / ${certIdYPercent}%`;

  const student = sampleStudent || {
    name: "KIRAN KUMAR M",
    course: "Full-Stack Software Development & Cloud Systems",
    startDate: "01/08/2026",
    endDate: "30/09/2026",
    grade: "A+ Outstanding",
    id: "KT-INT-2026-0001",
    issueDate: "10/10/2026"
  };

  ctx.textAlign = "center";

  // 1. Name
  ctx.font = `bold ${nameSize}px 'Playfair Display', serif`;
  ctx.fillStyle = nameColor;
  ctx.fillText(student.name, width * 0.5, height * (nameYPercent / 100));

  // 2. Course Body Paragraph
  ctx.font = `600 ${courseSize}px 'Inter', sans-serif`;
  ctx.fillStyle = courseColor;
  const courseText = `in recognition of their successful completion of the ${student.course} Internship Programme`;
  ctx.fillText(courseText, width * 0.5, height * (courseYPercent / 100));

  // 3. Date & Grade line
  ctx.font = `normal ${dateSize}px 'Inter', sans-serif`;
  ctx.fillStyle = dateColor;
  const dateText = `Conducted from ${student.startDate} to ${student.endDate} | Performance Grade: ${student.grade}`;
  ctx.fillText(dateText, width * 0.5, height * (dateYPercent / 100));

  // 4. Certificate ID Tag
  ctx.textAlign = "left";
  ctx.font = `bold 13px 'JetBrains Mono', monospace`;
  ctx.fillStyle = "#1e3a8a";
  ctx.fillText(`ID: ${student.id}`, width * (certIdXPercent / 100), height * (certIdYPercent / 100));
}

function saveTemplateConfigToServer() {
  const newPositions = {
    name: {
      x: 50,
      y: parseFloat(document.getElementById('slider_name_y').value),
      fontSize: parseInt(document.getElementById('slider_name_size').value),
      color: document.getElementById('picker_name_color').value
    },
    course: {
      x: 50,
      y: parseFloat(document.getElementById('slider_course_y').value),
      fontSize: parseInt(document.getElementById('slider_course_size').value),
      color: document.getElementById('picker_course_color').value
    },
    date: {
      x: 50,
      y: parseFloat(document.getElementById('slider_date_y').value),
      fontSize: parseInt(document.getElementById('slider_date_size').value),
      color: document.getElementById('picker_date_color').value
    },
    certId: {
      x: parseFloat(document.getElementById('slider_certId_x').value),
      y: parseFloat(document.getElementById('slider_certId_y').value),
      fontSize: 13,
      color: "#1e3a8a"
    }
  };

  fetch('/api/admin/template-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positions: newPositions })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert('Template configuration saved successfully! All generated and downloaded certificates will now use these exact positions.');
    }
  });
}

function resetTemplatePositions() {
  document.getElementById('slider_name_y').value = 46;
  document.getElementById('slider_name_size').value = 44;
  document.getElementById('picker_name_color').value = '#0d1b2a';

  document.getElementById('slider_course_y').value = 62.5;
  document.getElementById('slider_course_size').value = 17;
  document.getElementById('picker_course_color').value = '#2b2d42';

  document.getElementById('slider_date_y').value = 66;
  document.getElementById('slider_date_size').value = 15;
  document.getElementById('picker_date_color').value = '#4a4e69';

  document.getElementById('slider_certId_x').value = 91;
  document.getElementById('slider_certId_y').value = 94;

  updateLiveCanvas();
}

function handleTemplateImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('template', file);

  fetch('/api/admin/upload-template', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert('New template background uploaded successfully!');
      loadTemplateImage(data.templateImage);
    }
  });
}

function generateCertificateBlob(student) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');

    const render = () => {
      if (templateImageObj.complete && templateImageObj.naturalWidth > 0) {
        ctx.drawImage(templateImageObj, 0, 0, 1200, 850);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1200, 850);
      }

      const p = (templateConfig && templateConfig.positions) || {
        name: { y: 46, fontSize: 44, color: '#0d1b2a' },
        course: { y: 62.5, fontSize: 17, color: '#2b2d42' },
        date: { y: 66, fontSize: 15, color: '#4a4e69' },
        certId: { x: 91, y: 94 }
      };

      ctx.textAlign = "center";

      // Name
      ctx.font = `bold ${p.name.fontSize}px 'Playfair Display', serif`;
      ctx.fillStyle = p.name.color;
      ctx.fillText(student.name, 600, 850 * (p.name.y / 100));

      // Course text
      ctx.font = `600 ${p.course.fontSize}px 'Inter', sans-serif`;
      ctx.fillStyle = p.course.color;
      ctx.fillText(`in recognition of their successful completion of the ${student.course} Internship Programme`, 600, 850 * (p.course.y / 100));

      // Date line
      ctx.font = `normal ${p.date.fontSize}px 'Inter', sans-serif`;
      ctx.fillStyle = p.date.color;
      ctx.fillText(`Conducted from ${student.startDate} to ${student.endDate} | Performance Grade: ${student.grade}`, 600, 850 * (p.date.y / 100));

      // Cert ID
      ctx.textAlign = "left";
      ctx.font = `bold 13px 'JetBrains Mono', monospace`;
      ctx.fillStyle = "#1e3a8a";
      ctx.fillText(`ID: ${student.id}`, 1200 * (p.certId.x / 100), 850 * (p.certId.y / 100));

      canvas.toBlob((blob) => resolve(blob), 'image/png');
    };

    if (templateImageObj.complete) {
      render();
    } else {
      templateImageObj.onload = render;
    }
  });
}

function previewCertificatePopup(certId) {
  const cert = globalCertificates.find(c => c.id === certId);
  if (!cert) return;

  switchAdminTab('template-designer', document.querySelectorAll('.admin-nav-item')[1]);
  updateLiveCanvas(cert);
}

async function downloadSingleCertPng(certId) {
  const cert = globalCertificates.find(c => c.id === certId);
  if (!cert) return;

  const blob = await generateCertificateBlob(cert);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cert.id}_${cert.name.replace(/\s+/g, '_')}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadSingleCertPdf(certId) {
  const cert = globalCertificates.find(c => c.id === certId);
  if (!cert) return;

  const blob = await generateCertificateBlob(cert);
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = () => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1200, 850] });
    pdf.addImage(reader.result, 'PNG', 0, 0, 1200, 850);
    pdf.save(`${cert.id}_${cert.name.replace(/\s+/g, '_')}.pdf`);
  };
}

async function downloadAllCertificatesZip() {
  if (globalCertificates.length === 0) {
    alert('No certificates issued yet to download.');
    return;
  }

  const btn = document.getElementById('btnDownloadAllZip');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Bundling ${globalCertificates.length} Certificates in ZIP...`;

  const zip = new JSZip();

  for (let i = 0; i < globalCertificates.length; i++) {
    const cert = globalCertificates[i];
    const blob = await generateCertificateBlob(cert);
    zip.file(`${cert.id}_${cert.name.replace(/\s+/g, '_')}.png`, blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = `KiyoTak_Internship_Certificates_${new Date().toISOString().split('T')[0]}.zip`;
  a.click();

  btn.disabled = false;
  btn.innerHTML = `<i class="fa-solid fa-file-zipper"></i> Download All as ZIP`;
}

// ----------------------------------------------------
// REVIEWS & MODERATION
// ----------------------------------------------------

function fetchAdminReviews() {
  fetch('/api/admin/reviews/all')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        renderAdminReviewsTable(data.reviews);
      }
    });
}

function renderAdminReviewsTable(reviews) {
  const elPending = document.getElementById('kpiPendingReviews');
  if (elPending) elPending.innerText = reviews.filter(r => r.status === 'pending').length;

  const tbody = document.getElementById('reviewsTableBody');
  tbody.innerHTML = '';

  if (reviews.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">No reviews yet.</td></tr>`;
    return;
  }

  reviews.forEach(r => {
    const tr = document.createElement('tr');
    let statusBadge = '<span class="mono-tag" style="background:#fef3c7; color:#b45309;">PENDING</span>';
    if (r.status === 'approved') statusBadge = '<span class="mono-tag teal"><i class="fa-solid fa-check"></i> APPROVED</span>';
    if (r.status === 'hidden') statusBadge = '<span class="mono-tag coral"><i class="fa-solid fa-eye-slash"></i> HIDDEN</span>';

    tr.innerHTML = `
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td style="color:#eab308;">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</td>
      <td>${escapeHtml(r.course || 'General')}</td>
      <td style="font-size:0.85rem; max-width:320px;">"${escapeHtml(r.comment)}"</td>
      <td>${escapeHtml(r.date || '')}</td>
      <td>${statusBadge}</td>
      <td style="text-align:right;">
        <div style="display:inline-flex; gap:6px;">
          ${r.status !== 'approved' ? `<button onclick="updateReviewStatus('${r.id}', 'approved')" class="btn-ctrl btn-ctrl-teal" style="padding:4px 8px; font-size:0.75rem;">Approve</button>` : ''}
          ${r.status === 'approved' ? `<button onclick="updateReviewStatus('${r.id}', 'hidden')" class="btn-ctrl btn-ctrl-outline" style="padding:4px 8px; font-size:0.75rem;">Hide</button>` : ''}
          <button onclick="updateReviewStatus('${r.id}', 'delete')" class="btn-ctrl btn-ctrl-outline" style="padding:4px 8px; font-size:0.75rem; color:var(--admin-coral);">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateReviewStatus(reviewId, status) {
  fetch(`/api/admin/reviews/${reviewId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      fetchAdminReviews();
    }
  });
}

function openAddReviewModal() {
  document.getElementById('addReviewModal').style.display = 'flex';
}

function closeAddReviewModal() {
  document.getElementById('addReviewModal').style.display = 'none';
}

function handleManualReviewSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('manRevName').value;
  const rating = document.getElementById('manRevRating').value;
  const course = document.getElementById('manRevCourse').value;
  const comment = document.getElementById('manRevComment').value;

  fetch('/api/admin/reviews/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, rating, course, comment, status: 'approved' })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      closeAddReviewModal();
      fetchAdminReviews();
    }
  });
}

// ----------------------------------------------------
// INQUIRIES & APPLICATIONS
// ----------------------------------------------------

function fetchAdminApplications() {
  fetch('/api/admin/applications')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        document.getElementById('appCountTag').innerText = `${data.applications.length} Total Inquiries`;
        const tbody = document.getElementById('applicationsTableBody');
        tbody.innerHTML = '';

        if (data.applications.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">No applications received yet.</td></tr>`;
          return;
        }

        data.applications.forEach(a => {
          const tr = document.createElement('tr');
          const dateStr = a.timestamp ? new Date(a.timestamp).toLocaleDateString() : 'Recent';
          tr.innerHTML = `
            <td>${dateStr}</td>
            <td><strong>${escapeHtml(a.name)}</strong></td>
            <td><a href="tel:${a.phone}" style="color:var(--admin-teal);">${escapeHtml(a.phone)}</a></td>
            <td style="font-family:var(--font-mono); font-size:0.8rem;"><a href="mailto:${a.email}">${escapeHtml(a.email)}</a></td>
            <td>${escapeHtml(a.location || 'India')}</td>
            <td><span class="mono-tag">${escapeHtml(a.course || 'Mentorship')}</span></td>
            <td style="font-size:0.82rem; max-width:250px;">${escapeHtml(a.message || 'No message')}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
