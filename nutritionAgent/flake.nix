{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs =
    { self, nixpkgs }@inputs:
    let
      system = "x86_64-linux";
      pkgs = inputs.nixpkgs.legacyPackages.${system};
      myPython = (
        pkgs.python313.withPackages (
          p: with p; [
            matplotlib
            tkinter
            pyqt6
            pyserial
            numpy
          ]
        )
      );
      env =
        script:
        (pkgs.buildFHSEnv {
          name = "python-env";
          targetPkgs =
            pkgs:
            (with pkgs; [
              myPython
              # Support binary wheels from PyPI
              pythonManylinuxPackages.manylinux2014Package
              # Enable building from sdists
              cmake
              ninja
              libgcc
              binutils
              coreutils
              expat
              libz
              gcc
              glib
              zlib
              libGL
              fontconfig
              xorg.libX11
              libxkbcommon
              freetype
              dbus
              pre-commit

              #rocm stuff
              rocmPackages.clr
              rocmPackages.hsakmt
              rocmPackages.rocminfo
              rocmPackages.rocm-smi
              rocmPackages.rocminfo
              rocmPackages.rocm-runtime
              rocmPackages.rocm-device-libs
              rocmPackages.hipcc
            ]);
          multiPkgs =
            pkgs: with pkgs; [
              binutils
              coreutils
              expat
              libz
              gcc
              glib
              zlib
              libGL
              nodejs
              pandoc
            ];
          profile = ''
            export LIBRARY_PATH=/usr/lib:/usr/lib64:$LIBRARY_PATH
            export ROCM_PATH=${pkgs.rocmPackages.hipcc}/
            export PATH=$ROCM_PATH/bin:$PATH
            export LD_LIBRARY_PATH=$ROCM_PATH/lib:$LD_LIBRARY_PATH
          '';
          runScript = "${
            pkgs.writeShellScriptBin "runScript" (
              ''
                    set -e
                    test -d env || ${myPython.interpreter} -m venv env
                source env/bin/activate
                set +e
              ''
              + script
            )
          }/bin/runScript";
        }).env;
    in
    {
      devShells.${system}.default = env "${pkgs.zsh}/bin/zsh";
    };
}
