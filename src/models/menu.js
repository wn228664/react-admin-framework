import { menuRoutes } from '@/config/routes';

export default {
  namespace: 'menu',
  state: { routes: menuRoutes },
  reducers: {
    setRoutes(state, { payload }) {
      return { ...state, routes: payload };
    },
  },
};
