// root next.js app shell: sidebar layout + shared csv state for every route
import "../styles/globals.css";
import ShellLayout from "../components/ShellLayout";
import { CsvDataProvider } from "../context/CsvDataContext";

export default function App({
  Component,
  pageProps,
}: {
  Component: React.ComponentType<any>;
  pageProps: any;
}) {
  return (
    <ShellLayout>
      {/* holds parsed csv in memory (+ localstorage) so upload + table pages see the same data */}
      <CsvDataProvider>
        <Component {...pageProps} />
      </CsvDataProvider>
    </ShellLayout>
  );
}
