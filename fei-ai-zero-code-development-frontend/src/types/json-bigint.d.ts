declare module 'json-bigint' {
  interface JSONBigOptions {
    storeAsString?: boolean
    strict?: boolean
  }

  interface JSONBig {
    parse(text: string): unknown
    stringify(value: unknown): string
  }

  function JSONBig(options?: JSONBigOptions): JSONBig
  export default JSONBig
}
