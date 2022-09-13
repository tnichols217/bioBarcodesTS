# Barcode generator and tracker

## Commandline arguments
Usage: `node main.js PATH-TO-INVENTORY-CSV PATH-TO-HISTORY-CSV OUTPUT-PATH`

## Development
### Using Nix
1. Initialize the OS dependencies from flake.nix (and flake.lock) and optionally enable the direnv from .envrc
2. Initialize the node dependencies with `npm i`

### Without Nix
1. Ensure node, npm, yarn, and nodemon are installed and on $PATH
2. Init the node deps with `npm i`

Current locked node version is `v18.7.0`, npm is `8.15.0`, yarn is `1.22.19`, and nodemon is `2.0.19`

### Package scripts
1. scripts prefixed with mon- or postfixed with -watch will automatically rerun when typescript files are changed
2. scripts prefixed with build- will build the entire project, including bundling and transpilation if necessary
3. scripts postfixed with -dev will run the development build instead of production

The default production build (build) transpiles, and bundles the output
The default dev script (dev) runs the mon script, just runs the typescript files without transpilation or bundling

The current bundle size is 1.9mb

## TODO
1. store latest trsx number
2. create frontend and database to store locations of items
3. store the UUID dictionary on disk instead of in memory