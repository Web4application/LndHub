/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
git branch -m master main
git fetch origin
git branch -u origin/main main
git remote set-head origin -a
$ brew edit wget # opens in $EDITOR!
 cd /opt/homebrew
$ find Cellar
Cellar/wget/1.16.1
Cellar/wget/1.16.1/bin/wget
Cellar/wget/1.16.1/share/man/man1/wget.1
$ brew install wget
$ ls -l bin
bin/wget -> ../Cellar/wget/1.16.1/bin/wget
$ brew create https://foo.com/foo-1.0.tgz
Created /opt/homebrew/Library/Taps/homebrew/homebrew-core/Formula/foo.rb
$ brew install --cask firefox
$ brew create --cask https://foo.com/foo-1.0.dmg
Editing /opt/homebrew/Library/Taps/homebrew/homebrew-cask/Casks/foo.rb
