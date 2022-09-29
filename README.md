# Barcode generator and tracker

## Commandline arguments
Usage: `node main.js path-to-env`

## Building
### Using Nix
Running `nix build` will run the default build script (`nix build .#docker`)
- The result will be symlinked to result in the root directory

#### Flake structure
##### Devshells
1. Node devshell (default)

##### Builds
1. barcode-generator
2. node (alias to barcode-generator)
3. filtered (node, but with sources removed and only the bundle remaining)
4. docker (filtered, but built into a docker image)
5. default (docker)

To start a build, run `nix build .#BUILDNAME`. When called without a buildname, default will be built

### Using CI
Github actions are defined in docker.yml, can run in any container type, but ubuntu was chosen because it was the most common
Structure:
1. Checkout
2. Get Nix
3. Run `nix build`
4. Upload artifacts

Upon push to `release`, or manual run in github actions, the docker image will be uploaded as an artifact

### Without Nix
1. `npm i` to initialize the node dependencies
2. `npm run build` to build the node project
3. The output will be bundled in `out/bundle`

## Development
### Using Nix
1. Initialize the OS dependencies from flake.nix (and flake.lock) and optionally enable the direnv from .envrc
2. Node dependencies will automatically be installed when running `nix develop`
    1. Alternatively, initialize the node dependencies with `npm i`

### Without Nix
1. Ensure node and npm are installed and on $PATH
2. Init the node deps with `npm i`

### Package scripts
1. scripts prefixed with mon- or postfixed with -watch will automatically rerun when typescript files are changed
2. scripts prefixed with build- will build the entire project, including bundling and transpilation if necessary
3. scripts postfixed with -dev will run the development build instead of production

The default production build (build) transpiles, and bundles the output
The default dev script (dev) runs the mon script, just runs the typescript files without transpilation or bundling

## .env setup
```env
OUTPUT_FOLDER = folder to save the generated pdfs
USE = "sheets" # can be sheets or csv
MODE = "oneshot" # can be oneshot or daemon

# if daemon
INTERVAL = "60000" # in milliseconds

# if using CSV
INVENTORY_CSV = location of the inventory csv
HISTORY_CSV = location of the history csv
LAST_TRSX = The last recorded transaction

# if using google sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL = service email
GOOGLE_PRIVATE_KEY = service private key
SPREADSHEET_ID = id of spreadsheet (can be found in the URL)
```

## Spreadsheet Layout
- Inventory
    1. ID
    2. Category
    3. Name
    4. Variation
    5. Description
    6. Quantity
- History
    1. Trsx ID
    2. Date
    3. ID
    4. Name
    5. Change In Quantity
    6. Reason / Notes
- UUIDs
    1. UUID
    2. ID
    3. Barcode
    4. Location
- Variables
    1. Key
    2. Value
- Locations
    1. Trsx ID
    2. Time
    3. UUID
    4. Location

## Docker
When built for docker, the runtime will look for an env file at `/env/.env`, this file must be mounted into the docker in order for it to run
To start the container,
1. Obtain the docker.tar.gz
2. Load the container with `docker load < docker.tar.gz` or with `docker load --input docker.tar.gz` and note the $IMAGEID
3. Run the container with
    ```sh
    docker run --mount type=bind,source=$ENVFILE,target=/env/.env --mount type=bind,source=$OUT_FOLDER,target=$INTERNAL_OUT_FOLDER $IMAGEID
    ```
    Where
    1. `$ENVFILE` is the environment file for the container
    2. `$OUT_FOLDER` is the folder for the outputs of the container (generated barcodes)
    3. `$INTERNAL_OUT_FOLDER` is the folder you specified for the output in the env file
    4. `$IMAGEID` is the id of the loaded docker image

- The docker container will look for the env file at `/env/.env`
- It does not contain any debugging tools *at all*, not even `/bin/sh`
    - If you really need to debug the container interactively, add `pkgs.dockerTools.binSh`
        - Other packages include: `pkgs.coreutils` and `pkgs.nano`
