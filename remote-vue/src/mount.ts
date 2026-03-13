import { createApp } from "vue";
import App from "./App.vue";

/** "shellDiv" is the div the shell created. */
export function mount(shellDiv: HTMLElement): void {
  const app = createApp(App);
  app.mount(shellDiv); // render Vue app inside the shell's div
  (shellDiv as unknown as { __vue_app__?: ReturnType<typeof createApp> }).__vue_app__ = app;
}

/** called by the shell when the user leaves the page — tear down the Vue app. */
export function unmount(shellDiv: HTMLElement): void {
  const app = (shellDiv as unknown as { __vue_app__?: ReturnType<typeof createApp> }).__vue_app__;
  if (app) {
    app.unmount();
    delete (shellDiv as unknown as { __vue_app__?: ReturnType<typeof createApp> }).__vue_app__;
  }
}

// The shell loads this module via Module Federation and uses mount/unmount.
export default { mount, unmount };
