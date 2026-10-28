export abstract class SettingsRepository {
  abstract getAll(): Promise<Record<string, string>>;
  abstract set(entries: Record<string, string>): Promise<void>;
}
