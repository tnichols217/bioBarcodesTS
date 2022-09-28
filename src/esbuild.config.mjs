import esbuild from "esbuild";
import process from "process";
import fs from "fs-extra"

const banner =
`/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit https://github.com/tnichols217/bioBarcodesTS
*/
`;

const PROD = "production"
const WATCH = "watch"

const args = process.argv.slice(2)

const prod = args.includes(PROD)
const watch = args.includes(WATCH)

const outDir = "out/bundle"

esbuild.build({
	banner: {
		js: banner,
	},
	entryPoints: ['out/build/main.js'],
	bundle: true,
	format: 'cjs',
	watch: watch,
    minify: prod,
    platform: 'node',
	target: 'esnext',
	logLevel: "info",
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	outdir: outDir,
}).catch(() => process.exit(1));

fs.copy("Hack-Regular.ttf", outDir + "/Hack-Regular.ttf")
fs.copy("node_modules/pdfkit/js/data", outDir + "/data")