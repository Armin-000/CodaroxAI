import { AppProvider } from "./AppContext.jsx";
import { AppShell } from "./AppShell.jsx";
import { useAppController } from "./useAppController.js";

export default function App() {
  const controller = useAppController();
  return (
    <AppProvider value={controller}>
      <AppShell />
    </AppProvider>
  );
}
