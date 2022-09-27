{ pkgs, nativeBuildInputs, nodeDeps }:

pkgs.stdenv.mkDerivation rec {
  inherit nativeBuildInputs;
  pname = "biobarcodes";
  version = "v1.0.0";

  src = ./.;

  buildPhase =
  ''

  runHook preBuild
  ln -sf ${nodeDeps}/lib/node_modules ./node_modules
  export PATH="${nodeDeps}/bin:$PATH"
  npm run build
  runHook postBuild

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