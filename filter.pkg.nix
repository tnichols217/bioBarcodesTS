{ pkgs, file }:

pkgs.stdenv.mkDerivation rec {
  pname = "filter-node-project";
  version = "v1.0.0";

  src = file;

  installPhase = 
  ''

  mkdir -p $out/bin/${file.packageName}

  cp -r ./lib/node_modules/${file.packageName}/out/bundle/* $out/bin/${file.packageName}

  '';

  meta = {
    description = "Removed unneeded source files";
    homepage = "https://github.com/tnichols217/bioBarcodesTS";
    license = pkgs.lib.licenses.gpl3;
    platforms = pkgs.lib.platforms.all;
  };
}