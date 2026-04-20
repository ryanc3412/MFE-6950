import "../styles/globals.css";
import ShellLayout from "../components/ShellLayout";

export default function App({
  Component,
  pageProps,
}: {
  Component: React.ComponentType<any>;
  pageProps: any;
}) {
  return (
    <ShellLayout>
      <Component {...pageProps} />
    </ShellLayout>
  );
}
