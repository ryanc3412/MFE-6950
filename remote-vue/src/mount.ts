import { createApp } from "vue";
import App from "./App.vue";

export function mount(el: HTMLElement): void {
  const app = createApp(App);
  app.mount(el);
  (el as unknown as { __vue_app__?: ReturnType<typeof createApp> }).__vue_app__ = app;
}

export function unmount(el: HTMLElement): void {
  const app = (el as unknown as { __vue_app__?: ReturnType<typeof createApp> }).__vue_app__;
  if (app) {
    app.unmount();
    delete (el as unknown as { __vue_app__?: ReturnType<typeof createApp> }).__vue_app__;
  }
}

export default { mount, unmount };
