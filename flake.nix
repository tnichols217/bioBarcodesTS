{
  description = "Dev shell";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
      node2nixOutput = import ./nix { inherit pkgs system; nodejs = pkgs.nodejs; };
      nodeDeps = node2nixOutput.nodeDependencies;
      nativeBuildInputs = with pkgs; [
          nodejs
          yarn
          nodePackages.npm
          nodePackages.nodemon
          node2nix
        ];
    in rec {
      devShell = pkgs.mkShell {
        nativeBuildInputs = nativeBuildInputs;
        buildInputs =  [ ];
      };
        
      packages = rec {
        docker = pkgs.callPackage ./docker.pkg.nix { inherit nativeBuildInputs nodeDeps; };
        default = docker;
      };
    });
}