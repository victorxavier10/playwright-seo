declare module 'simple-update-notifier' {
  export default function simpleUpdateNotifier(options: {
    pkg: { name: string; version: string };
  }): void;
}
