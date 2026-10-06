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
