/**
 * 模块职责：维护访问标签与允许缓存的页面名，并向非敏感本地存储发布快照。
 * 同一路径只保留一个标签，固定项受保护；普通访问最多保留 15 个标签，固定项不能被名额淘汰。
 * 页面实例由 RouteKeepAliveOutlet 管理，effects 只按顺序组合 reducer 并返回更新后快照。
 */
// 模型只接受稳定数组和字符串身份，异常菜单字段先由接入层解码。
/**
 * `ensureArray`：为列表渲染取得数组引用，不把字符串、对象或空值包装成一项列表。
 * `ensureString`：把可确定的标量转成展示文本，避免对象意外渲染为 [object Object]。
 */
import { ensureArray, ensureString } from '@/utils/robust';
// 路径、固定项保护与 best-effort 持久化在共享 helper 中统一，不能把保存失败当业务事务。
/**
 * `buildVisitedViewsAfterDelete`：计算删除标签后的已访问标签列表，并在 store 层保护 affix 固定标签不被误删。
 * `clearTagsViewStateFromStorage`：清理 localStorage 中的 tagsView 状态。
 * `loadTagsViewStateFromStorage`：从 localStorage 读取 tagsView 状态，并把缓存结构规整为稳定数组。
 * `normalizeTagsViewStoredPath`：标准化 tagsView store 中保存的路径，把根路径折叠到首页并移除末尾斜杠。
 * `saveTagsViewStateToStorage`：把当前 tagsView 状态写回 localStorage。
 */
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

  // 模块启动时恢复可用偏好；存储不可用时从空状态启动，页面入口随后按菜单重新建立。
  state: loadTagsViewStateFromStorage(),

  effects: {
    /**
     * 顺序发布访问标签和缓存名，让 UI 与缓存出口消费同一轮模型更新。
     * @param {Object} action payload 为当前路由投影；不读取接口或自动授予访问权限。
     * @param {Object} effects put 为 Dva 发布器。
     * @returns {Generator} 更新两个列表的 effect。
     */
    *addView(
      { /* `payload`：当前路由投影的 {path,name,title,meta,fullPath}，顺序交给访问和缓存 reducer。 */ payload },
      { /* `put`：Dva 当前 effect 的 action 发布器，yield 保证各配套 reducer 按顺序完成。 */ put }
    ) {
      yield put({ type: 'addVisitedView', payload });
      yield put({ type: 'addCachedView', payload });
    },

    /**
     * 依次删除访问标签与缓存名，再返回最新快照供 UI 选择回退路径。
     * @param {Object} action payload 为要关闭的标签。
     * @param {Object} effects put/select 由 Dva 提供。
     * @returns {Generator} 最终返回 visitedViews/cachedViews；固定项保护在 reducer/helper 执行。
     */
    *delView(
      { /* `payload`：要关闭的明确标签投影，至少含 path/name；更新完成后返回最新快照。 */ payload },
      {
        /* `put`：Dva 当前 effect 的 action 发布器，yield 保证各配套 reducer 按顺序完成。 */ put,
        /* `select`：Dva 当前 effect 的状态读取器，在两次 put 后取最新 tagsView，不读闭包旧值。 */ select,
      }
    ) {
      yield put({ type: 'delVisitedView', payload });
      yield put({ type: 'delCachedView', payload });
      // `visitedViews`：删除访问标签和缓存名两个 reducer 完成后读取的最新访问列表，返回给 UI 选择回退目标。
      // `cachedViews`：删除指定页面缓存资格后的最新名称列表，实际页面释放由缓存出口负责。
      const { visitedViews, cachedViews } = yield select(
        (/* `state`：select 提供的全局根状态，只取更新后的 tagsView 片段。 */ state) => state.tagsView
      );
      return { visitedViews, cachedViews };
    },

    /**
     * 保留指定标签与固定访问项，并同步收敛缓存名。
     * @param {Object} action payload 为要保留的标签。
     * @param {Object} effects put/select 读取更新后的模型快照。
     * @returns {Generator} 两类状态更新完成后返回当前快照。
     */
    *delOthersViews(
      { /* `payload`：关闭其它项时需要保留的目标标签，访问身份按 path、缓存身份按 name。 */ payload },
      {
        /* `put`：Dva 当前 effect 的 action 发布器，yield 保证各配套 reducer 按顺序完成。 */ put,
        /* `select`：Dva 当前 effect 的状态读取器，在两次 put 后取最新 tagsView，不读闭包旧值。 */ select,
      }
    ) {
      yield put({ type: 'delOthersVisitedViews', payload });
      yield put({ type: 'delOthersCachedViews', payload });
      // `visitedViews`：关闭其它项后保留目标与固定项的最新访问列表。
      // `cachedViews`：关闭其它缓存后仅保留目标资格的最新列表，不直接销毁 React 实例。
      const { visitedViews, cachedViews } = yield select(
        (/* `state`：关闭其它项完成后的全局根快照，只投影 tagsView。 */ state) => state.tagsView
      );
      return { visitedViews, cachedViews };
    },

    /**
     * 关闭可关闭的访问标签并清空缓存名，返回更新结果用于选择首页恢复。
     * @param {*} _ 未使用的 action。
     * @param {Object} effects Dva put/select。
     * @returns {Generator} 不执行接口或销毁组件，缓存出口随后消费模型变化。
     */
    *delAllViews(
      _,
      {
        /* `put`：Dva 当前 effect 的 action 发布器，yield 保证各配套 reducer 按顺序完成。 */ put,
        /* `select`：Dva 当前 effect 的状态读取器，在两次 put 后取最新 tagsView，不读闭包旧值。 */ select,
      }
    ) {
      yield put({ type: 'delAllVisitedViews' });
      yield put({ type: 'delAllCachedViews' });
      // `visitedViews`：关闭全部普通项后的最新访问列表，固定项仍保留供恢复导航。
      // `cachedViews`：全部缓存资格被撤销后的最新列表，通常为空数组。
      const { visitedViews, cachedViews } = yield select(
        (/* `state`：关闭全部普通项后的全局根快照，不在选择器中产生副作用。 */ state) => state.tagsView
      );
      return { visitedViews, cachedViews };
    },
  },

  reducers: {
    /**
     * 显式撤销全部标签偏好与内存列表，适合会话接入层清理客户端导航。
     * @returns {Object} 全新空列表；不能替代服务端退出或凭证撤销。
     */
    clearAllTags() {
      clearTagsViewStateFromStorage();
      return {
        visitedViews: [],
        cachedViews: [],
      };
    },

    /**
     * 按规整路径去重并追加访问记录，必要时淘汰最早的非固定标签后保存快照。
     * @param {Object} state 当前标签模型。
     * @param {Object} action payload 为路由投影，title 优先于 meta.title/name。
     * @returns {Object} 新快照或原去重快照，不改变原 visitedViews 数组。
     */
    addVisitedView(
      state,
      { payload: /* `view`：action.payload 的本地别名，当前已访问路由投影；不应包含凭证或敏感查询。 */ view }
    ) {
      // 标准化路径
      // `normalizedPath`：当前访问目标的统一路径身份，根路径按首页处理，忽略尾斜杠差异。
      const normalizedPath = normalizeHomePath(view.path);

      // 检查是否已存在（使用标准化后的路径）
      if (
        ensureArray(state.visitedViews).some(
          (/* `v`：已有访问标签候选，规整路径后判断当前入口是否已经存在。 */ v) =>
            normalizeHomePath(v.path) === normalizedPath
        )
      ) {
        return state;
      }

      // 优先使用传入的 title，其次 meta.title，再次 name
      // `newView`：当前路由投影的新副本，固定标准 path 和优先级 title，不改原 action payload。
      const newView = {
        ...view,
        path: normalizedPath, // 使用标准化后的路径
        title: view.title || view.meta?.title || view.name || 'no-name',
      };

      // `visitedViews`：追加新标签后的候选访问数组；超限时只淘汰最早的可删除项。
      let visitedViews = [...state.visitedViews, newView];

      // 标签页数量限制：最多保留15个
      // 仅在可删除的非固定标签足够时淘汰最早项；固定项多于上限时优先保留恢复入口。
      // `MAX_TAGS`：访问标签的目标数量上限 15；固定项过多时优先保留，不能为限额删除恢复入口。
      const MAX_TAGS = 15;
      if (visitedViews.length > MAX_TAGS) {
        // 计算需要删除的数量
        // `deleteCount`：候选访问数超过 15 的差额，用于选出需淘汰的最早非固定标签数量。
        const deleteCount = visitedViews.length - MAX_TAGS;

        // 找出所有非固定标签
        // `nonAffixTags`：按原访问顺序筛出的可删除标签，不含 meta.affix 项。
        const nonAffixTags = ensureArray(visitedViews).filter(
          (/* `v`：限额筛选的访问项，只选择非 affix 项参与淘汰。 */ v) => !v.meta?.affix
        );

        // 如果非固定标签数量足够删除
        if (nonAffixTags.length >= deleteCount) {
          // 删除最早的非固定标签
          // `tagsToDelete`：需要淘汰的最早非固定项数组，仅在可删除数量足够时生成。
          const tagsToDelete = nonAffixTags.slice(0, deleteCount);
          // `deletePathsSet`：待淘汰项的标准路径集合，过滤时避免逐项再次扫描删除列表。
          const deletePathsSet = new Set(
            ensureArray(tagsToDelete).map((/* `v`：待淘汰标签，提取其标准路径建立删除集合。 */ v) =>
              normalizeHomePath(v.path)
            )
          );

          visitedViews = ensureArray(visitedViews).filter(
            (/* `v`：候选访问项，只有不在淘汰集合时才保留。 */ v) => !deletePathsSet.has(normalizeHomePath(v.path))
          );
        }
      }

      // `newState`：完成追加与限额淘汰的新模型快照；保存失败仍返回该内存状态。
      const newState = {
        ...state,
        visitedViews,
      };

      // 保存到 localStorage
      saveTagsViewStateToStorage(newState);

      return newState;
    },

    /**
     * 为允许缓存的页面追加唯一 name，meta.noCache 明确拒绝缓存。
     * @param {Object} state 当前模型。
     * @param {Object} action payload.name 必须是稳定的缓存身份。
     * @returns {Object} 不重复添加空名或已有名，成功更新时同步保存偏好。
     */
    addCachedView(
      state,
      { payload: /* `view`：action.payload 的本地别名，name 为稳定路径缓存身份，meta.noCache 可拒绝缓存。 */ view }
    ) {
      // `cacheName`：当前页面明确提供的缓存身份，空名/重复名不追加，meta.noCache 仍优先。
      const cacheName = ensureString(view?.name, '');
      if (!cacheName || state.cachedViews.includes(cacheName)) {
        return state;
      }

      if (!view.meta?.noCache) {
        // `newState`：追加单个缓存名后的新模型快照，与访问列表共用非敏感存储。
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

    /**
     * 删除允许关闭的访问标签，固定项由共享 helper 保留。
     * @param {Object} state 当前模型。
     * @param {Object} action payload 为要移除的标签。
     * @returns {Object} 保存后的内存快照，持久化失败不使页面丢失导航能力。
     */
    delVisitedView(
      state,
      { payload: /* `view`：要删除的 action.payload 标签，固定项保护由共享 helper 实施。 */ view }
    ) {
      // `newState`：共享 helper 删除普通访问标签后的模型副本，固定项仍保留。
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

    /**
     * 从缓存名列表撤销指定页面，实际实例释放由缓存出口执行。
     * @param {Object} state 当前模型。
     * @param {Object} action payload.name 为缓存身份。
     * @returns {Object} 不含目标名的新快照。
     */
    delCachedView(state, { payload: /* `view`：要撤销缓存资格的 action.payload，按 name 严格过滤。 */ view }) {
      // `newState`：撤销目标缓存名后的模型副本，不在 reducer 内执行页面卸载。
      const newState = {
        ...state,
        cachedViews: ensureArray(state.cachedViews).filter(
          (/* `name`：当前缓存名，与关闭目标 view.name 严格比较，不按标题模糊删除。 */ name) => name !== view.name
        ),
      };
      saveTagsViewStateToStorage(newState);
      return newState;
    },

    /**
     * 只保留目标路径和 meta.affix 访问标签，不按标题去重。
     * @param {Object} state 当前模型。
     * @param {Object} action payload.path 为要保留的路径。
     * @returns {Object} 新的访问列表与原其他状态。
     */
    delOthersVisitedViews(
      state,
      { payload: /* `view`：关闭其它访问项时的目标标签 payload，按标准 path 定位。 */ view }
    ) {
      // `targetPath`：关闭其它访问项时必须保留的标准目标路径，另外始终保留固定项。
      const targetPath = normalizeHomePath(view.path);
      // `newState`：仅保留目标与固定访问项的新快照，不修改缓存名列表。
      const newState = {
        ...state,
        visitedViews: ensureArray(state.visitedViews).filter(
          (/* `v`：当前访问标签，固定项或路径等于目标时保留。 */ v) => {
            return v.meta?.affix || normalizeHomePath(v.path) === targetPath;
          }
        ),
      };
      saveTagsViewStateToStorage(newState);
      return newState;
    },

    /**
     * 只保留目标 name 对应的缓存资格；目标不在列表时清空缓存名。
     * @param {Object} state 当前模型。
     * @param {Object} action payload.name 为缓存身份。
     * @returns {Object} 新快照，固定访问标签仍由另一 reducer 保持。
     */
    delOthersCachedViews(state, { payload: /* `view`：关闭其它缓存时的目标 payload，按 name 保留唯一项。 */ view }) {
      // `index`：目标缓存名在当前列表的位置，-1 表示不存在，不能误保留末项。
      const index = state.cachedViews.indexOf(view.name);
      // `newState`：仅保留目标缓存名或空列表的模型副本；访问项由配套 reducer 维护。
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

    /**
     * 保留固定访问标签并移除所有普通访问项。
     * @param {Object} state 当前模型。
     * @returns {Object} 同步保存后的快照，不清空其他状态字段。
     */
    delAllVisitedViews(state) {
      // `affixTags`：原访问顺序中的全部固定项，关闭全部普通项时保留它们。
      const affixTags = ensureArray(state.visitedViews).filter(
        (/* `tag`：当前访问候选，只有 meta.affix 为真才在“关闭全部”后保留。 */ tag) => tag.meta?.affix
      );
      // `newState`：访问列表只剩固定项的新模型副本，其它字段保持原值。
      const newState = {
        ...state,
        visitedViews: affixTags,
      };
      saveTagsViewStateToStorage(newState);
      return newState;
    },

    /**
     * 撤销全部页面缓存资格，访问列表仍由配套 action 单独维护。
     * @param {Object} state 当前模型。
     * @returns {Object} cachedViews 为新空数组的快照。
     */
    delAllCachedViews(state) {
      // `newState`：cachedViews 替换为全新空数组的模型副本，不直接更改 visitedViews。
      const newState = {
        ...state,
        cachedViews: [],
      };
      saveTagsViewStateToStorage(newState);
      return newState;
    },

    /**
     * 按规整路径合并一个标签的最新元数据，不改变未匹配项。
     * @param {Object} state 当前模型。
     * @param {Object} action payload 为当前路由投影，身份仍按 path 匹配。
     * @returns {Object} 保存后的快照。
     */
    updateVisitedView(
      state,
      { payload: /* `view`：单项更新 payload，path 确定身份，其余字段覆盖已访问目标。 */ view }
    ) {
      // `targetPath`：单项元数据更新的标准目标路径，不按标题或数组位置定位。
      const targetPath = normalizeHomePath(view.path);
      // `newState`：将目标最新元数据合并进已访问项的新模型，不新增未知项。
      const newState = {
        ...state,
        visitedViews: ensureArray(state.visitedViews).map(
          (/* `v`：单项更新遍历的已有标签，匹配时浅合并新投影，其余沿用原引用。 */ v) => {
            if (normalizeHomePath(v.path) === targetPath) {
              return { ...v, ...view, path: targetPath };
            }
            return v;
          }
        ),
      };
      saveTagsViewStateToStorage(newState);
      return newState;
    },

    /**
     * 按路径映射一次更新多份标签元数据，避免为每个标题重复发布状态。
     * @param {Object} state 当前模型。
     * @param {Object} action payload 为投影数组；空数组不产生更新。
     * @returns {Object} 原状态或合并后的新快照，不自动新增未知标签。
     */
    batchUpdateViews(state, { payload: /* `views`：action.payload 的批量数组别名，空/非数组不发布新状态。 */ views }) {
      if (!Array.isArray(views) || views.length === 0) {
        return state;
      }

      // 创建路径到更新视图的映射
      // `updateMap`：本次批量更新按标准路径建立的 Map，同路径后一个 payload 覆盖前一个。
      const updateMap = new Map();
      ensureArray(views).forEach((/* `view`：批量更新数组当前投影，按标准路径加入 Map，不立即创建访问项。 */ view) => {
        // `normalizedPath`：批量 payload 当前项的统一路径身份，作为更新 Map 的键。
        const normalizedPath = normalizeHomePath(view.path);
        updateMap.set(normalizedPath, view);
      });

      // `newState`：按更新 Map 合并已有访问项后的新快照，不自动追加未访问页面。
      const newState = {
        ...state,
        visitedViews: ensureArray(state.visitedViews).map(
          (/* `v`：批量更新遍历的已有标签，从 updateMap 按标准路径取新投影。 */ v) => {
            // `normalizedPath`：当前已访问项的标准路径，用于读取对应的批量更新候选。
            const normalizedPath = normalizeHomePath(v.path);
            // `updateView`：当前路径命中的新元数据，缺失时沿用旧项引用，不清空其它页面。
            const updateView = updateMap.get(normalizedPath);
            if (updateView) {
              return { ...v, ...updateView, path: normalizedPath };
            }
            return v;
          }
        ),
      };
      saveTagsViewStateToStorage(newState);
      return newState;
    },
  },
};

// ───── 模块结束：src/models/tagsView.js ─────
