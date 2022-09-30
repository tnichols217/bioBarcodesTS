nix build
ID=$(docker load < result \
| awk '{ print $NF}')
docker run --mount type=bind,source=$(pwd)/docker.env,target=/env/.env --mount type=bind,source=$(pwd)/out,target=/out $ID