import type { AppState } from "@/lib/types";

export class UndoStack {
  private readonly snapshots: AppState[] = [];

  push(state: AppState) {
    this.snapshots.push(structuredClone(state));
    if (this.snapshots.length > 50) {
      this.snapshots.shift();
    }
  }

  pop(): AppState | null {
    const item = this.snapshots.pop();
    return item ?? null;
  }
}
