export function setupContactForm(form) {
  if (!form) return;
  const status = form.querySelector('#form-status');
  const button = form.querySelector('[type="submit"]');
  const secureSubmit = form.querySelector('#secure-submit');
  let sending = false;
  let nativeSubmission = false;
  const configured = () => /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(form.action);
  const feedback = (message, state) => {
    status.textContent = message;
    status.dataset.state = state;
  };
  const validate = () => {
    for (const name of ['name', 'message']) {
      const field = form.elements.namedItem(name);
      field.setCustomValidity(field.value.trim() ? '' : 'Please fill in this field.');
    }
    return form.reportValidity();
  };
  for (const name of ['name', 'message']) {
    const field = form.elements.namedItem(name);
    field.addEventListener('input', () => field.setCustomValidity(field.value.trim() ? '' : 'Please fill in this field.'));
  }
  // Native POST supports Formspree's hosted spam challenge and no-JavaScript use.
  secureSubmit.addEventListener('click', () => {
    if (!configured() || sending || !validate() || form.elements.namedItem('_gotcha').value) return;
    nativeSubmission = true;
    form.requestSubmit();
    nativeSubmission = false;
  });
  form.addEventListener('submit', async (event) => {
    if (nativeSubmission && configured()) return;
    event.preventDefault();
    if (sending) return;
    if (!configured()) {
      feedback('The contact form is unavailable. Please check back soon.', 'error');
      return;
    }
    if (!validate() || form.elements.namedItem('_gotcha').value) return;
    const body = new FormData(form);
    sending = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    secureSubmit.hidden = true;
    form.setAttribute('aria-busy', 'true');
    feedback('Sending your message…', 'sending');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(form.action, {
        method: 'POST', headers: { Accept: 'application/json' }, body, signal: controller.signal,
      });
      if (!response.ok) {
        feedback(response.status === 429
          ? 'Too many attempts. Please wait a few minutes before trying again.'
          : 'Your message could not be sent. Please try again, or continue with secure submission to complete any verification.', 'error');
        secureSubmit.hidden = response.status === 429;
        return;
      }
      form.reset();
      feedback('Thank you — your message has been sent. I’ll get back to you shortly.', 'success');
    } catch {
      feedback('Delivery could not be confirmed. Your message is still here. Check your connection before trying again; retrying may send a duplicate.', 'error');
      secureSubmit.hidden = false;
    } finally {
      clearTimeout(timeout);
      sending = false;
      button.disabled = false;
      button.textContent = 'Send message';
      form.removeAttribute('aria-busy');
    }
  });
}
