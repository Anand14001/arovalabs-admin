/*
 * Catalogue API calls and query keys.
 *
 * Keys live here next to the calls that use them so an invalidation after a
 * mutation cannot drift from the key the list was fetched under — the usual way
 * a saved change fails to appear until a refresh.
 */

import { api } from './api';

const qs = (params) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '') search.set(k, v);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
};

export const keys = {
  products: (params) => ['products', params],
  product: (id) => ['product', id],
  categories: () => ['categories'],
  tags: () => ['tags'],
  media: (params) => ['media', params],
};

export const products = {
  list: (params) => api.get(`/admin/products${qs(params)}`),
  get: (id) => api.get(`/admin/products/${id}`),
  create: (body) => api.post('/admin/products', body),
  update: (id, body) => api.patch(`/admin/products/${id}`, body),
  setStatus: (id, status) => api.patch(`/admin/products/${id}/status`, { status }),
  duplicate: (id) => api.post(`/admin/products/${id}/duplicate`),
  remove: (id) => api.del(`/admin/products/${id}`),
  reorder: (ids) => api.post('/admin/products/reorder', { ids }),
  bulk: (ids, action) => api.post('/admin/products/bulk', { ids, action }),
};

export const categories = {
  list: () => api.get('/admin/categories'),
  create: (body) => api.post('/admin/categories', body),
  update: (id, body) => api.patch(`/admin/categories/${id}`, body),
  remove: (id) => api.del(`/admin/categories/${id}`),
  reorder: (items) => api.post('/admin/categories/reorder', { items }),
};

export const tags = {
  list: () => api.get('/admin/tags'),
  create: (body) => api.post('/admin/tags', body),
  update: (id, body) => api.patch(`/admin/tags/${id}`, body),
  remove: (id) => api.del(`/admin/tags/${id}`),
};

export const media = {
  list: (params) => api.get(`/admin/media${qs(params)}`),
  update: (id, body) => api.patch(`/admin/media/${id}`, body),
  remove: (id) => api.del(`/admin/media/${id}`),
  upload: (files, { kind = 'PRODUCT_IMAGE' } = {}) => {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    form.append('kind', kind);
    // No Content-Type header: the browser must set it, because it alone knows
    // the multipart boundary.
    return api.post('/admin/media', form);
  },
};

/** Flatten the category tree for a <select>, indented by depth. */
export const flattenCategories = (nodes, depth = 0) =>
  (nodes ?? []).flatMap((n) => [
    { ...n, depth, label: `${'— '.repeat(depth)}${n.name}` },
    ...flattenCategories(n.children, depth + 1),
  ]);

export const formatPaise = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format((paise ?? 0) / 100);

// ------------------------------------------------------------------ orders

export const orderKeys = {
  list: (params) => ['orders', params],
  counts: () => ['order-counts'],
  one: (id) => ['order', id],
};

export const orders = {
  list: (params) => api.get(`/admin/orders${qs(params)}`),
  counts: () => api.get('/admin/orders/counts'),
  get: (id) => api.get(`/admin/orders/${id}`),
  setStatus: (id, status, note) =>
    api.patch(`/admin/orders/${id}/status`, { status, note: note || null }),
  reschedule: (id, date, windowId, note) =>
    api.patch(`/admin/orders/${id}/slot`, { date, windowId, note: note || null }),
  setNotes: (id, internalNotes) =>
    api.patch(`/admin/orders/${id}/notes`, { internalNotes: internalNotes || null }),
  cancel: (id, reason) => api.post(`/admin/orders/${id}/cancel`, { reason }),
  refund: (id, amount, reason) =>
    api.post(`/admin/orders/${id}/refund`, { amount: amount ?? null, reason: reason || null }),
  resendConfirmation: (id) => api.post(`/admin/orders/${id}/resend-confirmation`),
  exportUrl: (params) => `/admin/orders/export${qs(params)}`,
};

/** Collection windows, for the reschedule dialog. */
export const collectionOptions = (date) =>
  api.get(`/collection-options${date ? `?date=${encodeURIComponent(date)}` : ''}`, {
    auth: false,
  });

/*
 * Status presentation, in one place.
 *
 * The same label and tone everywhere: a queue tab, a table cell and a timeline
 * entry should never describe the same state differently.
 */
export const ORDER_STATUS = {
  PENDING_PAYMENT: { label: 'Awaiting payment', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'brand' },
  SCHEDULED: { label: 'Scheduled', tone: 'brand' },
  SAMPLE_COLLECTED: { label: 'Sample collected', tone: 'brand' },
  IN_LAB: { label: 'In the lab', tone: 'brand' },
  REPORT_READY: { label: 'Report ready', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
};

export const PAYMENT_STATUS = {
  UNPAID: { label: 'Unpaid', tone: 'warning' },
  PENDING: { label: 'Pending', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  PARTIALLY_REFUNDED: { label: 'Part refunded', tone: 'warning' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
  FAILED: { label: 'Failed', tone: 'danger' },
};

// -------------------------------------------------- prescriptions & reports

export const fileKeys = {
  prescriptions: (params) => ['prescriptions', params],
  prescriptionCounts: () => ['prescription-counts'],
  reports: (params) => ['reports', params],
  awaiting: () => ['reports-awaiting'],
};

export const prescriptions = {
  list: (params) => api.get(`/admin/prescriptions${qs(params)}`),
  counts: () => api.get('/admin/prescriptions/counts'),
  get: (id) => api.get(`/admin/prescriptions/${id}`),
  update: (id, body) => api.patch(`/admin/prescriptions/${id}`, body),
  linkOrder: (id, orderNumber) =>
    api.post(`/admin/prescriptions/${id}/link-order`, { orderNumber }),
  downloadPath: (id) => `/admin/prescriptions/${id}/download`,
};

export const reports = {
  list: (params) => api.get(`/admin/reports${qs(params)}`),
  awaiting: () => api.get('/admin/reports/awaiting'),
  get: (id) => api.get(`/admin/reports/${id}`),
  publish: (id) => api.post(`/admin/reports/${id}/publish`),
  withdraw: (id, reason) => api.post(`/admin/reports/${id}/withdraw`, { reason }),
  notify: (id) => api.post(`/admin/reports/${id}/notify`),
  shareLink: (id) => api.get(`/admin/reports/${id}/share-link`),
  remove: (id) => api.del(`/admin/reports/${id}`),
  downloadPath: (id) => `/admin/reports/${id}/download`,
  upload: (orderId, files, { title, orderPatientId, orderItemId } = {}) => {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    if (title) form.append('title', title);
    if (orderPatientId) form.append('orderPatientId', String(orderPatientId));
    if (orderItemId) form.append('orderItemId', String(orderItemId));
    return api.post(`/admin/reports/orders/${orderId}`, form);
  },
};

export const PRESCRIPTION_STATUS = {
  RECEIVED: { label: 'New', tone: 'warning' },
  REVIEWED: { label: 'Reviewed', tone: 'brand' },
  QUOTED: { label: 'Quoted', tone: 'brand' },
  CONVERTED: { label: 'Booked', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'neutral' },
};

export const REPORT_STATUS = {
  PENDING: { label: 'Pending', tone: 'neutral' },
  UPLOADED: { label: 'Not sent', tone: 'warning' },
  PUBLISHED: { label: 'Published', tone: 'success' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'danger' },
};

/*
 * Private files are fetched, not linked.
 *
 * The access token lives in memory, so a plain href arrives without it and gets
 * a 401. This pulls the bytes with the header attached and hands the browser a
 * blob to save — which also means the file never becomes a URL anyone can share.
 */
export async function downloadPrivateFile(path, filename) {
  const { BASE_URL, getAccessToken } = await import('./api');
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Download failed (${res.status}).`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? 'download';
  a.click();
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------------------- content

export const contentKeys = {
  posts: (params) => ['posts', params],
  post: (id) => ['post', id],
  revisions: (kind, id) => ['revisions', kind, id],
  pages: () => ['pages'],
  page: (id) => ['page', id],
  sectionTypes: () => ['section-types'],
  blocks: () => ['content-blocks'],
  redirects: () => ['redirects'],
  blogCategories: () => ['blog-categories'],
};

export const content = {
  // blog
  listPosts: (params) => api.get(`/admin/content/posts${qs(params)}`),
  getPost: (id) => api.get(`/admin/content/posts/${id}`),
  createPost: (body) => api.post('/admin/content/posts', body),
  updatePost: (id, body) => api.patch(`/admin/content/posts/${id}`, body),
  deletePost: (id) => api.del(`/admin/content/posts/${id}`),
  postRevisions: (id) => api.get(`/admin/content/posts/${id}/revisions`),
  restorePost: (id, revisionId) =>
    api.post(`/admin/content/posts/${id}/revisions/${revisionId}/restore`),
  blogCategories: () => api.get('/admin/content/blog-categories'),
  createBlogCategory: (body) => api.post('/admin/content/blog-categories', body),

  // pages and sections
  listPages: () => api.get('/admin/content/pages'),
  getPage: (id) => api.get(`/admin/content/pages/${id}`),
  updatePage: (id, body) => api.patch(`/admin/content/pages/${id}`, body),
  sectionTypes: () => api.get('/admin/content/section-types'),
  createSection: (pageId, body) => api.post(`/admin/content/pages/${pageId}/sections`, body),
  updateSection: (id, body) => api.patch(`/admin/content/sections/${id}`, body),
  deleteSection: (id) => api.del(`/admin/content/sections/${id}`),
  reorderSections: (pageId, ids) =>
    api.post(`/admin/content/pages/${pageId}/sections/reorder`, { ids }),
  sectionRevisions: (id) => api.get(`/admin/content/sections/${id}/revisions`),
  restoreSection: (id, revisionId) =>
    api.post(`/admin/content/sections/${id}/revisions/${revisionId}/restore`),

  // shared blocks
  blocks: () => api.get('/admin/content/blocks'),
  createTestimonial: (body) => api.post('/admin/content/testimonials', body),
  updateTestimonial: (id, body) => api.patch(`/admin/content/testimonials/${id}`, body),
  deleteTestimonial: (id) => api.del(`/admin/content/testimonials/${id}`),
  createFaq: (body) => api.post('/admin/content/faqs', body),
  updateFaq: (id, body) => api.patch(`/admin/content/faqs/${id}`, body),
  deleteFaq: (id) => api.del(`/admin/content/faqs/${id}`),

  // navigation and redirects
  saveNav: (menu, items) => api.put(`/admin/content/nav/${menu}`, { items }),
  redirects: () => api.get('/admin/content/redirects'),
  createRedirect: (body) => api.post('/admin/content/redirects', body),
  deleteRedirect: (id) => api.del(`/admin/content/redirects/${id}`),
};

export const CONTENT_STATUS = {
  DRAFT: { label: 'Draft', tone: 'warning' },
  SCHEDULED: { label: 'Scheduled', tone: 'brand' },
  PUBLISHED: { label: 'Published', tone: 'success' },
  ARCHIVED: { label: 'Archived', tone: 'neutral' },
};
