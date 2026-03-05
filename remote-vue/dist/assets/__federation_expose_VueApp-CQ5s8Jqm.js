import { importShared } from './__federation_fn_import-j7vW71jS.js';
import { A as App } from './App-DvrhsHdm.js';

const {createApp} = await importShared('vue');
function mount(el) {
  const app = createApp(App);
  app.mount(el);
  el.__vue_app__ = app;
}
function unmount(el) {
  const app = el.__vue_app__;
  if (app) {
    app.unmount();
    delete el.__vue_app__;
  }
}
const mount_default = { mount, unmount };

export { mount_default as default, mount, unmount };
