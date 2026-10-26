declare module 'kuromoji/src/loader/BrowserDictionaryLoader.js' {
  interface BrowserDictionaryLoader {
    loadArrayBuffer(
      url: string,
      callback: (err: unknown, buffer: ArrayBuffer | null) => void,
    ): void;
  }
  const BrowserDictionaryLoader: { prototype: BrowserDictionaryLoader };
  export default BrowserDictionaryLoader;
}
