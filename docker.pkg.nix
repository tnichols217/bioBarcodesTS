{ pkgs, nativeBuildInputs }:

pkgs.stdenv.mkDerivation rec {
  pname = "biobarcodes";
  version = "v1.0.0";

  src = ./.;

  nativeBuildInputs = nativeBuildInputs;

  buildPhase =
  ''

  npm i
  npm run build

  '';

  installPhase = 
  ''

  mkdir $out

  cp -r out/bundle/* $out

  '';

  meta = {
    description = "Docker container builder for biobarcodes";
    homepage = "https://github.com/tnichols217/bioBarcodesTS";
    license = pkgs.lib.licenses.gpl3;
    platforms = pkgs.lib.platforms.all;
  };
}