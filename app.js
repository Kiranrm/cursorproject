/**
 * Lead Management Tool - Application Logic
 * Handles CRUD, search, filter, validation, and LocalStorage persistence.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'leadManagementLeads';

  // DOM elements
  const leadForm = document.getElementById('lead-form');
  const leadIdInput = document.getElementById('lead-id');
  const leadNameInput = document.getElementById('lead-name');
  const leadPhoneInput = document.getElementById('lead-phone');
  const leadSourceSelect = document.getElementById('lead-source');
  const leadStatusSelect = document.getElementById('lead-status');
  const formTitle = document.getElementById('form-title');
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const leadsTbody = document.getElementById('leads-tbody');
  const leadsEmpty = document.getElementById('leads-empty');
  const leadsTableWrap = document.getElementById('leads-table-wrap');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalMessage = document.getElementById('modal-message');
  const modalCancel = document.getElementById('modal-cancel');
  const modalConfirm = document.getElementById('modal-confirm');

  const errorElements = {
    name: document.getElementById('name-error'),
    phone: document.getElementById('phone-error'),
    source: document.getElementById('source-error'),
    status: document.getElementById('status-error')
  };

  /**
   * Load leads from LocalStorage.
   * @returns {Array<{id: string, name: string, phone: string, source: string, status: string}>}
   */
  function getLeads() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading leads from LocalStorage:', e);
      return [];
    }
  }

  /**
   * Save leads to LocalStorage.
   * @param {Array} leads - Array of lead objects
   */
  function saveLeads(leads) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch (e) {
      console.error('Error saving leads to LocalStorage:', e);
    }
  }

  /**
   * Generate a unique ID for a new lead.
   * @returns {string}
   */
  function generateId() {
    return 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  /**
   * Validate name: non-empty, trimmed, max length.
   * @param {string} value
   * @returns {{ valid: boolean, message: string }}
   */
  function validateName(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return { valid: false, message: 'Name is required.' };
    if (trimmed.length > 100) return { valid: false, message: 'Name must be 100 characters or less.' };
    return { valid: true, message: '' };
  }

  /**
   * Validate phone: non-empty, allows digits, spaces, dashes, parentheses, plus.
   * @param {string} value
   * @returns {{ valid: boolean, message: string }}
   */
  function validatePhone(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return { valid: false, message: 'Phone number is required.' };
    const phoneRegex = /^[\d\s\-\(\)\+\.]{7,20}$/;
    if (!phoneRegex.test(trimmed)) {
      return { valid: false, message: 'Enter a valid phone number (7–20 digits/symbols).' };
    }
    return { valid: true, message: '' };
  }

  /**
   * Validate source: must be a selected option.
   * @param {string} value
   * @returns {{ valid: boolean, message: string }}
   */
  function validateSource(value) {
    if (!value || !value.trim()) return { valid: false, message: 'Please select a source.' };
    return { valid: true, message: '' };
  }

  /**
   * Validate status: must be a selected option.
   * @param {string} value
   * @returns {{ valid: boolean, message: string }}
   */
  function validateStatus(value) {
    if (!value || !value.trim()) return { valid: false, message: 'Please select a status.' };
    return { valid: true, message: '' };
  }

  /**
   * Run all validations and show errors on form.
   * @returns {boolean} - true if form is valid
   */
  function validateForm() {
    const nameResult = validateName(leadNameInput.value);
    const phoneResult = validatePhone(leadPhoneInput.value);
    const sourceResult = validateSource(leadSourceSelect.value);
    const statusResult = validateStatus(leadStatusSelect.value);

    setFieldError('name', nameResult.message);
    setFieldError('phone', phoneResult.message);
    setFieldError('source', sourceResult.message);
    setFieldError('status', statusResult.message);

    toggleInvalidClass(leadNameInput, !nameResult.valid);
    toggleInvalidClass(leadPhoneInput, !phoneResult.valid);
    toggleInvalidClass(leadSourceSelect, !sourceResult.valid);
    toggleInvalidClass(leadStatusSelect, !statusResult.valid);

    return nameResult.valid && phoneResult.valid && sourceResult.valid && statusResult.valid;
  }

  function setFieldError(field, message) {
    const el = errorElements[field];
    if (el) el.textContent = message || '';
  }

  function toggleInvalidClass(el, add) {
    if (!el) return;
    if (add) el.classList.add('invalid');
    else el.classList.remove('invalid');
  }

  /**
   * Clear validation state from form fields.
   */
  function clearValidation() {
    Object.keys(errorElements).forEach(function (key) {
      if (errorElements[key]) errorElements[key].textContent = '';
    });
    [leadNameInput, leadPhoneInput, leadSourceSelect, leadStatusSelect].forEach(function (input) {
      if (input) input.classList.remove('invalid');
    });
  }

  /**
   * Reset form to add mode and clear fields.
   */
  function resetForm() {
    leadIdInput.value = '';
    leadNameInput.value = '';
    leadPhoneInput.value = '';
    leadSourceSelect.value = '';
    leadStatusSelect.value = '';
    formTitle.textContent = 'Add New Lead';
    submitBtn.textContent = 'Add Lead';
    cancelBtn.style.display = 'none';
    clearValidation();
  }

  /**
   * Get current search and status filter values.
   */
  function getFilters() {
    return {
      search: (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '',
      status: (statusFilter && statusFilter.value) ? statusFilter.value.trim() : ''
    };
  }

  /**
   * Filter leads by search (name, phone) and status.
   * @param {Array} leads
   * @param {{ search: string, status: string }} filters
   * @returns {Array}
   */
  function filterLeads(leads, filters) {
    return leads.filter(function (lead) {
      const matchesSearch = !filters.search ||
        (lead.name && lead.name.toLowerCase().includes(filters.search)) ||
        (lead.phone && lead.phone.toLowerCase().includes(filters.search));
      const matchesStatus = !filters.status || lead.status === filters.status;
      return matchesSearch && matchesStatus;
    });
  }

  /**
   * Render leads table (or empty state).
   */
  function renderLeads() {
    const leads = getLeads();
    const filters = getFilters();
    const filtered = filterLeads(leads, filters);

    if (filtered.length === 0) {
      leadsEmpty.style.display = 'block';
      leadsTableWrap.style.display = 'none';
      return;
    }

    leadsEmpty.style.display = 'none';
    leadsTableWrap.style.display = 'block';

    leadsTbody.innerHTML = filtered.map(function (lead) {
      const statusClass = lead.status ? 'status-' + lead.status.replace(/\s/g, '') : '';
      const statusDisplay = lead.status || '—';
      return (
        '<tr data-id="' + escapeHtml(lead.id) + '">' +
          '<td>' + escapeHtml(lead.name || '—') + '</td>' +
          '<td>' + escapeHtml(lead.phone || '—') + '</td>' +
          '<td>' + escapeHtml(lead.source || '—') + '</td>' +
          '<td><span class="status-badge ' + statusClass + '">' + escapeHtml(statusDisplay) + '</span></td>' +
          '<td class="actions-cell">' +
            '<button type="button" class="btn btn-secondary btn-sm btn-edit" data-id="' + escapeHtml(lead.id) + '">Edit</button>' +
            '<button type="button" class="btn btn-danger btn-sm btn-delete" data-id="' + escapeHtml(lead.id) + '">Delete</button>' +
          '</td>' +
        '</tr>'
      );
    }).join('');

    // Delegate edit/delete to tbody
    leadsTbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', handleEditClick);
    });
    leadsTbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', handleDeleteClick);
    });
  }

  function escapeHtml(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function handleEditClick(e) {
    var id = e.target.getAttribute('data-id');
    if (!id) return;
    var leads = getLeads();
    var lead = leads.find(function (l) { return l.id === id; });
    if (!lead) return;
    leadIdInput.value = lead.id;
    leadNameInput.value = lead.name || '';
    leadPhoneInput.value = lead.phone || '';
    leadSourceSelect.value = lead.source || '';
    leadStatusSelect.value = lead.status || '';
    formTitle.textContent = 'Edit Lead';
    submitBtn.textContent = 'Update Lead';
    cancelBtn.style.display = 'inline-flex';
    clearValidation();
  }

  var deleteTargetId = null;

  function handleDeleteClick(e) {
    var id = e.target.getAttribute('data-id');
    if (!id) return;
    deleteTargetId = id;
    if (modalMessage) modalMessage.textContent = 'Are you sure you want to delete this lead?';
    showModal(true);
  }

  function showModal(show) {
    if (!modalOverlay) return;
    modalOverlay.classList.toggle('visible', !!show);
    modalOverlay.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function confirmDelete() {
    if (!deleteTargetId) {
      showModal(false);
      return;
    }
    var leads = getLeads().filter(function (l) { return l.id !== deleteTargetId; });
    saveLeads(leads);
    deleteTargetId = null;
    showModal(false);
    resetForm();
    renderLeads();
  }

  function cancelModal() {
    deleteTargetId = null;
    showModal(false);
  }

  /**
   * Submit form: add or update lead.
   */
  function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    var id = leadIdInput.value.trim();
    var leads = getLeads();
    var payload = {
      name: leadNameInput.value.trim(),
      phone: leadPhoneInput.value.trim(),
      source: leadSourceSelect.value.trim(),
      status: leadStatusSelect.value.trim()
    };

    if (id) {
      var index = leads.findIndex(function (l) { return l.id === id; });
      if (index !== -1) {
        leads[index] = { id: id, name: payload.name, phone: payload.phone, source: payload.source, status: payload.status };
        saveLeads(leads);
      }
    } else {
      payload.id = generateId();
      leads.push(payload);
      saveLeads(leads);
    }

    resetForm();
    renderLeads();
  }

  function handleCancelEdit() {
    resetForm();
  }

  function handleSearchOrFilter() {
    renderLeads();
  }

  // Event listeners
  if (leadForm) leadForm.addEventListener('submit', handleFormSubmit);
  if (cancelBtn) cancelBtn.addEventListener('click', handleCancelEdit);
  if (searchInput) searchInput.addEventListener('input', handleSearchOrFilter);
  if (searchInput) searchInput.addEventListener('search', handleSearchOrFilter);
  if (statusFilter) statusFilter.addEventListener('change', handleSearchOrFilter);
  if (modalCancel) modalCancel.addEventListener('click', cancelModal);
  if (modalConfirm) modalConfirm.addEventListener('click', confirmDelete);

  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) cancelModal();
  });

  // Initial render
  renderLeads();
})();
