{ pkgs, app, name }:
pkgs.dockerTools.buildImage {
  inherit name;
  copyToRoot = pkgs.buildEnv {
    inherit name;
    paths = [ app pkgs.nodejs pkgs.dockerTools.binSh pkgs.nano ];
    pathsToLink = [ "/bin" ];
  };
  # This ensures symlinks to directories are preserved in the image
  keepContentsDirlinks = true;
  config = {
    Cmd = [ "node" "${app}/bin/${name}/main.js" "/env/.env" ];
    Volumes = { "/env" = {}; };
    WorkingDir = "${app}/bin/${name}";
  };
}