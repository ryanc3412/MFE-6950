import { importShared } from './__federation_fn_import-j7vW71jS.js';

const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};

const _sfc_main = {  };
const {createElementVNode:_createElementVNode,openBlock:_openBlock,createElementBlock:_createElementBlock} = await importShared('vue');


const _hoisted_1 = {
  class: "hello",
  style: {"padding":"1rem","text-align":"center","color":"#213547"}
};

function _sfc_render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [...(_cache[0] || (_cache[0] = [
    _createElementVNode("h1", { style: {"font-size":"1.75rem","margin":"0 0 0.5rem"} }, "Hello World", -1),
    _createElementVNode("p", { style: {"color":"#646464","margin":"0"} }, "Vue 3 remote loaded via Module Federation.", -1)
  ]))]))
}
const App = /*#__PURE__*/_export_sfc(_sfc_main, [['render',_sfc_render],['__scopeId',"data-v-3ed3aeaf"]]);

export { App as A };
