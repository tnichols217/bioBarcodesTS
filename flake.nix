{
  description = "Dev shell";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    gitignore = {
      url = "github:hercules-ci/gitignore.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    dream2nix.url = "github:nix-community/dream2nix";
  };

  outputs = { self, nixpkgs, flake-utils, dream2nix, gitignore }:
    let
      dream2nixOut = 
        dream2nix.lib.makeFlakeOutputs {
          systems = flake-utils.lib.defaultSystems;
          config.projectRoot = ./.;
          source = gitignore.lib.gitignoreSource ./.;
        };
      customOut = flake-utils.lib.eachDefaultSystem (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          app = dream2nixOut.packages."${system}".default;
        in with pkgs; {
          packages.filtered = pkgs.callPackage ./filter.pkg.nix { file = app; };
          packages.docker = dockerTools.buildImage {
            name = app.packageName;
            copyToRoot = pkgs.buildEnv {
              name = app.packageName;
              paths = [ app ];
              pathsToLink = [ "/bin" "/lib" ];
            };
            # This ensures symlinks to directories are preserved in the image
            keepContentsDirlinks = true;
            config = { Cmd = [ "/bin/ts-node-nix" ]; };
          };
        });
    in
    nixpkgs.lib.recursiveUpdate dream2nixOut customOut;
}