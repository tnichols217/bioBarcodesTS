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
          packages = rec {
            filtered = pkgs.callPackage ./filter.pkg.nix { file = app; };
            docker = pkgs.callPackage ./docker.pkg.nix { app = filtered; name = app.packageName; };
          };
        });
    in
    nixpkgs.lib.recursiveUpdate dream2nixOut customOut;
}