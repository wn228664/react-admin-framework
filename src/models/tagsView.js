/**
 * @file src/models/tagsView.js
 * @description 标签页导航的状态管理，维护已访问页面的标签列表和缓存，支持标签的增删和持久化存储
 */
import { ensureArray, ensureString } from '@/utils/robust';
import {
  buildVisitedViewsAfterDelete,
  clearTagsViewStateFromStorage,
  loadTagsViewStateFromStorage,
  normalizeTagsViewStoredPath,
  saveTagsViewStateToStorage,
} from './tagsView.utils';
/**
 * 标准化 tagsView store 内使用的路径，保持 `/` 与 `/dashboard` 在 reducer 层语义一致。
 * @param {*} path 待规整路径。
 * @returns {string} 规整后的路径。
 */
const normalizeHomePath = (path) => {
  return normalizeTagsViewStoredPath(path);
};

export default {
  namespace: 'tagsView',

  state: loadTagsViewStateFromStorage(),

  effects: {
    // 添加视图
    *addView({ payload }, { put }) {
      yield put({ type: 'addVisitedView', payload });
      yield put({ type: 'addCachedView', payload });
    },

    // 删除视图
    *delView({ payload }, { put, select }) {
      yield put({ type: 'delVisitedView', payload });
      yield put({ type: 'delCachedView', payload });
      const { visitedViews, cachedViews } = yield select((state) => state.tagsView);
      return { visitedViews, cachedViews };
    },

    // 删除其他视图
    *delOthersViews({ payload }, { put, select }) {
      yield put({ type: 'delOthersVisitedViews', payload });
      yield put({ type: 'delOthersCachedViews', payload });
      const { visitedViews, cachedViews } = yield select((state) => state.tagsView);
      return { visitedViews, cachedViews };
    },

    // 删除所有视图
    *delAllViews(_, { put, select }) {
      yield put({ type: 'delAllVisitedViews' });
      yield put({ type: 'delAllCachedViews' });
      const { visitedViews, cachedViews } = yield select((state) => state.tagsView);
      return { visitedViews, cachedViews };
    },
  },

  reducers: {
    // 清空所有标签（包括 localStorage）
    clearAllTags() {
      clearTagsViewStateFromStorage();
      return {
        visitedViews: [],
        cachedViews: [],
      };
    },

    // 添加访问过的视图
    addVisitedView(state, { payload: view }) {
      // 标准化路径
      const normalizedPath = normalizeHomePath(view.path);

      // 检查是否已存在（使用标准化后的路径）
      if (ensureArray(state.visitedViews).some((v) => normalizeHomePath(v.path) === normalizedPath)) {
        return state;
      }

      // 优先使用传入的 title，其次 meta.title，再次 name
      const newView = {
        ...view,
        path: normalizedPath, // 使用标准化后的路径
        title: view.title || view.meta?.title || view.name || 'no-name',
      };

      let visitedViews = [...state.visitedViews, newView];

      // 标签页数量限制：最多保留15个
      const MAX_TAGS = 15;
      if (visitedViews.length > MAX_TAGS) {
        // 计算需要删除的数量
        const deleteCount = visitedViews.length - MAX_TAGS;

        // 找出所有非固定标签
        const nonAffixTags = ensureArray(visitedViews).filter((v) => !v.meta?.affix);

        // 如果非固定标签数量足够删除
        if (nonAffixTags.length >= deleteCount) {
          // 删除最早的非固定标签
          const tagsToDelete = nonAffixTags.slice(0, deleteCount);
          const deletePathsSet = new Set(ensureArray(tagsToDelete).map((v) => normalizeHomePath(v.path)));

          visitedViews = ensureArray(visitedViews).filter((v) => !deletePathsSet.has(normalizeHomePath(v.path)));
        }
      }

      const newState = {
        ...state,
        visitedViews,
      };

      // 保存到 localStorage
      saveTagsViewStateToStorage(newState);

      return newState;
    },

    // 添加缓存视图
    addCachedView(state, { payload: view }) {
      const cacheName = ensureString(view?.name, '');
      if (!cacheName || state.cachedViews.includes(cacheName)) {
        return state;
      }

      if (!view.meta?.noCache) {
        const newState = {
          ...state,
          cachedViews: [...state.cachedViews, cacheName],
        };
        // cachedViews 同样需要落盘，否则刷新后 visitedViews 与 cachedViews 会出现状态漂移。
        saveTagsViewStateToStorage(newState);
        return newState;
      }

      return state;
    },

    // 删除访问过的视图
    delVisitedView(state, { payload: view }) {
      const newState = {
        ...state,
        visitedViews: buildVisitedViewsAfterDelete({
          visitedViews: state.visitedViews,
          view,
        }),
      };
      saveTagsViewStateToStorage(newState);
      return newState;
    },

    // 删除缓存视图
    delCachedView(state, { payload: view }) {
      const newState = {
        ...state,
        cachedViews: ensureArray(state.cachedViews).filter((name) => name !== view.name),
      };
      saveTagsViewStateToStorage(newState);
      return newState;
    },

    // 删除其他访问过的视图
    delOthersVisitedViews(state, { payload: view }) {
      const targetPath = normalizeHomePath(view.path);
      const newState = {
        ...state,
        visitedViews: ensureArray(state.visitedViews).filter((v) => {
          return v.meta?.affix || normalizeHomePath(v.path) === targetPath;
        }),
      };
      saveTagsViewStateToStorage(newState);
      return newState;
    },

    // 删除其他缓存视图
    delOthersCachedViews(state, { payload: view }) {
      const index = state.cachedViews.indexOf(view.name);
      let newState;
      if (index > -1) {
        newState = {
          ...state,
          cachedViews: state.cachedViews.slice(index, index + 1),
        };
      } else {
        newState = {
          ...state,
          cachedViews: [],
        };
      }
      saveTagsViewStateToStorage(newState);
      return newState;
    },

    // 删除所有访问过的视图
    delAllVisitedViews(state) {
      const affixTags = ensureArray(state.visitedViews).filter((tag) => tag.meta?.affix);
      const newState = {
        ...state,
        visitedViews: affixTags,
      };
      saveTagsViewStateToStorage(newState);
      return newState;
    },

    // 删除所有缓存视图
    delAllCachedViews(state) {
      const newState = {
        ...state,
        cachedViews: [],
      };
      saveTagsViewStateToStorage(newState);
      return newState;
    },

    // 更新访问过的视图
    updateVisitedView(state, { payload: view }) {
      const targetPath = normalizeHomePath(view.path);
      const newState = {
        ...state,
        visitedViews: ensureArray(state.visitedViews).map((v) => {
          if (normalizeHomePath(v.path) === targetPath) {
            return { ...v, ...view, path: targetPath };
          }
          return v;
        }),
      };
      saveTagsViewStateToStorage(newState);
      return newState;
    },

    // 批量更新访问过的视图（性能优化：避免多次 dispatch）
    batchUpdateViews(state, { payload: views }) {
      if (!Array.isArray(views) || views.length === 0) {
        return state;
      }

      // 创建路径到更新视图的映射
      const updateMap = new Map();
      ensureArray(views).forEach((view) => {
        const normalizedPath = normalizeHomePath(view.path);
        updateMap.set(normalizedPath, view);
      });

      const newState = {
        ...state,
        visitedViews: ensureArray(state.visitedViews).map((v) => {
          const normalizedPath = normalizeHomePath(v.path);
          const updateView = updateMap.get(normalizedPath);
          if (updateView) {
            return { ...v, ...updateView, path: normalizedPath };
          }
          return v;
        }),
      };
      saveTagsViewStateToStorage(newState);
      return newState;
    },
  },
};
