// pdf-parse's root index.js runs a debug self-test when it's the entry module,
// so we import lib/pdf-parse.js directly; @types/pdf-parse doesn't cover that subpath.
declare module 'pdf-parse/lib/pdf-parse.js' {
  import pdfParse from 'pdf-parse';
  export default pdfParse;
}
