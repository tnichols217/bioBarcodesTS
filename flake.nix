{
  description = "Dev shell";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
      nativeBuildInputs = with pkgs; [
          nodejs
          yarn
          nodePackages.npm
          nodePackages.nodemon
        ];
    in rec {
      devShell = pkgs.mkShell {
        nativeBuildInputs = nativeBuildInputs;
        buildInputs = [ ];
      };
        
      packages = rec {
        docker = pkgs.callPackage ./docker.pkg.nix { inherit nativeBuildInputs; };
        default = docker;
      };
    });
}