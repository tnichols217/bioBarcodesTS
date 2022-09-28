{ pkgs, app,  }:

dockerTools.buildImage {
  name = app.packageName;
  copyToRoot = pkgs.buildEnv {
    name = app.packageName;
    paths = [ app ];
    pathsToLink = [ "/bin" "/lib" ];
  };
  # This ensures symlinks to directories are preserved in the image
  keepContentsDirlinks = true;
  config = { Cmd = [ "/bin/ts-node-nix" ]; };
}