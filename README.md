# RCT
Red Community Token


### Setting up the testing environment on Ubuntu

```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm i -D ethereumjs-testrpc
sudo npm install -g truffle
git clone git@github.com:dockimbel/RCT.git

cd RCT/
npx testrpc

# In another session:
cd RCT/
truffle test

```







