import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ISSUE_TYPES = [
  'Bug Report',
  'Account Issue',
  'Prediction Error',
  'General Question',
];

const UPLOAD_TYPES = new Set([
  'Bug Report',
  'Prediction Error',
  'Account Issue',
]);

const MAX_FILE_MB = 5;
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'application/pdf'];
const ALLOWED_LABEL = 'PNG, JPG, or PDF';

export default function Support() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    issueType: 'Bug Report',
    description: '',
  });

  const [attachment, setAttachment] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.nickname || user.name || '',
      }));
    }
  }, [user]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'issueType' && !UPLOAD_TYPES.has(value)) {
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      setAttachment({
        file: null,
        preview: null,
        error: `Unsupported file type. Please upload a ${ALLOWED_LABEL}.`,
      });
      return;
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setAttachment({
        file: null,
        preview: null,
        error: `File is too large. Maximum size is ${MAX_FILE_MB} MB.`,
      });
      return;
    }

    const preview = file.type.startsWith('image/')
      ? window.URL.createObjectURL(file)
      : null;
    setAttachment({ file, preview, error: null });
  }

  function removeAttachment() {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function validateForm() {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Please enter your name.';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Please describe the issue.';
    }

    return newErrors;
  }

  function handleSubmit(e) {
    e.preventDefault();

    const validationErrors = validateForm();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const ticket = {
      userId: user?.id ?? null,
      name: formData.name.trim(),
      email: user?.email ?? null,
      issueType: formData.issueType,
      description: formData.description.trim(),
      attachment: attachment?.file ?? null,
      createdAt: new Date().toISOString(),
    };

    console.log('Support ticket ready for submission:', ticket);

    setSubmitted(true);
    setErrors({});
  }

  const showUploadSection = UPLOAD_TYPES.has(formData.issueType);

  return (
    <main className="mx-auto w-full max-w-3xl">
      <div className="rounded-2xl border border-sb-blue/30 bg-sb-nav p-8 shadow-lg">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-sb-text">Support</h1>
          <p className="mt-2 text-sb-text">
            Submit a support ticket if you run into an issue or need help using
            the app.
          </p>
        </header>

        {submitted && (
          <div className="mb-6 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-green-300">
            Your support ticket was submitted successfully. We'll be in touch
            soon.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-2 block font-medium text-sb-text"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-sb-blue/30 bg-sb-bg px-4 py-3 text-sb-text outline-none transition focus:border-sb-blue"
              placeholder="Enter your name"
            />
            {errors.name && (
              <p className="mt-2 text-sm text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Email — read-only, sourced from auth */}
          {user?.email && (
            <div>
              <label className="mb-2 block font-medium text-sb-text">
                Email
              </label>
              <div className="flex items-center gap-3 rounded-lg border border-sb-blue/15 bg-sb-bg px-4 py-3">
                <span className="flex-1 text-sb-text">{user.email}</span>
                <span className="rounded-full border border-sb-blue/30 px-2 py-0.5 text-xs text-sb-muted">
                  from your account
                </span>
              </div>
              <p className="mt-1.5 text-xs text-sb-muted">
                Replies will be sent to this address. To change it, update your
                account settings.
              </p>
            </div>
          )}

          {/* Issue Type */}
          <div>
            <label
              htmlFor="issueType"
              className="mb-2 block font-medium text-sb-text"
            >
              Issue Type
            </label>
            <div className="relative">
              <select
                id="issueType"
                name="issueType"
                value={formData.issueType}
                onChange={handleChange}
                className="w-full appearance-none rounded-lg border border-sb-blue/30 bg-sb-bg px-4 py-3 text-sb-text outline-none transition focus:border-sb-blue"
              >
                {ISSUE_TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                    className="bg-sb-nav text-sb-text"
                  >
                    {type}
                  </option>
                ))}
              </select>
              {/* Custom dropdown arrow — visible on dark backgrounds */}
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sb-muted">
                ▾
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="mb-2 block font-medium text-sb-text"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows="5"
              value={formData.description}
              onChange={handleChange}
              className="w-full rounded-lg border border-sb-blue/30 bg-sb-bg px-4 py-3 text-sb-text outline-none transition focus:border-sb-blue"
              placeholder="Describe the issue..."
            />
            {errors.description && (
              <p className="mt-2 text-sm text-red-400">{errors.description}</p>
            )}
          </div>

          {/* Attachment — only for Bug Report / Prediction Error / Account Issue */}
          {showUploadSection && (
            <div>
              <label className="mb-2 block font-medium text-sb-text">
                Attach Screenshot or File{' '}
                <span className="text-sb-muted font-normal">(optional)</span>
              </label>

              {!attachment?.file ? (
                <label
                  htmlFor="attachment"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-sb-blue/30 bg-sb-bg px-4 py-8 text-center transition hover:border-sb-blue"
                >
                  <span className="text-2xl">📎</span>
                  <span className="text-sm text-sb-text">
                    Click to upload a screenshot or file
                  </span>
                  <span className="text-xs text-sb-muted">
                    {ALLOWED_LABEL} · Max {MAX_FILE_MB} MB
                  </span>
                  <input
                    id="attachment"
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
              ) : (
                <div className="rounded-lg border border-sb-blue/30 bg-sb-bg p-4">
                  <div className="flex items-start gap-4">
                    {/* Image preview or PDF icon */}
                    {attachment.preview ? (
                      <img
                        src={attachment.preview}
                        alt="Attachment preview"
                        className="h-20 w-20 rounded-md object-cover border border-sb-blue/20 flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-md border border-sb-blue/20 bg-sb-nav text-3xl">
                        📄
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-sb-text">
                        {attachment.file.name}
                      </p>
                      <p className="text-xs text-sb-muted mt-0.5">
                        {(attachment.file.size / 1024).toFixed(0)} KB ·{' '}
                        {attachment.file.type}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeAttachment}
                      className="flex-shrink-0 text-sb-muted hover:text-red-400 transition-colors text-lg leading-none"
                      aria-label="Remove attachment"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {attachment?.error && (
                <p className="mt-2 text-sm text-red-400">{attachment.error}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="rounded-lg bg-sb-blue px-5 py-3 font-semibold text-sb-nav transition hover:bg-sb-blue-light"
          >
            Submit Ticket
          </button>
        </form>
      </div>
    </main>
  );
}
