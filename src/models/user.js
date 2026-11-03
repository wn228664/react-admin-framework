export default {
  namespace: 'user',
  state: { permissions: [], roles: [] },
  reducers: {
    setAccess(state, { payload }) {
      return { ...state, permissions: payload.permissions || [], roles: payload.roles || [] };
    },
    clearAccess() {
      return { permissions: [], roles: [] };
    },
  },
};
