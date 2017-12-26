# RCT

Red Community Token

## Setup

### Prerequisites on Ubuntu

```bash
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm -g i yarn
```

### Prerequisites macOS

```bash
brew tap ethereum/ethereum
brew install node yarn solidity
```

### Common setup

```bash
git clone git@github.com:dockimbel/RCT.git
cd RCT/
yarn install
```

Compile with
```bash
yarn build
```

Run test suite continuously:
```bash
yarn test --watch
```
