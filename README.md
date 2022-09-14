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

## .env setup
```env
OUTPUT_FOLDER = folder to save the generated pdfs
USE = "sheets" # can be sheets or csv

# if using CSV
INVENTORY_CSV = location of the inventory csv
HISTORY_CSV = location of the history csv
LAST_TRSX = The last recorded transaction

# if using google sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL = service email
GOOGLE_PRIVATE_KEY = service private key
SPREADSHEET_ID = id of spreadsheet (can be found in the URL)
```

## TODO
1. create checkout interface