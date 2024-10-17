import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { fileURLToPath } from 'url';
import path from 'path';
import css from 'rollup-plugin-css-only';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  input: 'src/main.ts',
  output: {
    dir: '.',
    sourcemap: 'inline',
    format: 'cjs',
    exports: 'default'
  },
  external: ['obsidian'],
  plugins: [
    typescript({ tslib: path.resolve(__dirname, 'node_modules/tslib/tslib.es6.js') }),
    nodeResolve({ browser: true }),
    commonjs(),
    css({ output: 'styles.css' }),
  ]
};
