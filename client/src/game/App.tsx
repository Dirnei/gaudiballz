import { RULES_VERSION } from '../engine';
import { DEFAULT_SKIN } from '../skins';

export function App() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-2 bg-slate-900 text-slate-100">
      <h1 className="text-2xl font-semibold">Sort Puzzle</h1>
      <p className="text-sm text-slate-400">
        Scaffolding only. Rules engine v{RULES_VERSION}, skin “{DEFAULT_SKIN}”.
      </p>
    </main>
  );
}
